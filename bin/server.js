#!/usr/bin/env node

// ## Pult Server
//
// The Pult server manages assigning ports to `.dev` domains, which it serves
// through a local DNS server and HTTP reverse-proxy.
//
// ```
// npm install -g
// ```
//
// ```
// pult-server
// ```
//

var spawn = require('child_process').spawn;
var http  = require('http');
var path  = require('path');
var fs    = require('fs');

var dns       = require('native-dns');
var httpProxy = require('http-proxy');

var package = require('../package.json');

// ### Log
//
// Log output to stdout with a prefix.
//
function log() {
  console.log('[pult-server]', Array.prototype.join.call(arguments, ' '));
}

// ### Argument parsing
//
// The `options` object will hold the parsed values of the command line
// arguments.
//
var options = {
  firstPort: 7001,
  listenHost: '127.0.0.1'
};

var argv = process.argv.slice(2);
while (argv[0] && argv[0][0] == '-') {
  switch (argv[0]) {

  //  - `--foreground`, `-f`: Do not fork to the background.
  case '-f':
  case '--foreground':
    options.foreground = argv.shift();
    break;

  //  - `--port`, `-p`: Set the first port to assign to a `.dev` domain.
  //    Defaults to 7001.
  case '-p':
  case '--port':
    options.firstPort = +argv.argv[1];
    argv = argv.slice(2);
    break;

  //  - `--listen`, `-l`: Set the host to listen on (HTTP and DNS). Defaults to
  //    `127.0.0.1`.
  case '-l':
  case '--listen':
    options.listenHost = argv[1];
    argv = argv.slice(2);
    break;

  //  - `--help`, `-h`: Show help text.
  case '-h':
  case '--help':
    options.help = argv.shift();
    break;

  default:
    log('unknown option', argv[0]);
    process.exit(1);
  }
}

// ### Help text
//
// Output help text and exit.
//
if (options.help) {
  log('-f, --foreground             Do not found to the background');
  log('-p, --port "port"            Set first port to assign');
  log('-l, --listen "host"          Set host to listen on');

  process.exit();
}

// ### Respawn as root
//
// If not running as root, respawn the process with `sudo` to gain permissions
// to listen on ports 80 (HTTP) and 53 (DNS).
//
if (process.getuid() != 0) {
  log('respawning with sudo...');

  // Replace `node` with absolute path to executed `node`.
  var args = process.argv.slice(1);
  args.unshift(process.execPath);

  var respawn = spawn('sudo', args, { stdio: 'inherit' });

  // Exit with the same code as the respawn.
  respawn.on('exit', function(code, signal) {
    process.exit(code);
  });

  // Don't do anything else.
  return;
}

// ### Fork to background
//
// Fork to background unless `-f` was passed. Pass `-f` to the new process to
// prevent an infinite fork loop.
//
if (!options.foreground) {
  log('forking to background...');

  // Insert `-f` at the beginning of the argument list.
  var args = process.argv.slice(1);
  args.splice(1, 0, '-f');

  spawn(process.execPath, args, { stdio: 'ignore', detached: true }).unref();

  // Don't do anything else.
  return;
}

// ### Ports
//
// The `ports` object will hold all the port assignments for `.dev` domains, as
// well as the next port to assign.
//
var ports = {
  'pult.dev': 80,
  next: options.firstPort,

  // #### Get port
  //
  // Get the port assigned to a domain, traversing up subdomains until a match
  // is found.
  //
  get: function(domain) {
    while (!this[domain] && domain.indexOf('.') != -1)
      domain = domain.slice(domain.indexOf('.') + 1);
    return this[domain];
  }
};

// ### DNS Server
//
// Respond to `A` or `ANY` questions for domains with assigned ports with an
// `A` record pointing to the host of the HTTP server. Respond to all other
// questions with `NOTIMP`.
//
var dnsServer = dns.createServer();
dnsServer.on('request', function(req, res) {
  var name = req.question[0].name;
  var type = dns.consts.QTYPE_TO_NAME[req.question[0].type];

  if ((type == 'A' || type == 'ANY') && ports.get(name)) {
    res.answer.push(dns.A({
      name: name,
      address: options.listenHost,
      ttl: 600
    }));
  } else {
    res.header.rcode = dns.consts.NAME_TO_RCODE.NOTIMP;
  }
  res.send();
});

// ### HTTP Server
//
var httpServer = http.createServer();
httpServer.proxy = httpProxy.createProxyServer({});

// #### End JSON
//
// Write a JSON object to the HTTP response along with a `X-Pult-Version`
// header and end the response.
//
function endJSON(status, obj) {
  var json = JSON.stringify(obj);
  this.writeHead(status, {
    'X-Pult-Version': package.version,
    'Content-Type': 'application/json',
    'Content-Length': json.length
  });
  if (this.req.method != 'HEAD')
    this.write(json);
  this.end();
}

// #### HTTP Request
//
httpServer.on('request', function(req, res) {
  // Allow response methods to access the request.
  res.req = req;
  // Assign extra response methods.
  res.endJSON = endJSON;

  // Get host without trailing port.
  var host = req.headers.host.split(':')[0];

  // ##### Requests to pult.dev or localhost
  //
  if (host == 'pult.dev' || host == 'localhost') {

    // ###### DELETE /
    //
    // Shut down the server.
    //
    if (req.method == 'DELETE' && req.url == '/') {
      // Respond with the final state of the server.
      res.endJSON(200, ports);
      return onExit();
    }

    // For all other URLs, only `GET` and `HEAD` are supported.
    if (req.method != 'GET' && req.method != 'HEAD')
      return res.endJSON(405, { method: req.method });

    // Browsers request `favicon.ico` automatically. Prevent it from becoming a
    // `.dev` domain.
    if (req.url == '/favicon.ico')
      return res.endJSON(404, { url: req.url });

    var domain = req.url.slice(1);

    // ###### GET /:domain
    //
    // Get or assign a port for `:domain`, which is a domain or subdomain
    // without `.dev`.
    //
    if (domain) {
      domain += '.dev';
      var port = {};
      port[domain] = ports[domain] || (ports[domain] = ports.next++);
      return res.endJSON(200, port);

    // ###### GET /
    //
    // For browsers, serve an HTML status page with links to each domain. For
    // all other clients, serve a JSON response of port assignments.
    //
    } else {
      if (req.headers.accept && req.headers.accept.indexOf('text/html') == 0) {
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Length': httpServer.statusHTML.length
        });
        res.write(httpServer.statusHTML);
        return res.end();
      } else {
        return res.endJSON(200, ports);
      }
    }

  // ##### Requests to other domains
  //
  // If a port is assigned to the requested host, proxy the request to that
  // port on `127.0.0.1`. If an error occurs when trying to proxy, respond
  // with 502. If there is no port assigned, respond with 503.
  //
  } else {
    var port = ports.get(host);

    if (port) {
      httpServer.proxy.web(req, res, {
        target: 'http://127.0.0.1:' + port
      }, function(err) {
        return res.endJSON(502, err);
      });
    } else {
      return res.endJSON(503, { host: host });
    }
  }
});

// #### HTTP Upgrade
//
// If a port is assigned to the requested host, proxy the upgrade request to
// the websocket on the port.
//
httpServer.on('upgrade', function(req, socket, head) {
  var port = port.get(req.headers.host.split(':')[0]);
  if (port) {
    proxy.ws(req, socket, head, {
      target: 'ws://127.0.0.1:' + port
    }, function(err) {
      // FIXME: Better error handling.
      log(err.stack);
    });
  }
  // FIXME: Handle no port being assigned.
});

// ### Status HTML
//
// Load the status page HTML into a buffer for re-use.
//
var statusPath = path.join(__dirname, '..', 'lib', 'status.html');
fs.readFile(statusPath, function(err, data) {
  if (err) throw err;
  httpServer.statusHTML = data;
  startServers();
});

// ### Start Servers
//
// Bind HTTP and DNS servers to port 80 and 53 respectively, on the listen
// host.
//
function startServers() {
  httpServer.listen(80, options.listenHost);
  dnsServer.serve(53, options.listenHost);
  registerDNSServer();
}

// ### Register DNS Server
//
// Add the local DNS server to `/etc/resolv.conf` on Linux, `/etc/resolver/dev`
// on OS X.
//
function registerDNSServer() {
  var nameserverLine = 'nameserver ' + options.listenHost;

  if (process.platform == 'darwin') {
    // Make sure `/etc/resolver` exists.
    fs.mkdir('/etc/resolver', function(err) {
      log('creating /etc/resolver/dev...');
      fs.writeFile('/etc/resolver/dev', nameserverLine, function(err) {
        if (err) throw err;
      });
    });
  } else {
    // Only add the nameserver line if it isn't already present in
    // `/etc/resolv.conf`.
    fs.readFile('/etc/resolv.conf', { encoding: 'utf8' }, function(err, data) {
      if (err) throw err;

      if (data.indexOf(nameserverLine) == -1) {
        log('adding', nameserverLine, 'to /etc/resolv.conf');
        var newData = nameserverLine + '\n' + data;
        fs.writeFile('/etc/resolv.conf', newData, function(err) {
          if (err) throw err;
        });
      }
    });
  }
}

// ### On Exit
//
// On exit, remove the DNS server from `/etc/resolv.conf` on Linux,
// `/etc/resolver` on OS X.
//
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);
function onExit() {
  var nameserverLine = 'nameserver ' + options.listenHost;

  if (process.platform == 'darwin') {
    log('removing /etc/resolver/dev');
    fs.unlink('/etc/resolver/dev', function(err) {
      if (err) throw err;
      process.exit();
    });
  } else {
    fs.readFile('/etc/resolv.conf', { encoding: 'utf8' }, function(err, data) {
      if (err) throw err;
      if (data.indexOf(nameserverLine) == 0) {
        log('removing', nameserverLine, 'from /etc/resolv.conf');
        var newData = data.replace(nameserverLine + '\n', '');
        fs.writeFile('/etc/resolv.conf', newData, function(err) {
          if (err) throw err;
          process.exit();
        });
      } else process.exit();
    });
  }
}
