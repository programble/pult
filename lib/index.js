// # Pult
//
// Access local servers on `.dev` domains.
//
// ## Contents
//
//  - [Client Library](index.html)
//  - [Client Library Example](example.html)
//  - [Command Line](pult.html)
//  - [Server](server.html)
//  - [Static File Server](static.html)
//
// ## Client Library
//
// ```
// npm install --save-dev pult
// ```
//
// ```
// var pult = require('pult');
// ```
//
// The Pult client library allows you to start up your Node server on a local
// `.dev` domain. For an example Node server using Pult, see the [Client
// Library Example](example.html).
//

var path  = require('path');
var spawn = require('child_process').spawn;
var dns   = require('dns');
var http  = require('http');

var package = require('../package.json');

exports = module.exports = {
  // ### Server Status
  //
  // Get the running status of `pult-server`.
  //
  // Callback should take `(err, up)`, where `up` is a boolean indicating if
  // `pult-server` is available on `pult.dev`.
  //
  serverStatus: function(done) {
    dns.lookup('pult.dev', function(err, address, family) {
      if (err && err.code == 'ENOTFOUND') done(null, false);
      else done(err, true);
    });
  },

  // ### Spawn Server
  //
  // Spawn `pult-server`.
  //
  // `args` is an optional array of arguments to be passed to `pult-server`.
  //
  // Callback should take `(err)` and is called once `pult-server` is available
  // on `pult.dev`.
  //
  spawnServer: function(args, done) {
    if (typeof args == 'function') {
      done = args;
      args = [];
    }

    args.unshift(path.join(__dirname, '..', 'bin', 'server.js'));
    var serverProcess = spawn(process.execPath, args, {
      stdio: 'inherit'
    });

    serverProcess.on('exit', function(code, signal) {
      if (code != 0) {
        var err = new Error('pult-server failed to start');
        err.exitCode = code;
        return done(err);
      }

      var tries = 0;
      var serverWait = function(err, up) {
        if (err) return done(err);
        if (up) return done();
        if (++tries == 50) {
          var err = new Error(
            'pult-server started but was unavailable after 5 seconds'
          );
          return done(err);
        }
        setTimeout(function() {
          exports.serverStatus(serverWait)
        }, 100);
      };
      serverWait();
    });
  },

  // ### Kill Server
  //
  // Kill `pult-server` by sending HTTP DELETE / to `http://pult.dev`.
  //
  // Callback should take `(err)` and is called when the HTTP response is
  // received.
  //
  killServer: function(done) {
    http.request({
      hostname: 'pult.dev',
      method: 'DELETE'
    }, function(res) {
      done();
    }).on('error', done).end();
  },

  // ### Server Version
  //
  // Get the version of the running `pult-server` instance.
  //
  // Callback should take `(err, serverVersion, clientVersion)`.
  //
  serverVersion: function(done) {
    http.get('http://pult.dev', function(res) {
      done(null, res.headers['x-pult-version'], package.version);
    }).on('error', done);
  },

  // ### Get
  //
  // Send an HTTP GET request to `pult.dev`.
  //
  // This function is not recommended for public use, instead you should use
  // `getPorts` or `getPort`, which call this function.
  //
  // `path` is the path to GET.
  //
  // Callback should take `(err, json)`, where `json` is the JSON response from
  // `pult-server`.
  //
  get: function(path, done) {
    http.get('http://pult.dev' + path, function(res) {
      res.setEncoding('utf8');
      res.on('data', function(data) {
        done(null, JSON.parse(data));
      });
    }).on('error', done);
  },

  // ### Get Ports
  //
  // Retrieve domain names and corresponding ports from `pult-server`.
  //
  // Callback should take `(err, ports)`, where `ports` is an object containing
  // domain name keys and port number values. Note that `pult.dev` as well as
  // `next` (indicating the next port number to assign) are included in this
  // object.
  //
  getPorts: function(done) {
    exports.get('/', done);
  },

  // ### Get Port
  //
  // Retrieve the port number assigned to a domain from `pult-server`.
  //
  // `name` is the domain name, without `.dev`. For example, to retrieve the
  // port number assigned to `foobar.dev`, call `getPort` with `'foobar'`.
  //
  // Callback should take `(err, port, domain)`, where `port` is the assigned
  // port number and `domain` is the full domain name (with `.dev`).
  //
  getPort: function(name, done) {
    exports.get('/' + name, function(err, ports) {
      for (var domain in ports) {
        return done(null, ports[domain], domain);
      }
      return done(new Error('did not receive port'));
    });
  }
};
