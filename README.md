# Pult [![NPM version](https://badge.fury.io/js/pult.png)](http://badge.fury.io/js/pult)

Access local servers on .dev domains.

## How do I get it?

```
npm install -g pult
```

## How do I use it?

```sh
~ $ pult-server
node-project $ pult node app # available at http://node-project.dev
ruby-project $ pult rackup   # available at http://ruby-project.dev
```

By default, Pult sets the `PORT` environment variable then spawns your
server process. If your server process takes a port using the `-p` or
`-P` options rather than through `PORT`, simply pass the required option
to Pult:

```sh
website $ pult -P jekyll serve
```

### Custom domains

By default, Pult uses the name of the current directory to determine
what `.dev` domain to serve from. You can specify a different domain
using the `-n` option:

```sh
node-project $ pult -n my-project node app # available at http://my-project.dev
```

You can also set the domain in the `.pult` file of the current
directory:

```sh
node-project $ echo 'my-project' > .pult
node-project $ pult node app # available at http://my-project.dev
```

### Subdomains

Pult also serves the same application on all subdomains of its `.dev`
domain. For example, `node-project` will be available at
`http://node-project.dev`, `http://www.node-project.dev`, etc.

Pult also allows you to serve different applications on subdomains
simply by specifying the subdomain with `-n` or in the `.pult` file:

```sh
other-project $ pult -n other.project node app # available at http://other.project.dev
```

### Status

To find out which domains are being forwarded to which ports, simply run
`pult` with no arguments:

```sh
~ $ pult
pult.dev 80
node-project.dev 7000
ruby-project.dev 7001
```

### Server

By default, `pult-server` spawns itself with sudo then forks to the
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

## How does it work?

1. `pult-server` spawns itself with `sudo`
2. `pult-server` starts a DNS server
3. `pult-server` adds itself to `/etc/resolv.conf`
4. `pult-server` starts an HTTP server
5. `pult` requests a port for the application
  1. `pult-server` finds or assigns a new port for the domain
  2. `pult-server` begins responding to DNS queries for the domain
  3. `pult-server` begins reverse-proxying HTTP for the domain to the
     port
  4. `pult-server` returns the port to `pult`
6. `pult` sets the `PORT` environment variable
7. `pult` spawns `node app`

Pult assigns ports sequentially starting from 7000.

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

Pult has been tested on:

* Ubuntu 13.10
* Mac OS X 10.9.1
* Arch Linux (2014-01-26)

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
