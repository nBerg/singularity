fs = require 'fs'
path = require 'path'

module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    options:
      tasksDir: 'tasks'

  fs.readdirSync(grunt.config 'options.tasksDir')
    .filter (file) =>
      return /\.(js|coffee)$/.test file
    .forEach (file) =>
      filename = path.join grunt.config('options.tasksDir'), file
      task = require(path.resolve __dirname, filename)
      task grunt

  grunt.registerTask 'sniff', ['jscs:main']
  grunt.registerTask 'lint', ['jshint', 'jscs:main']
  grunt.registerTask 'test', ['lint', 'mochaTest']
