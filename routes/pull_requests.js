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

    var statuses = request.query.status && request.query.status.split(',') || ['open'];

    app.db.findRepoPullsByStatuses(request.query.repo, statuses, request.query.limit, function(err, item) {
      if (err) {
        app.log.error('pull_requests query error!', { repo: request.query.repo, statuses: statuses, limit: request.query.limit, err: err });
        response.send(500, response_obj);
        return;
      }

      response_obj.pull_requests = item;

      response.send(200, response_obj);
    });
  });

  return route;
};
