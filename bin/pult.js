#!/usr/bin/env node

// ## Pult Command Line
//
// The Pult command line allows you to start any HTTP server on a local `.dev`
// domain.
//
// ```
// npm install -g pult
// ```
//
// ```
// pult ./server
// ```
//

var fs    = require('fs');
var spawn = require('child_process').spawn;

var pult         = require('../lib');
var staticServer = require('../lib/static');

// ### Log
//
// Log output to stderr with a prefix; do nothing if `options.quiet` is set.
//
function log() {
  if (!options.quiet)
    console.error('[pult]', Array.prototype.join.call(arguments, ' '));
}

// ### Argument parsing
//
// The `argv` array will be partially consumed by parsing any `-` short or `--`
// long options and their values, leaving the command to spawn the server
// process.
//
var argv = process.argv.slice(2);
//
// The `options` object will hold the parsed values of the command line
// arguments.
//
var options = {
  // The default method of passing the port number to the server process is
  // through the `PORT` environment variable.
  method: 'PORT'
};

while (argv[0] && argv[0][0] == '-') {
  switch (argv[0]) {

  //  - `--kill`, `-k`: Kill the Pult server.
  case '-k':
  case '--kill':
    options.kill = argv.shift();
    break;

  //  - `--name`, `-n`: Set domain name for the server. Value should not
  //    contain the `.dev` suffix.
  case '-n':
  case '--name':
    options.name = argv[1];
    argv = argv.slice(2);
    break;

  //  - `--port`, `-p`, `-P`: Pass the port number to the server process by appending
  //    a `-p`, `-P` or `--port` argument.
  case '-p':
  case '-P':
  case '--port':
    options.method = argv.shift();
    break;

  //  - `--static`, `-s`: Start a [static file HTTP server](static.html) in the
  //    current directory instead of a specific server process.
  case '-s':
  case '--static':
    options.static = argv.shift();
    break;

  //  - `--quiet`, `-q`: Disable logging.
  case '-q':
  case '--quiet':
    options.quiet = argv.shift();
    break;

  //  - `--help`, `-h`: Show help text.
  case '-h':
  case '--help':
    options.help = argv.shift();
    break;

  // Output unknown option error even if quiet was set and exit.
  default:
    options.quiet = false;
    log('unknown option', argv[0]);
    process.exit(1);
  }
}

// ### Help text
//
// Output help text even if quiet is set then exit.
//
if (options.help) {
  options.quiet = false;

  log('-k, --kill               Kill Pult server');
  log('-n, --name "name"        Set domain name');
  log('-p, -P, --port           Set port by passing -p, -P or --port to server');
  log('-s, --static             Start a static file server');
  log('-q, --quiet              Disable logging');

  process.exit();
}

// ### Kill Pult Server
//
// Kill the Pult server if it is running, and exit.
//
if (options.kill) {
  return pult.serverStatus(function(err, up) {
    if (err) throw err;
    if (up) {
      pult.killServer(function(err) {
        if (err) throw err;
        process.exit();
      });
    } else {
      log('server not running');
      process.exit();
    }
  });
}

// ### Read dot Pult
//
// If a name has not been specified on the command line through `--name`, try
// to read one from `.pult` in the current directory. If that does not exist,
// use the name of the current directory.
//
if (!options.name) {
  fs.readFile('.pult', { encoding: 'utf8' }, function(err, data) {
    if (err && err.code != 'ENOENT') throw err;
    if (data)
      options.name = data.trim();
    else
      options.name = process.cwd().split('/').reverse()[0];
    ensurePultServer();
  });
} else ensurePultServer();

// ### Ensure Pult Server
//
// Check if the Pult server is running, and start it if it isn't.
//
function ensurePultServer() {
  pult.serverStatus(function(err, up) {
    if (err) throw err;

    if (up)
      checkVersion();
    else {
      log('starting server...');
      pult.spawnServer(function(err) {
        if (err) throw err;
        checkVersion();
      });
    }
  });
}

// ### Check Version
//
// Check the version of the running Pult server and output a warning if it does
// not match.
//
function checkVersion() {
  pult.serverVersion(function(err, serverVersion, clientVersion) {
    if (err) throw err;
    if (serverVersion != clientVersion)
      log('warning: server version', serverVersion, '!=',
          'client version', clientVersion);
    getPorts();
  });
}

// ### Get Ports
//
// Get the port number assigned to the domain name if there is a server to run
// (in `argv` or with `--static`). Otherwise, list all Pult domains and ports.
//
function getPorts() {
  if (argv.length || options.static) {
    pult.getPort(options.name, function(err, port, domain) {
      if (err) throw err;
      log('http://' + domain, '-->', 'http://localhost:' + port);
      spawnServer(port);
    });
  } else {
    pult.getPorts(function(err, ports) {
      if (err) throw err;
      for (var domain in ports) {
        var port = ports[domain];
        // Do not display `next` as a link.
        if (domain == 'next')
          log('next:', port);
        // Do not display pult.dev link.
        else if (domain != 'pult.dev')
          log('http://' + domain, '-->', 'http://localhost:' + port);
      }
      process.exit();
    });
  }
}

// ### Spawn Server
//
// Spawn the server process or the static file server, passing the port number
// to it using `options.method`.
//
function spawnServer(port) {
  if (options.static) {
    staticServer.listen(port);
  } else {
    if (options.method == 'PORT')
      process.env.PORT = port;
    else
      argv.push(options.method, port);
    var serverProcess = spawn(argv[0], argv.slice(1), { stdio: 'inherit' });
    // Exit with the same code as the server process.
    serverProcess.on('exit', function(code, signal) {
      process.exit(code);
    });
  }
}
