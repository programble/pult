#!/usr/bin/env node

if (process.getuid() != 0) {
  console.log('spawning with sudo...');
  var args = process.argv.slice(1);
  args.unshift(process.execPath);
  require('child_process').spawn('sudo', args, { stdio: 'inherit' });
  return;
}

var fs = require('fs');
var dns = require('native-dns');
var http = require('http');
var httpProxy = require('http-proxy');

var nextPort = 7000;
var ports = {
  'pult.dev': 80
};

var dnsServer = dns.createServer();

dnsServer.on('request', function dnsRequest(req, res) {
  var name = req.question[0].name;
  if (ports[name]) {
    res.answer.push(dns.A({
      name: name,
      address: '127.0.0.1',
      ttl: 600
    }));
  }
  res.send();
});

dnsServer.serve(53);

var resolvConfLine = 'nameserver 127.0.0.1';

fs.readFile('/etc/resolv.conf', { encoding: 'utf8' },
  function readResolvConf(err, data) {
    if (err) throw err;
    if (data.indexOf(resolvConfLine) == -1) {
      console.log('adding ' + resolvConfLine + ' to /etc/resolv.conf');
      fs.writeFile('/etc/resolv.conf', resolvConfLine + '\n' + data,
        function writeResolvConf(err) { if (err) throw err; });
    }
});

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);
function onExit() {
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

var proxyServer = httpProxy.createProxyServer({});

proxyServer.on('error', function proxyError(err, req, res) {
  res.writeHead(502);
  res.end();
});

var httpServer = http.createServer(function httpRequest(req, res) {
  var host = req.headers.host;

  if (host == 'pult.dev') {
    if (req.method != 'GET') {
      res.writeHead(400);
      return res.end();
    }

    var name = req.url.slice(1);

    if (name) {
      name += '.dev';

      var port = {};
      port[name] = ports[name] || (ports[name] = nextPort++);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify(port));
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify(ports));
      res.end();
    }
  } else if (ports[host]) {
    proxyServer.web(req, res, { target: 'http://127.0.0.1:' + ports[host] });
  }
});

httpServer.on('upgrade', function httpUpgrade(req, socket, head) {
  proxyServer.ws(req, socket, head);
});

httpServer.listen(80);
