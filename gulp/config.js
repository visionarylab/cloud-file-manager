var argv = require('yargs').argv,
    production = !!argv.production,
    src = './src',
    dest  = argv.dest ? argv.dest : './dist', // configure destination folder
    noMap = !!argv.noMap,       // don't generate .map files
    nojQuery = !!argv.nojQuery, // don't include jQuery
    noReact = !!argv.noReact, // don't include React
    codap = !!argv.codap,       // include CODAP-specific modifications
    assetsSrc = codap ? src + '/assets/img/*.*' : src + '/assets/**/*.*',
    assetsDst = codap ? dest + '/img/' : dest,
    execSync = require('sync-exec'),
    commit = execSync('git log -1 --pretty=format:"%H"').stdout;

module.exports = {
  production: production,
  date: new Date(),
  commit: commit,
  flags: {
    noMap: noMap,
    nojQuery: nojQuery,
    noReact: noReact,
    codap: codap
  },
  browserify: {
    app: {
      watch: ['./package.json', src + '/code/**/*.*', '!' + src + '/code/globals.coffee'],
      src: ['./package.json', src + '/code/app.coffee'],
      dest: dest + '/js/'
    },
    globals: {
      watch: src + '/code/globals.coffee',
      src: src + '/code/globals.coffee',
      dest: dest + '/js/'
    }
  },
  coffeelint: {
    watch: src + '/code/**/*.coffee',
    src: src + '/code/**/*.coffee',
  },
  css: {
    watch: src + '/style/**/*.styl',
    src: src + '/style/**/app.styl',
    dest: dest + '/css/'
  },
  assets: {
    watch: assetsSrc,
    src: assetsSrc,
    dest: assetsDst
  },
  deploy: {
    src: dest + '/**/*'
  }
};
