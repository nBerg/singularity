"use strict";

var config = require('./config').config,
    Singularity = require('./libraries/singularity'),
    Db = require('./libraries/db'),
    app = Singularity(config);

app.db = Db.init(config.db);

app.loadListeners([__dirname + '/listeners']);

// ROUTES
app.post('/', function(request, response) {
  require('./routes/hook').init(app, request, response);
});

app.get('/pr', function(request, response) {
  require('./routes/pullrequest').init(app, request, response);
});

app.post('/merge', function(request, response) {
  require('./routes/merge').init(app, request, response);
});

// START
var server = app.listen(config.port || 80, function() {
    app.log.info('Listening on port %d', server.address().port);
});
