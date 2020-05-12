var fs = require("fs")

module.exports = {
    cert: fs.readFileSync(__dirname + "/LocalhostCertificates/localhost.crt"),
    key: fs.readFileSync(__dirname + "/LocalhostCertificates/localhost.key"),
    ca: [ fs.readFileSync(__dirname + "/LocalhostCertificates/localhost.root.pem") ]
}
