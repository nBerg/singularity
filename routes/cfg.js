var bodyParser = require('body-parser');

exports.init = function(app) {
  app.use(bodyParser());

  var route = require('express').Router();

  route.get('/', function(request, response, next) {
    response.send(200, app.getConfig());
  });

  route.post('/pull_request', function(request, response, next) {
    var response_obj = {
      success: true
    };

    ['organization', 'repo', 'project'].forEach(function(param) {
      if (!request.body[param]) {
        app.log.error('missing parameter: ' + param);
        response_obj.success = false;
        response.send(400, response_obj);
        return;
      }
    });

    app.addRepoPRJob(request.body);
    response.send(200, response_obj);
  });

  return route;
};
