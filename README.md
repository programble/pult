# Pult

Access local servers on .dev domains.

## How do I get it?

```
npm install -g pult
```

## How do I use it?

```
~ $ pult-server
node-project $ pult node app # available at http://node-project.dev
ruby-project $ pult rackup   # available at http://ruby-project.dev
```

### Custom domains

By default, Pult uses the name of the current directory to determine
what `.dev` domain to serve from. You can specify a different domain
using the `-n` option:

```
node-project $ pult -n my-project node app # available at http://my-project.dev
```

You can also set the domain in the `.pult` file of the current
directory:

```
node-project $ echo 'my-project' > .pult
node-project $ pult node app # available at http://my-project.dev
```

### Subdomains

Pult also serves the same application on all subdomains of its `.dev`
domain. For example, `node-project` will be available at
`http://node-project.dev`, `http://www.node-project.dev`,
`http://assets.node-project.dev`, etc.

Pult also allows you to serve different applications on subdomains
simply by specifying the subdomain with `-n` or in the `.pult` file:

```
other-project $ pult -n other.node-project node app # available at http://other.node-project.dev
```

## How does it work?

1. `pult-server` spawns itself with `sudo`
2. `pult-server` starts a DNS server
3. `pult-server` adds itself to `/etc/resolv.conf`
4. `pult-server` starts an HTTP server
5. `pult` requests port for current working directory
  1. `pult-server` finds or assigns a new port for the domain
  2. `pult-server` begins responding to DNS requests for the domain
  3. `pult-server` begins reverse-proxying HTTP for the domain to the
     port
  4. `pult-server` returns the port to `pult`
6. `pult` sets the `PORT` environment variable
7. `pult` spawns `node app`

## Similar projects

* [Pow](http://pow.cx/)
  * Advantages:
    * Runs as regular user
  * Disadvantages:
    * OS X only
    * Rack-specific
    * Requires symlinking (explicit setup)

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
