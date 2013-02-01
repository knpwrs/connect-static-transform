#connect-static-transform
##Introduction
`connect-static-transform` is a middleware for [Connect](https://github.com/senchalabs/connect) and systems based on Connect such as [Express](https://github.com/visionmedia/express). It allows you to serve static files but gives you an opportunity to transform the content of the files before they are sent to the client (e.g., compiling `.coffee` files or compiling `.styl` files).

## Example Usage
There are a few examples available in `example/app.js`. Consider the following simple example:

    // Dependencies
    var http = require('http'),
        connect = require('connect'),
        st = require('connect-static-transform');

    // Middleware which serves .txt files in all uppercase
    var toUpperCase = st({
      root: __dirname,
      match: /.+\.txt/,
      transform: function (path, text, send) {
        send(text.toUpperCase());
      }
    });

    // Create application which uses middleware
    var app = connect().use(toUpperCase);

    // Create server and listen
    http.createServer(app).listen(3000);

This shows the basic usage. `st` acts as a factory which creates middleware for use in a Connect-like system. The above example will serve all files in `__dirname` matching `/.+\.txt/` in all uppercase letters.

## Options
`st` takes a single argument: an object containing all configuration options.

### Required options

`root`

This option specifies which directory the static files should come from.

`match`

This option should be a regular expression which matches the full path of a file as given to the server from the client.

`transform`

This option should be a function which may operate asynchronously. Three arguments are passed to `transform`. The first argument is the path to the file which was opened. The second argument is the data from the file which was opened. The third argument is a callback to which the transformed data should be passed. If the argument to the callback is `false` or otherwise untruthy then the next middleware in the Connect application is invoked.

### Optional options

`normalize`

This option, if presented, will alter the path to the file being opened before it is opened. For example, if the client requested `script.js` and you wanted to open `script.coffee` for compilation then there are two things you can do with `normalize`.

First, you can pass a string which follows regular expression replacement syntax. If `match` were set to `/(.+)\.js`, you set normalize to `'$1.coffee'`. In this case, a request to `script.js` will result in `script.coffee` being opened for transformation. `match` must have capture groups in order for this to work.

Second, you can pass a function which given the path returns the path of the file to open. For example, to accomplish the same as the first example `normalize` could be set as such:

    var compileCoffee = st({
      // other options
      normalize: function (path) {
        return path.substring(0, path.length - 2) + 'coffee';
      },
      // other options
    });

`pathOnly`

If `true` then the signature for the transformation function becomes `function (path, send) { }`, i.e., the file is not opened by `connect-static-transform`.

`cache`

If set to `true` or an otherwise truthy value, the transformed data for each path will be cached in memory. Appropriate cache headers will also be set on the HTTP response.

`maxage`

Used in conjunction with `cache`, this indicates the maximum age in seconds a client should keep the file cached for. This will not expire the local in-memory cache.

`encoding`

The encoding of the files which are opened for transformation. Defaults to `'utf-8'`. If set to `'buffer'` then the transformation function will receive a raw data buffer (see [`fs.readFile(...)`](http://nodejs.org/api/fs.html#fs_fs_readfile_filename_encoding_callback)).

##Included Middleware Factories
`connect-static-transform` includes factory functions for common use-cases. Instead of manually creating middleware using the `st` function as above, you can simply use the factories outlined in this section.
### Stylus
To use the Stylus middleware factory you must have [Stylus](https://github.com/LearnBoost/stylus) installed in your project. From there, you can create a Stylus middleware using `st.stylus(root[, compress[, cache[, maxage=31536000]]])`. See the following examples:

    // If you have a file `foo.styl` in `__dirname` then you can access the compiled css at the url `/foo.css`:
    app.use(st.stylus(__dirname));
    // Same as above, except the output will be compressed and cached in memory and on the client
    app.use(st.stylus(__dirname, true, true));

### CoffeeScript
To use the CoffeeScript middleware factory you must have [Snockets](https://github.com/TrevorBurnham/snockets) and [Coffee-Script](https://github.com/jashkenas/coffee-script) installed locally. Compilation is handled by Snockets. You can create a CoffeeScript middleware using `st.coffee(root[, options[, cache[, maxage=31536000]]])`. `options` is an object of objects passed to Snockets. See the following examples:

    // If you have a file `foo.coffee` in `__dirname` then you can access the compiles javascript at the url `/foo.js`:
    app.use(st.coffee(__dirname));
    // Same as above except the output will be compressed and cached in memory and on the client:
    app.use(st.coffee(__dirname, {minify: true}, true));

##License
**The MIT License**

Copyright (c) 2013 Kenneth Powers

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
