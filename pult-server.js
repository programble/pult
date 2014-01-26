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
  var type = dns.consts.QTYPE_TO_NAME[req.question[0].type];
  if (ports[name]) {
    if (type == 'A')
      res.answer.push(dns.A({
        name: name,
        address: '127.0.0.1',
        ttl: 600
      }));
    else if (type == 'AAAA')
      res.answer.push(dns.AAAA({
        name: name,
        address: '::1',
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

var proxy = httpProxy.createProxyServer({});

function resJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify(obj));
  res.end();
}

function httpRequest(req, res) {
  var host = req.headers.host;
  var port = ports[host];

  if (host == 'pult.dev') {
    if (req.method != 'GET')
      return resJSON(res, 400, { method: req.method });

    var name = req.url.slice(1);

    if (name) {
      name += '.dev';
      port = {};
      port[name] = ports[name] || (ports[name] = nextPort++);
      resJSON(res, 200, port);
    } else {
      resJSON(res, 200, ports);
    }
  } else if (port) {
    proxy.web(req, res, { target: 'http://[::1]:' + port },
      function proxyWebError6(err) {
        proxy.web(req, res, { target: 'http://127.0.0.1:' + port },
          function proxyWebError4(err) {
            resJSON(res, 502, err);
          });
      });
  }
}

function httpUpgrade(req, socket, head) {
  var port = ports[req.headers.host];
  if (port) {
    proxy.ws(req, socket, head, { target: 'ws://[::1]:' + port },
      function proxyWsError6(err) {
        proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:' + port },
          function proxyWsError4(err) {
            resJSON(res, 502, err);
          });
      });
  }
}

var httpServer4 = http.createServer();
var httpServer6 = http.createServer();
httpServer4.on('request', httpRequest);
httpServer6.on('request', httpRequest);
httpServer4.on('upgrade', httpUpgrade);
httpServer6.on('upgrade', httpUpgrade);

httpServer4.listen(80, '127.0.0.1');
httpServer6.listen(80, '::1');
