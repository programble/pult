// # Pult
//
// ## Static File Server
//
// A simple static file HTTP server that the [Pult command line](pult.html)
// runs for the `--static` option. Used to easily make static assets available
// on a local `.dev` domain.
//
// This could be extended in future versions to serve directory listings as
// well as files.
//

var http = require('http');
var path = require('path');
var mime = require('mime');
var fs   = require('fs');

// ### Log
//
// Log output to stdout with a prefix.
//
function log() {
  console.log('[static]', Array.prototype.join.call(arguments, ' '));
}

// ### Write Status
//
// Write an HTTP status code and its status text to the body of an HTTP
// response.
//
function writeStatus(status, headers) {
  if (!headers) headers = {};
  this.logType = headers['Content-Type'] = 'text/plain';
  this.logLength = headers['Content-Length'] = http.STATUS_CODES[status].length;
  this.writeHead(status, headers);
  if (this.req.method != 'HEAD')
    this.write(http.STATUS_CODES[status]);
}

// ### End
//
// End the HTTP response (by calling the original `res.end()` and log the
// request.
//
function end() {
  this._end();
  log(
    new Date().toISOString(),
    this.req.method,
    this.req.url,
    this.statusCode,
    http.STATUS_CODES[this.statusCode],
    this.logType,
    this.logLength
  );
}

// ### HTTP Server
//
var server = http.createServer(function(req, res) {
  // Make request object accessible to response methods.
  res.req = req;
  // Assign extra methods to response object.
  res.writeStatus = writeStatus;
  res._end = res.end;
  res.end = end;

  // Only GET and HEAD are supported.
  if (req.method != 'GET' && req.method != 'HEAD') {
    res.writeStatus(405, { 'Allow': 'GET, HEAD' });
    return res.end();
  }

  // Serve files from the working directory.
  var filePath = path.resolve(path.join(process.cwd(), req.url));

  // Do not serve paths outside of the working directory (i.e. `..`).
  if (filePath.indexOf(process.cwd()) != 0) {
    res.writeStatus(403);
    return res.end();
  }

  // Attempt to open the file for reading.
  var readStream = fs.createReadStream(filePath);

  readStream.on('error', function(err) {
    // If the path points to a directory, redirect to `index.html` in that
    // directory.
    if (err.code == 'EISDIR') {
      res.writeStatus(302, { 'Location': path.join(req.url, 'index.html') });
      return res.end();
    }

    // Return 404 if the path does not exist.
    if (err.code == 'ENOENT') {
      res.writeStatus(404);
      return res.end();
    }

    // Return 403 if the path cannot be accessed.
    if (err.code == 'EACCES') {
      res.writeStatus(403);
      return res.end();
    }

    // If any other error occurred, return 500 and log the error.
    res.writeStatus(500);
    log(err.stack);
    return res.end();
  });

  readStream.on('open', function(fd) {
    // Stat the file to get its size and modification date.
    fs.fstat(fd, function(err, stats) {
      if (err) {
        res.writeStatus(500);
        log(err.stack);
        return res.end();
      }

      // Look up the MIME type of the path.
      var mimeType = mime.lookup(filePath);

      // Set response headers for type, length, and modification time.
      var headers = {
        'Content-Type': mimeType,
        'Content-Length': stats.size,
        'Last-Modified': stats.mtime.toUTCString()
      };

      // Save type and length for request logging.
      res.logType = mimeType;
      res.logLength = stats.size;

      // If the file has not been modified since the value of the
      // `If-Modified-Since` request header, return 304.
      if (req.headers['if-modified-since']) {
        var since = new Date(req.headers['if-modified-since']);
        if (stats.mtime <= since) {
          // Let data flow but don't read it.
          readStream.resume();
          res.writeHead(304, headers);
          return res.end();
        }
      }

      // Send the headers for the requested file.
      res.writeHead(200, headers);

      // Write the file's contents to the response body.
      if (req.method != 'HEAD') {
        readStream.pipe(res);
      } else {
        // Let data flow but don't read it.
        readStream.resume();
        res.end();
      }
    });
  });
});

module.exports = server;
