"use strict";

var config = require('./config').config,
    Singularity = require('./libraries/singularity'),
    Db = require('./libraries/db'),
    app = Singularity(config);

app.db = Db.init(config.db, app.log);

app.loadListeners([__dirname + '/listeners']);

// ROUTES
app.post('/', function(request, response) {
  require('./routes/hook').init(app, request, response);
});

app.use('/pull_requests', require('./routes/pull_requests').init(app));
app.use('/merge', require('./routes/pull_requests').init(app));
app.use('/config', require('./routes/cfg').init(app));

var server = app.listen(config.port || 80, function() {
  app.log.info('Listening on port %d', server.address().port);
});
