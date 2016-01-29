var gulp        = require('gulp');
var ghPages     = require('gulp-gh-pages');
var del         = require('del');
var runSequence = require('run-sequence');
var config      = require('../config').deploy;

gulp.task('clean', function() {
    return del([config.src], { force: true });
});

gulp.task('clean-and-build', function(callback) {
    runSequence('clean', 'build-all', callback);
});

gulp.task('deploy', ['clean-and-build'], function() {
  return gulp.src(config.src)
    .pipe(ghPages());
});
