var gulp = require('gulp');
var config = require('../config');

gulp.task('watch', function() {
    gulp.watch(config.coffeelint.watch,           ['coffeelint']);
    gulp.watch(config.browserify.app.watch,       ['browserify-app']);
    gulp.watch(config.browserify.globals.watch,   ['browserify-globals']);
    gulp.watch(config.css.watch,                  ['css']);
});

gulp.task('build-all', ['coffeelint', 'browserify-app', 'browserify-globals', 'css']);

gulp.task('default', ['build-all', 'watch']);
