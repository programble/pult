# Pult

Access local servers on .dev domains.

## How do I use it?

```
~ $ pult-server
node-project $ pult node app # available at http://node-project.dev/
ruby-project $ pult rackup   # available at http://ruby-project.dev/
```

## How do I get it?

```
npm install -g pult
```

## How do I use it even more?

```
node-project $ pult -n my-project node app # available at http://my-project.dev/
node-project $ echo "my-project" > .pult
node-project $ pult node app               # available at http://my-project.dev/
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
    * Requires symlinking

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
