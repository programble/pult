// # Pult
//
// ## Client Library Example
//
// This is an example of a Node HTTP server using Pult to bind to a local
// `.dev` domain.
//

var http = require('http');
var pult = require('pult');

// The server will be available at `http://hello.dev`.
var SERVER_NAME = 'hello';
// The port to fall back to if Pult is not available.
var DEFAULT_PORT = 8080;

// Create a simple HTTP server that responds with "Hello, World!" to every
// request.
var server = http.createServer(function(req, res) {
  var body = 'Hello, World!';
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': body.length
  });
  res.write(body);
  res.end();
});

// Only try to use Pult in development.
if (process.env.NODE_ENV == 'development') {
  // Check if Pult is running.
  pult.serverStatus(function(err, up) {
    if (err) throw err;
    // If the Pult server is up, retrieve a port number for `SERVER_NAME`
    // from it.
    if (up) {
      pult.getPort(SERVER_NAME, function(err, port, domain) {
        if (err) throw err;
        // Bind the HTTP server to the assigned port.
        server.listen(port);
        // Output a link to the `.dev` domain.
        console.log('http://' + domain);
      });
    // If the Pult server is not running, bind the HTTP server to the `PORT`
    // environment variable or the default development port.
    } else {
      var port = process.env.PORT || DEFAULT_PORT;
      server.listen(port);
      // Output a link to the server.
      console.log('http://localhost:' + port);
    }
  });
// In production, bind the HTTP server to the `PORT` environment variable.
} else {
  server.listen(process.env.PORT);
}

// ### Starting the Pult server automatically
//
// Though not recommended because some developers may not want to run the Pult
// server, it is possible to automatically start it before your server starts.
//

// Callback to start the server once Pult is running.
function startServer() {
  pult.getPort(SERVER_NAME, function(err, port, domain) {
    if (err) throw err;
    server.listen(port);
    console.log('http://' + domain);
  });
}

// Check if the Pult server is already running.
pult.serverStatus(function(err, up) {
  if (err) throw err;
  // If Pult is already running, start the server.
  if (up) {
    startServer();
  // Otherwise, spawn the Pult server.
  } else {
    pult.spawnServer(function(err) {
      if (err) throw err;
      // Then start the HTTP server.
      startServer();
    });
  }
});
