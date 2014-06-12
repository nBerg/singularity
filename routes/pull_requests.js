exports.init = function(app) {
  var route = require('express').Router();

  route.get('/', function(request, response, next) {
    var response_obj = {
      pull_requests: []
    };

    if (!request.query) {
      app.log.error('express.js request obj - no query field...?');
      response.send(500, response_obj);
      return;
    }

    app.db.findRepoPullsByStatuses(request.query, function(err, item) {
      if (err) {
        app.log.error('pull_requests query error!', err);
        response.send(500, response_obj);
        return;
      }

      response_obj.pull_requests = item;

      response.send(200, response_obj);
    });
  });

  route.get('/:id', function(request, response, next) {
    var id = request.params.id;

    app.log.debug('Request received for pull request ' + id);

    app.db.findPullByID(id, function(err, item) {

      if (err) {
        app.log.error('pull_requests query error!', err);
        response.send(500, 'Could not retrieve pull_request ' + id);
      }

      if (!item) {
        app.log.error('Could not find pr with id ' + id);
        response.send(404, 'Pull_request with id ' + id + ' not found');
      }

      response.send(200, item);
    });
  });

  return route;
};
