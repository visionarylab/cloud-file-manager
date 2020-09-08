const execSync = require('sync-exec')
const packageJSON = require('../package.json')
const { env } = process
const codap = !!env.codap // include CODAP-specific modifications

const commitHash = execSync('git log -1 --pretty=format:"%H"').stdout
const date = new Date()
const version = packageJSON.version

const replacementStrings = {
  html: [
    {
      search: /__VERSION__/g,
      replace: version
    },
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

const assets = codap
  ? ['img']
  : ['autolaunch', 'examples', 'favicon.ico', 'fonts', 'img', 'index.html']

module.exports = {
  assets,
  replacementStrings
}
