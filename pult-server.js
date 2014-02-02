#!/usr/bin/env node

var spawn = require('child_process').spawn;
var os = require('os');
var fs = require('fs');
var dns = require('native-dns');
var http = require('http');
var httpProxy = require('http-proxy');

if (process.getuid() != 0) {
  console.log('spawning with sudo...');

  var args = process.argv.slice(1);
  args.unshift(process.execPath);
  spawn('sudo', args, { stdio: 'inherit' });
  return;
}

if (process.argv.indexOf('-f') == -1) {
  console.log('forking to background...');

  var args = process.argv.slice(1);
  args.splice(1, 0, '-f');
  spawn(process.execPath, args, { stdio: 'ignore', detached: true }).unref();
  return;
}

var listenHost = '127.0.0.1';
var firstPort = 7001;

var argv = process.argv.slice(2);
while (argv[0]) {
  var arg = argv.shift();
  switch (arg) {
  case '-p':
    firstPort = argv.shift();
    break;
  case '-l':
    listenHost = argv.shift();
    break;
  case '-f':
    break;
  default:
    console.log('unknown option ' + arg);
    process.exit(1);
  }
}

var ports = {
  'pult.dev': 80,
  next: firstPort
};

function getPort(host) {
  while (!ports[host] && host.indexOf('.') != -1)
    host = host.slice(host.indexOf('.') + 1);
  return ports[host];
}

var dnsServer = dns.createServer();

dnsServer.on('request', function dnsRequest(req, res) {
  var name = req.question[0].name;
  var type = dns.consts.QTYPE_TO_NAME[req.question[0].type];
  if (getPort(name) && (type == 'A' || type == 'ANY')) {
    res.answer.push(dns.A({
      name: name,
      address: listenHost,
      ttl: 600
    }));
  } else {
    res.header.rcode = dns.consts.NAME_TO_RCODE.NOTIMP;
  }
  res.send();
});

dnsServer.serve(53, listenHost);

var resolvConfLine = 'nameserver ' + listenHost;

if (os.platform() == 'darwin') {
  fs.mkdir('/etc/resolver', function mkdirResolver(err) {
    console.log('adding /etc/resolver/dev');
    fs.writeFile('/etc/resolver/dev', resolvConfLine,
      function writeResolver(err) { if (err) throw err; });
  });
} else {
  fs.readFile('/etc/resolv.conf', { encoding: 'utf8' },
    function readResolvConf(err, data) {
      if (err) throw err;
      if (data.indexOf(resolvConfLine) == -1) {
        console.log('adding ' + resolvConfLine + ' to /etc/resolv.conf');
        fs.writeFile('/etc/resolv.conf', resolvConfLine + '\n' + data,
          function writeResolvConf(err) { if (err) throw err; });
      }
  });
}

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);
function onExit() {
  if (os.platform() == 'darwin') {
    console.log('removing /etc/resolver/dev');
    fs.unlink('/etc/resolver/dev', function(err) {});
    process.exit();
  } else {
    fs.readFile('/etc/resolv.conf', { encoding: 'utf8' }, function(err, data) {
      if (err) throw err;
      if (data.indexOf(resolvConfLine) == 0) {
        console.log('removing ' + resolvConfLine + ' from /etc/resolv.conf');
        fs.writeFile('/etc/resolv.conf', data.replace(resolvConfLine + '\n', ''),
          function(err) {
            if (err) throw err;
            process.exit();
          });
      }
    });
  }
}

var proxy = httpProxy.createProxyServer({});

function resJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify(obj));
  res.end();
}

function httpRequest(req, res) {
  var host = req.headers.host;
  host = host.split(':')[0]; // Ignore port
  var port = getPort(host);

  if (host == 'pult.dev') {
    if (req.method == 'DELETE' && req.url == '/') {
      resJSON(res, 200, ports);
      return onExit();
    }
    if (req.method != 'GET')
      return resJSON(res, 400, { method: req.method });

    var name = req.url.slice(1);

    if (name) {
      name += '.dev';
      port = {};
      port[name] = ports[name] || (ports[name] = ports.next++);
      resJSON(res, 200, port);
    } else {
      resJSON(res, 200, ports);
    }
  } else if (port) {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + port },
      function proxyWebError4(err) {
        resJSON(res, 502, err);
      });
  } else {
    resJSON(res, 502, { host: host });
  }
}

function httpUpgrade(req, socket, head) {
  var port = getPort(req.headers.host);
  if (port) {
    proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:' + port },
      function proxyWsError4(err) {
        resJSON(res, 502, err);
      });
  } else {
    resJSON(res, 502, { host: req.headers.host });
  }
}

var httpServer = http.createServer();
httpServer.on('request', httpRequest);
httpServer.on('upgrade', httpUpgrade);
httpServer.listen(80, listenHost);
