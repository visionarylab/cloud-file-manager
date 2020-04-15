const argv = require('yargs').argv
const production = !!argv.production
const src = './src'
const dest = argv.dest ? argv.dest : './dist'
const noGlobals = !!argv.noGlobals // don't generate globals bundle
const noMap = !!argv.noMap // don't generate .map files
const codap = !!argv.codap // include CODAP-specific modifications
const assetsSrc = codap ? src + '/assets/img/*.*' : src + '/assets/**/*.*'
const assetsDst = codap ? dest + '/img/' : dest
const execSync = require('sync-exec')
const commit = execSync('git log -1 --pretty=format:"%H"').stdout
const date = new Date()

module.exports = {
  production,
  date,
  commit,
  flags: {
    noGlobals,
    noMap,
    codap,
    assetsDst,
    assetsSrc
  },
  replacementStrings: [
    {
      pattern: /__COMMIT__/g,
      value: commit
    },
    {
      pattern: /__DATE__/g,
      value: date
    }
  ]
}
