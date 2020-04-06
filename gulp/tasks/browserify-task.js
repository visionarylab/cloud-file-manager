var gulp        = require('gulp');
var browserify  = require('browserify');
var source      = require("vinyl-source-stream");
var buffer      = require("vinyl-buffer");
var coffeeify   = require('coffeeify');
var versionify  = require('package-json-versionify');
var pkgVersion  = require('../../package.json').version;
var gulpif      = require('gulp-if');
var es          = require('event-stream');
var rename      = require('gulp-rename');
var replace     = require('gulp-replace');
var production  = require('../config').production;
var config      = require('../config').browserify;
var flags       = require('../config').flags;
var noMap       = flags && flags.noMap;
var nojQuery    = flags && flags.nojQuery;
var noPolyfill  = flags && flags.noPolyfill;
var noReact     = flags && flags.noReact;
var codap       = flags && flags.codap;
var beep        = require('beepbeep');

var errorHandler = function (error) {
  console.log(error.toString());
  beep();
  this.emit('end');
};

// replacement for gulp-inject-string which has security vuln
var injectAppend = function(str) {
  return es.map(function (file, cb) {
    try {
      file.contents = new Buffer(String(file.contents) + str);
    } catch (err) {
      return cb(new Error('gulp-inject-string: ' + err));
    }
    cb(null, file);
  });
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
    .pipe(buffer())
    .pipe(replace(/__PACKAGE_VERSION__/g, pkgVersion))
    // add .ignore to the name for CODAP to hide it from the SproutCore build system
    .pipe(gulpif(codap, rename({ extname: '.js.ignore' })))
    // for ease of debugging when loaded dynamically (e.g CODAP)
    .pipe(gulpif(codap, injectAppend('\n//# sourceURL=cfm/app.js.ignore\n')))
    .pipe(gulp.dest(config.app.dest));
});

gulp.task('browserify-globals', function(){
  var b = browserify({
    debug: !production && !noMap,
  });
  if(nojQuery) {
    b.exclude('jquery');
  }
  if(noPolyfill) {
    b.exclude('es6-promise');
  }
  if(noReact) {
    b.exclude('react');
    b.exclude('react-dom');
  }
  b.transform(coffeeify);
  b.add(config.globals.src);
  return b.bundle()
    .on('error', errorHandler)
    .pipe(source('globals.js'))
    .pipe(buffer())
    .pipe(gulpif(nojQuery, replace(/.*?(jQuery|global\.\$)\s*=.*\n?/g,
                                    function(iMatch) {
                                      return '//' + iMatch;
                                    })))
    .pipe(gulpif(noPolyfill, replace(/.*?(es6-promise).*\n?/g,
                                    function(iMatch) {
                                      return '//' + iMatch;
                                    })))
    .pipe(gulpif(noReact, replace(/.*?(React|ReactDOM)\s*=.*\n?/g,
                                    function(iMatch) {
                                      return '//' + iMatch;
                                    })))
    // add .ignore to the name for CODAP to hide it from the SproutCore build system
    .pipe(gulpif(codap, rename({ extname: '.js.ignore' })))
    // for ease of debugging when loaded dynamically (e.g CODAP)
    .pipe(gulpif(codap, injectAppend('\n//# sourceURL=cfm/globals.js.ignore\n')))
    .pipe(gulp.dest(config.globals.dest));
});

gulp.task('browserify', ['browserify-app', 'browserify-globals']);
