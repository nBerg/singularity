exports.init = function(app) {
  var route = require('express').Router();

  route.get('/', function(request, response, next) {
    var response_obj = {
      message: 'received',
      error: false
    };

    if (!request.query) {
      response_obj.message = 'No query params.';
      response_obj.error = true;
      response.send(501, response_obj);
      return;
    }

    else if (!request.query.repo || !request.query.number) {
      response_obj.message = 'missing either "repo" or "number" parameters.';
      response_obj.error = true;
      response.send(501, response_obj);
      return;
    }

    app.db.findPullByRepoId(request.query.number, request.query.repo, function(err, item) {
      if (err) {
        app.log.error(err);
        response_obj.message = JSON.stringify(err);
        response_obj.error = true;
        response.send(500, response_obj);
        return;
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.write(JSON.stringify(item));
      response.end();
    });
  });

  return route;
};
