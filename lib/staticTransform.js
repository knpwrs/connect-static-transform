/*jshint node:true strict:false sub:true*/
// Dependencies
var parse = require('connect/lib/utils').parseUrl,
    fs = require('fs'),
    nPath = require('path');

// Export middleware factory
module.exports = createMiddleware;;

// Generate CSS Regex
var cssRegex = function (path) {
  return new RegExp((path || '') + '/(.+)\\.css');
};

/*
Options must contain the following keys:
  root: The root directory in which to open files
  match: A regular expression denoting which files to open
  transform: A function which takes three arguments.
    The first argument is the path to the file which was opened for transformation.
    The second argument is the text or buffer from the read file.
    The third argument is a callback function which accepts two arguments:
      The first argument is the transformed text / buffer. If this argument is set to `false` or `undefined` then the next connect middleware is invoked.
      The second argument (optional) is an object containing HTTP headers where keys (header names) map to values.
Optionally, the following keys may be specified:
  normalize: May be a string or a function.
    Example of string usage:
      match is set to /(.+)\.js/, normalize may be "$1.coffee".
      If the file "foo.js" is requested, then the file "foo.coffee" will be opened for transformation.
    Example of function usage:
      match is set to /.+\.js/, normalize may be function (name) { return name.substring(0, name.length - 2) + 'coffee' }
      If the file "foo.js" is requested, then the file "foo.coffee" will be opened for transformation.
  pathOnly: If true then the signature for the transformation function becomes `function (path, send) { }`, i.e., the file is not opened by `connect-static-transform`.
  cache: If true then the transformed text will be cached.
  maxage: Sets the maximum number of seconds a client should cache the output for. Defaults to one year.
  encoding: defaults to 'utf-8', may be set to "buffer" to indicate that the transformation function is expecting a buffer.
*/
function createMiddleware(options) {
  // Check for required options
  if (!(options.root || options.match || options.transform)) {
    throw new Error('options.{root,match,transform} must be defined');
  }

  // Set encoding if not set and set to undefined if set to 'buffer'
  var e = options.encoding;
  options.encoding = e ? (e === 'buffer' ? undefined : e) : 'utf-8';

  // Create cache object
  var cache = {};

  // Return middleware function
  return function (req, res, next) {
    // Check request method
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    // Check request path
    var path = parse(req).pathname;
    if (!options.match.test(path)) {
      return next();
    }
    // Normalize path if necessary
    if (options.normalize) {
      if (typeof options.normalize === 'string') {
        path = path.replace(options.match, options.normalize);
      } else if (typeof options.normalize === 'function') {
        path = options.normalize(path);
      }
    }
    // Join path
    path = nPath.join(options.root, path);
    if (options.cache && cache[path]) {
      // Referenced cached value
      var cacheVal = cache[path];
      // Write cached value
      writeOut(req.headers['if-modified-since'] ? 304 : 200, res, cacheVal.out, cacheVal.headers, options);
    } else {
      // Stat the file
      fs.stat(path, function (err, stat) {
        if (err || !stat.isFile()) {
          return next();
        }
        // Pass path to transform if pathOnly is set
        if (options.pathOnly) {
          return options.transform(path, send);
        }
        // Read and transform file
        fs.readFile(path, options.encoding, function (err, data) {
          if (err) {
            throw err;
          }
          options.transform(path, data, send);
        });
        // Send function
        function send(out, headers) {
          // Check for headers
          if (!headers) {
            headers = {};
          }
          // Check out value
          if (!out) {
            return next();
          }
          // Do cache things if necessary
          if (options.cache) {
            var expire = new Date();
            expire.setYear(expire.getFullYear() + 1);
            headers['Expires'] = expire.toUTCString();
            headers['Cache-Control'] = 'public, max-age=' + (options.maxage || 31536000/*One year in seconds*/);
            headers['Last-Modified'] = stat.mtime.toUTCString();
            cache[path] = {out: out, headers: headers};
          }
          // Write out transformed value
          writeOut(200, res, out, headers, options);
        }
      });
    }
  };
}

// Write output
function writeOut(code, res, out, headers, options) {
  // Set length if necessary
  if (!headers['Content-Length']) {
    headers['Content-Length'] = Buffer.byteLength(out);
  }
  if (code === 200) {
    for (var k in headers) {
      if (headers.hasOwnProperty(k)) {
        res.setHeader(k, headers[k]);
      }
    }
    res.end(out, options.encoding);
  } else {
    res.writeHead(code, headers);
    res.end();
  }
}

// Export factory which creates middleware for Stylus
createMiddleware.stylus = (function () {
  // Require stylus in closure
  var stylus = null;
  try {
    stylus = require('stylus');
  } catch (e) {
    // Acts as factory and alerts user to install stylus
    return function () {
      throw e;
    };
  }
  // Attempt to grab nib
  var nib = null;
  try {
    nib = require('nib');
    nib = nib();
  } catch (e) {
    // nib not found, no big deal
    nib = function () {};
  }
  // Return factory function
  // This function is the value of module.exports.stylus
  return function (options) {
    // Return transformation middleware
    return createMiddleware({
      root: options.root,
      match: cssRegex(options.path),
      normalize: '$1.styl',
      cache: options.cache,
      maxage: options.maxage,
      transform: function (path, styl, send) {
        stylus(styl)
          .set('filename', path)
          .set('compress', options.compress)
          .set('include css', true)
          .use(nib)
          .render(function (err, css) {
            if (err) {
              throw err;
            }
            // Stylus keeps newlines and inline comments, even when compressing.
            // Let's get rid of them if necessary
            if (options.compress) {
              css = css.replace(/\n/g, '');
              css = css.replace(/\/\*.+\*\//g, '');
            }
            // Send css to client
            send(css, {'Content-Type': 'text/css'});
          });
      }
    });
  };
})();

// Export factory which creates middleware for Less
createMiddleware.less = (function () {
  // Require Less in closure
  var less = null;
  try {
    less = require('less');
  } catch (e) {
    // Acts as factory and alerts user to install Less
    return function () {
      throw e;
    };
  }
  // Return factory function
  // This function is the value of module.exports.less
  return function (options) {
    // Modify options as necessary
    if (!options.options) {
      options.options = {};
    }
    if (!options.options.paths) {
      options.options.paths = [];
    }
    // Return transformation middleware
    return createMiddleware({
      root: options.root,
      match: cssRegex(options.path),
      normalize: '$1.less',
      cache: options.cache,
      maxage: options.maxage,
      transform: function (path, contents, send) {
        options.options.paths.push(nPath.dirname(path));
        less.render(contents, options.options, function (err, css) {
          if (options.options.compress) {
            css = css.replace(/\n/g, '');
          }
          send(css, {'Content-Type': 'text/css'});
        });
      }
    });
  };
})();

// Export factory which creates middleware for CoffeeScript
createMiddleware.coffee = (function () {
  // Require and instantiate Snockets
  var snockets = null;
  try {
    var Snockets = require('snockets');
    snockets = new Snockets();
  } catch (e) {
    // Acts as factory and alerts user to install Snockets
    return function () {
      throw e;
    };
  }
  // Return factory function
  // This function is the value of module.exports.coffee
  return function (options) {
    // Return transformation middleware
    return createMiddleware({
      root: options.root,
      match: new RegExp((options.path || '') + '/(.+)\\.js'),
      normalize: '$1.coffee',
      pathOnly: true,
      cache: options.cache,
      maxage: options.maxage,
      transform: function (path, send) {
        snockets.getConcatenation(path, options.options, function (err, js) {
          send(js, {'Content-Type': 'application/javascript'});
        });
      }
    });
  };
})();
