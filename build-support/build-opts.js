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

// CODAP builds append '.ignore' to js filenames to avoid CODAP compilation
const codapOutputFileName = (webpackChunk) => {
  return webpackChunk.chunk.name.match(/\.js$/) ? '[name].ignore': '[name]'
}

const replacementStrings = {
  html: [
    {
      search: /__COMMIT__/g,
      replace: commitHash
    },
    {
      search: /__DATE__/g,
      replace: date.toString()
    }
  ],
  css: [],
  js: []
}

if (codap) {
  replacementStrings.css.push(
    {
      search: /url\(/g,
      replace: 'static_url('
    },
    {
      search: /\.\.\/fonts/g,
      replace: 'webfonts'
    },
    {
      search: /MuseoSans_500_italic/g,
      replace: 'MuseoSans_500_Italic'
    },
    {
      search: /\.\.\/img/g,
      replace: 'cloud-file-manager/img'
    }
  )
}

const appEntries = {
  'js/app.js': './code/app.jsx',
  'css/app': './style/app.styl'
}

const entry = noGlobals
  ? appEntries
  : { 'js/globals.js': './code/globals.js', ...appEntries }

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
