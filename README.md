# Pult

[![npm](https://img.shields.io/npm/v/pult.svg)][npm]

[npm]: https://npmjs.com/package/pult

Access local servers on .dev domains.

View the [documentation](http://cmcenroe.me/pult) for more detailed
information.

## How do I get it?

```
npm install pult
```

## How do I use it?

Pult can either be used as a library from within your Node HTTP app, or
from the command line for use with other HTTP servers.

### As a Library

See the [library documentation](http://cmcenroe.me/pult/index.html) for
more information.

```js
var pult = require('pult');
var http = require('http');

var server = http.createServer();

pult.getPort('my-app', function(err, port, domain) {
  if (err) throw err;
  server.listen(port);
  console.log('http://' + domain); // http://my-app.dev
});
```

This example assumes that the Pult server is running. For more detailed
examples and better practices, see the [example
documentation](http://cmcenroe.me/pult/example.html).

### From the Command Line

```
npm install -g pult
```

Running `pult` from the command line automatically spawns `pult-server`
if it is not already running.

```sh
ruby-project $ pult rackup # http://ruby-project.dev
other-project $ pult foreman start # http://other-project.dev
```

By default, Pult sets the `PORT` environment variable then spawns your
server process. If your server process takes a port using the `-p` or
`-P` options rather than through `PORT`, simply pass the required option
to Pult:

```sh
website $ pult -P jekyll serve # http://website.dev
```

For more details about the command line implementation, see the [command
line documentation](http://cmcenroe.me/pult/pult.html).

#### Custom domains

By default, Pult uses the name of the current directory to determine
what `.dev` domain to serve from. You can specify a different domain
using the `-n` option:

```sh
node-project $ pult -n my-project node app # http://my-project.dev
```

#### Subdomains

Pult also serves the same application on all subdomains of its `.dev`
domain. For example, `node-project` will be available at
`http://node-project.dev`, `http://www.node-project.dev`, etc.

Pult also allows you to serve different applications on subdomains
simply by specifying the subdomain with `-n`:

```sh
other-project $ pult -n other.project node app # http://other.project.dev
```

#### Configuration

Pult interprets the contents of `.pultrc` in the current directory as
command-line arguments. This allows saving the domain name and command
to run so that bringing a server up on a `.dev` domain is as simple as
running `pult`.

```sh
node-project $ echo "-n my-project node app" > .pultrc
node-project $ pult # node app on http://my-project.dev
```

#### Status

To find out which domains are being forwarded to which ports, simply run
`pult` with no arguments:

```sh
~ $ pult
[pult] next: 7003
[pult] http://node-project.dev --> http://localhost:7001
[pult] http://ruby-project.dev --> http://localhost:7002
```

#### Output

`pult` logs to standard error prefixed with `[pult]`. To disable
logging, pass the `-q` option.

### Server

By default, `pult-server` respawns itself with sudo then forks to the
background. To run `pult-server` as a foreground process, pass the `-f`
option:

```sh
~ $ pult-server -f
```

To stop `pult-server` while it is running in the background, pass the
`-k` option to `pult`:

```sh
~ $ pult-server
~ $ pult -k
```

The default first port that `pult-server` assigns is 7001. To change
this port, pass the `-p` option:

```sh
~ $ pult-server -p 8081
~ $ pult
[pult] next: 8081
```

By default, `pult-server` binds to ports 53 (DNS) and 80 (HTTP) on
`127.0.0.1` (IPv4 localhost). If you are already running these services
on `127.0.0.1` and are using a system that allows the use of the entire
`127.0.0.0/8` range, you can pass the `-l` option to change which host
`pult-server` binds to:

```sh
~ $ pult-server -l 127.1.1.1
```

For more details on the server implementation, see the [server
documentation](http://cmcenroe.me/pult/server.html).

## Similar projects

* [Pow](http://pow.cx/)
  * Advantages:
    * Runs as regular user
    * Allows serving the same application from multiple domains (not
      just subdomains)
  * Disadvantages:
    * OS X only
    * Rack-specific
    * Requires symlinking (explicit setup)
    * Takes over control of your server processes

## Compatibility

Pult is compatible with Linux systems using `/etc/resolv.conf` and with
Mac OS X using `/etc/resolver`.

## License

Copyright © 2014, Curtis McEnroe <programble@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
