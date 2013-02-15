/*jshint node:true strict:false*/
var http = require('http'),
    connect = require('connect'),
    st = require('../'),
    stylus = require('stylus');

// Serve .txt files in all uppercase
var toUpperCase = st({
  root: __dirname,
  match: /.+\.txt/,
  transform: function (path, text, send) {
    send(text.toUpperCase(), {'Content-Type': 'text/plain'});
  }
});

// Serve .css files from .styl files and cache the results in memory
var cssFromStyl = st({
  root: __dirname,
  match: /(.+)\.css/,
  normalize: '$1.styl',
  cache: true,
  maxage: 60 * 60 * 24 * 30/*30 days, default is 1 year*/,
  transform: function (path, styl, send) {
    stylus.render(styl, {filename: path, compress: true}, function (err, css) {
      if (err) {
        throw err;
      }
      // Stylus keeps newlines and inline comments, even when compressing. Let's get rid of them:
      css = css.replace(/\n/g, '');
      css = css.replace(/\/\*.+\*\//g, '');
      // Send css to client
      send(css, {'Content-Type': 'text/css'});
    });
  }
});

// Create application
var app = connect().use(toUpperCase).use(cssFromStyl);

// Create server and listen
http.createServer(app).listen(3000);
