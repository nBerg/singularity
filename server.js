"use strict";
var flatiron = require('flatiron'),
    app = flatiron.app;

app.config.file('./config.json');
app.config.defaults({
  port: 80
});

var singularity = require('./libraries/singularity');

app.use(flatiron.plugins.http);
app.attemptDbConfigLoad(function() {
  app.loadListeners([__dirname + '/listeners']);
});

app.use(require('./plugin/github'));

var server = app.start(app.config.get('port'), function() {
  singularity.route({
    '/': require('./routes/hook'),
    '/pull_requests': require('./routes/pull_requests'),
    '/merge': require('./routes/merge'),
    '/config': require('./routes/cfg')
  });

  app.log.info('Listening on port %d', server.address().port);
});
