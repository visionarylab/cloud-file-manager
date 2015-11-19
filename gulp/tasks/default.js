var gulp = require('gulp');
var config = require('../config');

gulp.task('watch', function() {
    gulp.watch(config.coffeelint.watch,           ['coffeelint']);
    gulp.watch(config.browserify.app.watch,       ['browserify-app']);
    gulp.watch(config.browserify.globals.watch,   ['browserify-globals']);
});

gulp.task('build-all', ['coffeelint', 'browserify-app', 'browserify-globals']);

gulp.task('default', ['build-all', 'watch']);
