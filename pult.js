#!/usr/bin/env node

var http = require('http');
var spawn = require('child_process').spawn;

var name = process.cwd().split('/').reverse()[0];

http.get('http://pult.dev/' + name, function httpResponse(res) {
  res.setEncoding('utf8');
  res.on('data', function httpResponseData(data) {
    var json = JSON.parse(data);
    for (var host in json)
      spawnWithPort(json[host]);
  });
});

function spawnWithPort(port) {
  process.env.PORT = port;
  spawn(process.argv[2], process.argv.slice(3), { stdio: 'inherit' });
}
