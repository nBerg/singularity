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

app.get('/pull_requests', function(request, response) {
  require('./routes/pull_requests').init(app, request, response);
});

app.post('/merge', function(request, response) {
  require('./routes/merge').init(app, request, response);
});

// START
var server = app.listen(config.port || 80, function() {
    app.log.info('Listening on port %d', server.address().port);
});
