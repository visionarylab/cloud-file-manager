var gulp = require('gulp');
var config = require('../config');
var flags = require('../config').flags;
var noGlobals = flags && flags.noGlobals;
var _globals = !noGlobals;

gulp.task('watch', function() {
    gulp.watch(config.coffeelint.watch,           ['coffeelint']);
    gulp.watch(config.browserify.app.watch,       ['browserify-app']);
    _globals && gulp.watch(config.browserify.globals.watch,
                                                  ['browserify-globals']);
    gulp.watch(config.css.watch,                  ['css']);
    gulp.watch(config.assets.watch,               ['assets']);
});

var buildAllTasks = ['coffeelint'];
_globals && buildAllTasks.push('browserify-globals');
buildAllTasks.push('browserify-app', 'css', 'assets');
gulp.task('build-all', buildAllTasks);

gulp.task('default', ['build-all', 'watch']);
