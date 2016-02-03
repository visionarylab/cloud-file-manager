var gulp       = require('gulp');
var gulpif     = require('gulp-if');
var config     = require('../config').css;
var stylus     = require('gulp-stylus');
var concat     = require('gulp-concat');
var replace	   = require('gulp-replace');
var flags	   = require('../config').flags;
var codap	   = flags && flags.codap;

gulp.task('css', function() {
  gulp.src(config.src)
    .pipe(stylus({ compress: false}))
    .pipe(concat('app.css'))
    .pipe(gulpif(codap, replace('url(', 'static_url(')))
    .pipe(gulpif(codap, replace('../fonts', 'webfonts')))
    .pipe(gulpif(codap, replace('MuseoSans_500_italic', 'MuseoSans_500_Italic')))
    .pipe(gulpif(codap, replace('?ndvjg4', '')))
    .pipe(gulpif(codap, replace('../img', 'cloud-file-manager/img')))
    .pipe(gulp.dest(config.dest));
});
