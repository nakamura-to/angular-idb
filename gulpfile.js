var gulp = require('gulp');
var path = require('path');
var gutil = require('gulp-util');
var changed = require('gulp-changed');
var pkg = require('./package.json');

// CONFIG
//
var src = {
  cwd: 'src',
  scripts: '**/*.js',
};

var spec = {
  cwd: 'test/spec',
  scripts: '**/*.js',
};

// TEST
//
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
gulp.task('jshint', function() {
  gulp.src(src.scripts, {cwd: src.cwd})
    .pipe(changed(src.scripts))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
  gulp.src(spec.scripts, {cwd: spec.cwd})
    .pipe(changed(src.scripts))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});
var karma = require('karma').server;
gulp.task('karma:unit', function() {
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    reporters: ['dots', 'junit'],
    singleRun: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});
gulp.task('karma:chrome', function() {
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    browsers: ['Chrome'],
    reporters: ['notify', 'spec'],
    autoWatch: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});
gulp.task('karma:firefox', function() {
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    browsers: ['Firefox'],
    reporters: ['notify', 'spec'],
    autoWatch: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});
gulp.task('karma:ie', function() {
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    browsers: ['IE'],
    reporters: ['notify', 'spec'],
    autoWatch: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});
gulp.task('karma:safari', function() {
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    browsers: ['Safari'],
    reporters: ['notify', 'spec'],
    autoWatch: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});

// DEFAULT
//
var runSequence = require('run-sequence');
gulp.task('default', ['test']);
gulp.task('test', function() {
  runSequence('jshint', 'karma:unit');
});
gulp.task('test:server', function() {
  runSequence('karma:server');
});