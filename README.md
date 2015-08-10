# Pult

[![npm](https://img.shields.io/npm/v/pult.svg)][npm]

[npm]: https://npmjs.com/package/pult

Access local servers on .dev domains.

Pult makes local app servers available on `.dev` domains by running a local DNS
server and HTTP reverse-proxy.

## Install

```sh
npm install -g pult
```

## Usage

```sh
node-project $ pult npm start # http://node-project.dev
ruby-project $ pult rackup # http://ruby-project.dev
jekyll-site $ pult -P jekyll serve # http://jekyll-site.dev
static-site $ pult -s # http://static-site.dev
```

Pult will first launch its server if it is not already running, then launch the
app server.

By default, Pult passes the port to the server process through the `PORT`
environment variable. Passing `--port`, `-p` or `-P` passes the port through the
corresponding option (required for Jekyll).

For static sites, the `-s` option starts a static HTTP server in the current
directory.

### Domains

Pult by default serves the app from a `.dev` domain of the current directory.
This can be changed with the `-n` option:

```sh
pult -n example # http://example.dev
```

Pult also serves the app on any subdomain of the `.dev` domain. To serve
different apps on subdomains, pass the subdomain with `-n`.

### Configuration

Command line options can be saved in `.pultrc` files that will be read from the
current directory.

```sh
echo "-n example npm start" > .pultrc
pult # http://example.dev
```

### Status

Invoking `pult` with no arguments lists the domains Pult is serving and the
local ports they are being forwarded to.

```
[pult] next: 7003
[pult] http://example.dev --> http://localhost:7001
[pult] http://static.dev --> http://localhost:7002
```

### Server

The Pult Server consists of a DNS server for resolving `.dev` domains and an
HTTP server to reverse-proxy the `.dev` domains to app servers.

`pult` will launch `pult-server` automatically, but it can also be run manually.

The default behavior is for `pult-server` to respawn itself with `sudo`, then
fork to the background. To run `pult-server` in the foreground, pass `-f`.

```sh
pult-server -f
```

To stop `pult-server` while it is in the background, pass `-k` to `pult`.

```sh
pult-server
pult -k
```

The default first port that `pult-server` assigns is 7001. This can be changed
by passing `-p`.

```sh
pult-server -p 8081
```

The default bind address of `pult-server` for both DNS (port 53) and HTTP (port
80) is `127.0.0.1`. A different address can be passed with the `-l` option.

```sh
pult-server -l 127.1.1.1
```

### Library

Pult can be used as a Node.js library. See the [documentation][docs].

[docs]: https://cmcenroe.me/pult

## Compatibility

- Linux, through `/etc/resolv.conf`
- OS X, through `/etc/resolver`

## Similar projects

* [Pow](http://pow.cx/)
  * Advantages:
    * No `sudo` required
    * Serves the same app on multiple domains
  * Disadvantages:
    * OS X-specific
    * Rack-specific
    * Explicit setup (through symlinks)
    * No control over app server processes

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
