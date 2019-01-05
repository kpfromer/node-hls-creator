const gulp = require('gulp');
const ts = require('gulp-typescript');
const nodemon = require('gulp-nodemon');
const rimraf = require('rimraf');

const tsProject = ts.createProject({});

gulp.task('clean', done => rimraf('dist', done));

gulp.task('compile', ['clean'], () =>
  gulp.src('./src/**/*.ts')
    .pipe(tsProject())
    .pipe(gulp.dest('dist'))
);

gulp.task('watch', ['compile'], () => 
  nodemon({
    script: 'dist/main.js',
    tasks: ['compile'],
    watch: ['./src']
  })
);