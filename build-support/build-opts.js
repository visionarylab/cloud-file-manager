const execSync = require('sync-exec')
const { env } = process
const production = !!env.production
const src = './src'
const dest = env.dest || './dist'
const noGlobals = !!env.noGlobals // don't generate globals bundle
const noMap = !!env.noMap // don't generate .map files
const codap = !!env.codap // include CODAP-specific modifications
const assetsSrc = codap ? src + '/assets/img/*.*' : src + '/assets/**/*.*'
const assetsDst = codap ? dest + '/img/' : dest

const commitHash = execSync('git log -1 --pretty=format:"%H"').stdout
const date = new Date()

// CODAP builds append '.codap' to js filenames to avoid CODAP compilation
const codapOutputFileName = (webpackChunk) => {
  return webpackChunk.chunk.name.match(/\.js$/) ? '[name].codap': '[name]';
}

const replacementStrings = [
  {
    pattern: /__COMMIT__/g,
    value: commitHash
  },
  {
    pattern: /__DATE__/g,
    value: date
  }
]

const appEntries = {
  'js/app.js': './code/app.coffee',
  'css/app': './style/app.styl'
}

const entry = noGlobals
  ? appEntries
  : { 'js/globals.js': './code/globals.coffee', ...appEntries }

const assets = codap
  ? ['img']
  : ['examples', 'fonts', 'img', 'index.html']

const outputFileName = codap
  ? codapOutputFileName
  : '[name]'

module.exports = {
  production,
  date,
  commitHash,
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
