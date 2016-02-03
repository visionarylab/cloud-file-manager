var argv = require('yargs').argv,
    environment = process.env.ENVIRONMENT || "development",
    production = !!argv.production,
    buildInfo = argv.buildInfo || 'development build (' + (new Date()) + ')',
    src = './src',
    dest  = argv.dest ? argv.dest : './dist',
    noMap = !!argv.noMap,
    nojQuery = !!argv.nojQuery,
    codap = !!argv.codap,
    assetsSrc = codap ? src + '/assets/img/*.*' : src + '/assets/**/*.*',
    assetsDst = codap ? dest + '/img/' : dest;

module.exports = {
  flags: {
    noMap: noMap,
    nojQuery: nojQuery,
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
