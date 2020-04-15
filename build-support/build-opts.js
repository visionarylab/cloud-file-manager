const execSync = require('sync-exec')
const { env } = process
const { CodapOutputFilename } = require('./codap-output-file-name')
const production = !!env.production
const src = './src'
const dest = env.dest ? env.dest : './dist'
const noGlobals = !!env.noGlobals // don't generate globals bundle
const noMap = !!env.noMap // don't generate .map files
const codap = !!env.codap // include CODAP-specific modifications
const assetsSrc = codap ? src + '/assets/img/*.*' : src + '/assets/**/*.*'
const assetsDst = codap ? dest + '/img/' : dest

const commit = execSync('git log -1 --pretty=format:"%H"').stdout
const date = new Date()

const replacementStrings = [
  {
    pattern: /__COMMIT__/g,
    value: commit
  },
  {
    pattern: /__DATE__/g,
    value: date
  }
]

const entry = codap
  ? {
    'js/app.js': './code/app.coffee',
    'css/app': './style/app.styl'
  }
  : {
    'js/app.js': './code/app.coffee',
    'js/globals.js': './code/globals.coffee',
    'css/app': './style/app.styl'
  }

const assets = codap
  ? ['img']
  : ['examples', 'fonts', 'img', 'index.html']

const outputFileName = codap
  ? CodapOutputFilename
  : '[name]'

module.exports = {
  production,
  date,
  commit,
  entry,
  dest,
  assets,
  outputFileName,
  flags: {
    noGlobals,
    noMap,
    codap,
    assetsDst,
    assetsSrc
  },
  replacementStrings
}
