/*jshint node:true strict:false*/
// Dependencies
var parse = require('../node_modules/connect/lib/utils').parseUrl,
    fs = require('fs'),
    join = require('path').join;

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
  normalize: May be a string or a function
    Example of string usage:
      match is set to /(.+)\.js/, normalize may be "$1.coffee".
      If the file "foo.js" is requested, then the file "foo.coffee" will be opened for transformation
    Example of function usage:
      match is set to /.+\.js/, normalize may be function (name) { return name.substring(0, name.length - 2) + 'coffee' }
      If the file "foo.js" is requested, then the file "foo.coffee" will be opened for transformation
  cache: if true then the transformed text will be cached
  encoding: defaults to 'utf-8', may be set to "buffer" to indicate that the transformation function is expecting a buffer
*/
module.exports = function (options) {
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
      // Check for 'If-Modified-Since' and write 304 if present
      if (req.headers['if-modified-since']) {
        return writeOut(304, res, out, headers, options);
      }
      // Write out cached value
      var cacheVal = cache[path];
      writeOut(200, res, cacheVal.out, cacheVal.headers, options);
    } else {
      // Read and transform file
      fs.readFile(path, options.encoding, function (err, data) {
        if (err) {
          return next();
        }
        options.transform(path, data, function (out, headers) {
          // Check out value
          if (!out) {
            return next();
          }
          // Cache transformed value
          cache[path] = {out: out, headers: headers};
          // Write out transformed value
          writeOut(200, res, out, headers, options);
        });
      });
    }
  };
};

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
};
