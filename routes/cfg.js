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
        response.send(400, response_obj);
        return;
      }
    });

    app.addRepoPRJob(request.body);
    response.send(200, response_obj);
  });

  route.post('/push', function(request, response, next) {
    var response_obj = {
      success: true
    };

    ['organization', 'repo', 'project'].forEach(function(param) {
      if (!request.body[param]) {
        app.log.error('missing parameter: ' + param);
        response.send(400, response_obj);
        return;
      }
    });

    if (!request.body.rules) {
      request.body.rules = ['^master$'];
    }
    else {
      request.body.rules = request.body.rules.split(',');
    }

    app.addRepoPushJob(request.body);
    response.send(200, response_obj);
  });

  route.post('/remove_project', function(request, response, next) {
    var response_obj = {
      success: true
    };
    app.removeProjectConfigs(request.body.project);
    response.send(200, response_obj);
  });

  route.post('/remove_push_projects', function(request, response, next) {
    var response_obj = {
      success: true
    };
    app.removePushProjectConfigs();
    response.send(200, response_obj);
  });

  route.post('/remove_pull_projects', function(request, response, next) {
    var response_obj = {
      success: true
    };
    app.removePullProjectConfigs();
    response.send(200, response_obj);
  });

  route.post('/remove_repo', function(request, response, next) {
    var response_obj = {
      success: true
    };
    if (!request.body.repo) {
      response_obj.success = false;
      response_obj.message = 'missing repo param';
      response.send(400, response_obj);
      return;
    }
    app.removeRepoConfigs(request.body.repo);
    response.send(200, response_obj);
  });

  return route;
};
