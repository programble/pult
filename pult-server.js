#!/usr/bin/env node

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

dnsServer.on('socketError', function dnsSocketError(err, socket) {
  if (err.code == 'EACCES') {
    console.log('cannot bind DNS server to port 53');
    console.log('please run as root');
    process.exit(1);
  }
});

dnsServer.serve(53);

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
