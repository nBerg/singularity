module.exports = (grunt) =>
  plugin = 'grunt-contrib-jshint'
  try
    require plugin + "/tasks/jshint.js"
  catch e
    return

  grunt.config.set('jshint',
    options:
      jshintrc: true
    files: [
      'plugins/*.js',
      'libraries/*.js',
      'listeners/*.js',
      'routes/*.js',
      'test/**/*.js'
    ]
  )

  grunt.loadNpmTasks plugin
