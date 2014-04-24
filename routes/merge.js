exports.init = function(app) {
  var route = require('express').Router(),
      GithubApi = require('github');

  route.post('/', function(request, response, next) {
    var response_obj = {
      merge: {}
    };

    if (!request.query) {
      app.log.error('express.js request obj - no query field...?');
      response.send(501, response_obj);
      return;
    }

    ['username', 'token', 'organization', 'repo', 'number'].forEach(function(param) {
      if (!request.query[param]) {
        app.log.error('missing parameter: ' + param);
        response.send(403, response_obj);
        return;
      }
    });

    var api = new GithubApi({
      version: '3.0.0',
      host: null,
      port: null
    });

    api.authenticate({
      type: 'oauth',
      username: request.query.username,
      token: request.query.token
    });

    api.pullRequests.merge({
      user: request.query.organization,
      repo: request.query.repo,
      number: request.query.number,
    },
    function(err, res) {
      if (err || res.error === true) {
        app.log.error('query error', { error: err, result: res });
        response.send(500, response_obj);
        return;
      }

      app.db.insertMerge(request.query.organization, request.query.repo, request.query.number, request.query.username, res);

      response_obj.merge = res;
      response.send(200, response_obj);
    });
  });

  return route;
};
