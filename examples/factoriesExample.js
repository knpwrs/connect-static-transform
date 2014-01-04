/*jshint node:true strict:false*/
var http = require('http'),
    connect = require('connect'),
    st = require('../'),
    stylus = require('stylus');

// Create application
var app = connect();

// Serve .styl files as css from /stylus
app.use(st.stylus({
  root: __dirname, // open .styl files from this directory
  path: '/stylus', // serve .css files from /stylus
  compress: true,
  cache: true,
  maxage: 3600 // one hour in seconds
}));

// Serve .less files as css from /less
app.use(st.less({
  root: __dirname, // open .less files from this directory
  path: '/less', // serve .css files from /less
  cache: true,
  maxage: 3600, // one hour in seconds
  options: {
    compress: true
  }
}));

// Serve .coffee files as JavaScript from /js
app.use(st.coffee({
  root: __dirname, // open .coffee files from this directory
  path: '/js', // serve .js files from /js
  cache: true,
  maxage: 3600,
  // Options to pass to snockets:
  options: {
    minify: true
  }
}));

// Create server and listen
http.createServer(app).listen(3000);
