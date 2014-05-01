exports.init = function(app) {
  var route = require('express').Router();

  route.get('/', function(request, response, next) {
    response.send(200, app.getConfig());
  });

  route.post('/pull_request', function(request, response, next) {
    var response_obj = {
      success: true
    };

    ['organization', 'repo', 'project'].forEach(function(param) {
      if (!request.query[param]) {
        app.log.error('missing parameter: ' + param);
        response.send(400, response_obj);
        return;
      }
    });

    app.addRepoJobPair(request.query);
    response.send(200, response_obj);
  });

  return route;
};
