module.exports = (grunt) =>
  plugin = 'grunt-mocha-test'
  try
    require plugin + "/tasks/mocha-test.js"
  catch e
    return

  grunt.config.set('mochaTest',
      test:
        options:
          reporter: 'spec'
        src: ['test/**/*.js']
  )

  grunt.loadNpmTasks plugin
