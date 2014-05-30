var bodyParser = require('body-parser');

exports.init = function(app) {
  app.use(bodyParser());

  var route = require('express').Router();

  route.post('/', function(request, response, next) {
    var response_obj = {
      success: true
    };

    ['organization', 'repo', 'pull_request', 'message'].forEach(function(param) {
      if (!request.body[param]) {
        app.log.error('missing parameter: ' + param);
        response.send(400, response_obj);
        return;
      }
    });

    app.emit('pull.comment', request.body);
    response.send(200, response_obj);
  });

  return route;
};
