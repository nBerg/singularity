module.exports = (grunt) =>
  plugin = 'grunt-jscs-checker'
  try
    require plugin + "/tasks/lib/jscs.js"
  catch e
    return

  grunt.config.set('jscs',
    main: [
      'libraries/*.js',
      'listeners/*.js',
      'routes/*.js',
      'test/**/*.js'
    ]
    secondary:
      files:
        src: '<%= jscs.main %>'
      options:
        config: '.jscsrc.strict'
  )

  grunt.loadNpmTasks plugin
