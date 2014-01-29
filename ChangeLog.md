# Change Log

## 0.4.0 (2014-01-28)

* Add `-p` and `-P` options
* Set first port to 7001

## 0.3.2 (2014-01-27)

* Ignore port on Host header (fixes bug if server is accessed at
  `http://foo.dev:80`)

## 0.3.1 (2014-01-27)

* Always proxy to IPv4 (fixes bug where POST body was not being sent to
  IPv4 after it was already sent to IPv6)

## 0.3.0 (2014-01-27)

* Fork `pult-server` to background
* Kill `pult-server` with `pult -k`

## 0.2.2 (2014-01-27)

* Exit after removing `/etc/resolver/dev`

## 0.2.1 (2014-01-27)

* Add OS X support (using `/etc/resolver/dev`)
* Return 502 for unknown hosts

## 0.2.0 (2014-01-27)

* Return 502 with JSON on proxy error
* Add IPv6 HTTP server
* Add websocket support
* Add support for subdomains

## 0.1.0 (2014-01-26)

Initial release