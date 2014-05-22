"use strict";
var flatiron = require('flatiron'),
    app = flatiron.app;

// configure & init the flatiron app *then* instantiate singularity
// init() instantiates the logs
// also, because singletons, and I hate everything
app.use(flatiron.plugins.http);
app.config.file('./config.json');
app.config.defaults({
  port: 8080,
  log: {
    console: {
      level: 'debug',
      colorize: true
    }
  }
});

app.init();

var singularity = require('./libraries/singularity');
var server = app.start(app.config.get('port'), function() {
  singularity.injectFlatironPlugins(__dirname + '/plugins');
  singularity.route({
    '/hook': require('./routes/hook'),
    '/config': require('./routes/cfg'),
    '/pull_requests': require('./routes/pull_requests'),
    '/merge': require('./routes/merge')
  });

  app.log.info('Listening on port %d', app.config.get('port'));
});
