"use strict";

var config = require('./config').config,
    Singularity = require('./libraries/singularity'),
    app = Singularity(config);

app.attemptDbConfigLoad(function() {
  app.loadListeners([__dirname + '/listeners']);
});

// ROUTES
app.post('/', function(request, response) {
  require('./routes/hook').init(app, request, response);
});

app.use('/pull_requests', require('./routes/pull_requests').init(app));
app.use('/merge', require('./routes/merge').init(app));
app.use('/config', require('./routes/cfg').init(app));
app.use('/comment', require('./routes/comment').init(app));

var server = app.listen(config.port || 80, function() {
  app.log.info('Listening on port %d', server.address().port);
});
