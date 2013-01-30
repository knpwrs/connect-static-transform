// Dependencies
var parse = require('../node_modules/connect/lib/utils').parseUrl,
    fs = require('fs');

/*
Options must contain the following keys:
  root: The root directory in which to open files
  match: A regular expression denoting which files to open
  transform: A function which takes two arguments.
    The first argument is the text or buffer from the read file.
    The second argument is a callback function which accepts two arguments:
      The first argument is the transformed text / buffer
      The second argument (optional) is an object containing HTTP headers where keys (header names) map to values
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

}
