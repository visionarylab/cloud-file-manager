var gulp        = require('gulp');
var production  = require('../config').production;
var commit      = require('../config').commit ;
var date        = require('../config').date;
var config      = require('../config').assets;
var gulpif      = require('gulp-if');
var replace     = require('gulp-replace');

var isHTML = function (file) {
  return /\.html$/.test(file.path);
};

// Copy files directly simple
gulp.task('assets', function() {
  return gulp.src(config.src)
    .pipe(gulpif(isHTML, replace(/__COMMIT__/g,  commit )))
    .pipe(gulpif(isHTML, replace(/__DATE__/g, date)))
    .pipe(gulp.dest(config.dest));
});
