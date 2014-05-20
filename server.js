"use strict";
var flatiron = require('flatiron'),
    app = flatiron.app;

app.config.file('./config.json');
app.config.defaults({
  port: 80
});

var config = require('./config').config,
    Singularity = require('./libraries/singularity'),
    app = Singularity(config);

app.use(flatiron.plugins.http);
app.attemptDbConfigLoad(function() {
  app.loadListeners([__dirname + '/listeners']);
});

app.singular = new Singularity(app);
app.singular.route({
  '/': require('./routes/hook'),
  '/pull_requests': require('./routes/pull_requests'),
  '/merge': require('./routes/merge'),
  '/config': require('./routes/cfg')
});

var server = app.start(app.config.get('port'), function() {
  app.log.info('Listening on port %d', server.address().port);
});
