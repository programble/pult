#!/usr/bin/env node

var http = require('http');
var spawn = require('child_process').spawn;

var argv = process.argv.slice(2);
var name = '';

if (argv.length > 0)
  name = process.cwd().split('/').reverse()[0];

if (argv[0] == '-n') {
  name = argv[1];
  argv = argv.slice(2);
}

http.get('http://pult.dev/' + name, function httpResponse(res) {
  res.setEncoding('utf8');
  res.on('data', function httpResponseData(data) {
    var json = JSON.parse(data);
    for (var host in json)
      if (name)
        spawnWithPort(json[host]);
      else
        console.log(host + ' ' + json[host]);
  });
});

function spawnWithPort(port) {
  process.env.PORT = port;
  spawn(argv[0], argv.slice(1), { stdio: 'inherit' });
}
