/*jshint node:true strict:false sub:true*/
// Dependencies
var parse = require('connect/lib/utils').parseUrl,
    fs = require('fs'),
    join = require('path').join;

// Export middleware
exports.middleware = middleware;

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
  cache: If true then the transformed text will be cached.
  maxage: Sets the maximum number of seconds a client should cache the output for. Defaults to one year.
  encoding: defaults to 'utf-8', may be set to "buffer" to indicate that the transformation function is expecting a buffer.
*/
function middleware(options) {
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
    path = join(options.root, path);
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
        // Read and transform file
        fs.readFile(path, options.encoding, function (err, data) {
          if (err) {
            throw err;
          }
          options.transform(path, data, function (out, headers) {
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
            }
            // Cache transformed value
            cache[path] = {out: out, headers: headers};
            // Write out transformed value
            writeOut(200, res, out, headers, options);
          });
        });
      });
    }
  };
}

// Write output
function writeOut(code, res, out, headers, options) {
  // Set length if necessary
  if (!headers['Content-Length']) {
    headers['Content-Length'] = out.length;
  }
  res.writeHead(code, headers);
  if (code === 200) {
    res.end(out, options.encoding);
  } else {
    res.end();
  }
}

// Exportfactory which creates middleware for stylus
module.exports.stylus = (function () {
  // Require stylus in closure
  var stylus = require('stylus');
  // Return factory function
  // This function is the value of module.exports.stylus
  return function (root, compress, cache, maxage) {
    // Return transformation middleware
    return middleware({
      root: root,
      match: /(.+)\.css/,
      normalize: '$1.styl',
      cache: cache,
      maxage: maxage,
      transform: function (path, styl, send) {
        stylus.render(styl, {filename: path, compress: compress}, function (err, css) {
          if (err) {
            throw err;
          }
          // Stylus keeps newlines and inline comments, even when compressing.
          // Let's get rid of them if necessary
          if (compress) {
            css = css.replace(/\n/g, '');
            css = css.replace(/\*.+\*\//g, '');
          }
          // Send css to client
          send(css, {'Content-Type': 'text/css'});
        });
      }
    });
  };
})();
