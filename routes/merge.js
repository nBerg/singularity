var GithubApi = require('github');

exports.init = function(app, request, response) {
  var response_obj = {
    message: 'received',
    error: false
  };

  if (!request.query) {
    response_obj.error = true;
    response_obj.message = 'No parameters given';
    response.send(501, response_obj);
    return;
  }

  ['username', 'token', 'organization', 'repo', 'number'].forEach(function(param) {
    if (!request.query[param]) {
      response_obj.error = true;
      response_obj.message = 'missing parameter: ' + param;
      response.send(403, response_obj);
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
  }, function(err, res) {
    if (err || res.error === true) {
      response_obj.error = true;
      response_obj.message = res ? JSON.stringify(res) : JSON.stringify(err);
      response.send(500, response_obj);
      return;
    }

    response_obj.message = res;
    response.send(200, response_obj);
  });
};
