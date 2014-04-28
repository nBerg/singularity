exports.init = function(app) {
  var route = require('express').Router();

  route.get('/', function(request, response, next) {
    response.send(200, app.getConfig());
  });

  return route;
};
