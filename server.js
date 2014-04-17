"use strict";

var config = require('./config').config,
    db =  require('./db'),
    fs = require('fs'),
    events = require('events'),
    winston = require('winston'),
    express = require('express'),
    range_check = require('range_check'),
    app = express();

app.log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ level: config.log_level })
  ]
});
app.log.cli();

if (config.db) {
  app.db = db.init();
}
else {
  app.log.info('WARNING: No db config found!');
}

config.plugin_dirs.forEach(function(dir) {
    fs.readdir(dir, function(err, files) {
        if (err) {
            app.log.error(err);
            process.exit(1);
        }

        for (var i = 0, l = files.length; i < l; i++) {
            var filename = dir + files[i],
                pluginName = files[i].split('.', 2)[0];

            if (!filename.match(/\.js$/)) {
                continue;
            }

            if (!config.plugins) {
                app.log.info('No plugin configurations found');
                process.exit(0);
            }

            if (!config.plugins[pluginName]) {
                app.log.info('No configuration for ' + pluginName + ', not loading');
                continue;
            }

            var pluginEnabled = config.plugins[pluginName].enabled;

            if (pluginEnabled == undefined || pluginEnabled) {
                app.log.info('Loading plugin: ' + pluginName);
                require(filename).init(config.plugins[pluginName], app);
            } else {
                app.log.info('Not loading disabled plugin ' + pluginName);
            }
        }
    });
});

// We only want to accept local requests and GitHub requests. See the Service Hooks
// page of any repo you have admin access to to see the list of GitHub public IPs.
var allowed_ips = [ '127.0.0.1' ],
    allowed_ranges = [ '207.97.227.253/32', '50.57.128.197/32', '108.171.174.178/32', '50.57.231.61/32', '204.232.175.64/27', '192.30.252.0/22' ],
    allowed_events = [ 'pull_request', 'issue_comment', 'push' ];

// all webhooks here
app.post('/', function(request, response) {
    if (allowed_ips.indexOf(request.connection.remoteAddress) == -1) {
        var allowed = false;
        for (var i in allowed_ranges) {
            if (range_check.in_range(request.connection.remoteAddress, allowed_ranges[i])) {
                allowed = true;
            }
        }

        if (!allowed) {
            app.log.debug('Received post from blocked ip: ' + request.connection.remoteAddress);
            response.writeHead(403, { 'Content-Type': 'text/plain' });
            response.end();
            return;
        }
    }

    if (typeof request.headers['x-github-event'] == 'undefined' || allowed_events.indexOf(request.headers['x-github-event']) == -1) {
        app.log.debug('Received post for unsupported event: ' + request.headers['x-github-event']);
        response.writeHead(501, { 'Content-Type': 'text/plain' });
        response.write('Unsupported event type');
        response.end();
        return;
    }

    var data = '';
    request.on('data', function(chunk) {
        data += chunk.toString();
    });

    request.on('end', function() {
        app.log.debug('Received post for event: ' + request.headers['x-github-event']);
        app.emit(request.headers['x-github-event'], JSON.parse(data));
    });

    response.writeHead(200, { "Content-Type": "text/plain" });
    response.write('received');
    response.end();
});

app.get('/pr', function(request, response) {

  if (!request.query) {
    response.writeHead(501, { 'Content-Type': 'text/plain' });
    response.write('No query params.');
    response.end();
    return;
  }

  else if (!request.query.repo || !request.query.number) {
    response.writeHead(501, { 'Content-Type': 'text/plain' });
    response.write('Missing either "repo" or "number" parameters.');
    response.end();
    return;
  }

  app.db.findPull(parseInt(request.query.number), request.query.repo, function(err, item) {
    if (err) {
      app.log.error(err);
      response.writeHead(500, { 'Content-Type': 'text/plain' });
      response.end();
    }

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write(JSON.stringify(item));
    response.end();

  });
});

var server = app.listen(config.port || 80, function() {
    console.log('Listening on port %d', server.address().port);
});
