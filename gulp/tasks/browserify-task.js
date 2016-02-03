var gulp        = require('gulp');
var browserify  = require('browserify');
var source      = require("vinyl-source-stream");
var coffeeify   = require('coffeeify');
var versionify  = require('package-json-versionify');
var pkgVersion  = require('../../package.json').version;
var gulpif      = require('gulp-if');
var rename      = require('gulp-rename');
var replace     = require('gulp-replace');
var production  = require('../config').production;
var config      = require('../config').browserify;
var flags       = require('../config').flags;
var noMap       = flags && flags.noMap;
var nojQuery    = flags && flags.nojQuery;
var codap       = flags && flags.codap;
var beep        = require('beepbeep');

var errorHandler = function (error) {
  console.log(error.toString());
  beep();
  this.emit('end');
};

gulp.task('browserify-app', function(){
  var b = browserify({
    debug: !production && !noMap,
    extensions: ['.coffee'],
    standalone: "CloudFileManager"
  });
  b.transform(versionify);
  b.transform(coffeeify);
  b.add(config.app.src);
  return b.bundle()
    .on('error', errorHandler)
    .pipe(source('app.js'))
    .pipe(replace(/__PACKAGE_VERSION__/g, pkgVersion))
    .pipe(gulpif(codap, rename('app.js.ignore')))
    .pipe(gulp.dest(config.app.dest));
});

gulp.task('browserify-globals', function(){
  var b = browserify({
    debug: !production && !noMap,
  });
  if(nojQuery) {
    b.exclude('jquery');
  }
  b.transform(coffeeify);
  b.add(config.globals.src);
  return b.bundle()
    .on('error', errorHandler)
    .pipe(source('globals.js'))
    .pipe(gulpif(nojQuery, replace(/(var)*[ ]*jQuery[ ]*=/g,
                                    function(iMatch) {
                                      return '//' + iMatch;
                                    })))
    .pipe(gulpif(codap, rename('globals.js.ignore')))
    .pipe(gulp.dest(config.globals.dest));
});

gulp.task('browserify', ['browserify-app', 'browserify-globals']);
