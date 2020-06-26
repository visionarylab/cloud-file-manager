var fs = require("fs")

/**
 * ### How to setup local certs: ###
 *
 * 1. install [mkcert](https://github.com/FiloSottile/mkcert) :  `brew install mkcert`
 * 2. Create and install the trusted CA in keychain:   `mkcert -install`
 * 3. Ensure you have a certificate directory: `cd LocalhostCertificates`
 * 4. Make certs: `mkcert -cert-file localhost.crt -key-file localhost.key localhost 127.0.0.1 ::1`
 *
**/

module.exports = {
    cert: fs.readFileSync(__dirname + "/LocalhostCertificates/localhost.crt"),
    key: fs.readFileSync(__dirname + "/LocalhostCertificates/localhost.key")
}
