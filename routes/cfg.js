function addRepoPRJob(request) {
  ['organization', 'repo', 'project'].forEach(function(param) {
    if (!request.body[param]) {
      throw {
        body: {
          message: 'missing parameter: ' + param
        },
        status: 400
      };
    }
  });

  return {
    'github.config': {
      organization: request.body.organization,
      repo: request.body.repo
    },
    'jenkins.config': {
      project: request.body.project,
      repo: request.body.repo,
      token: request.body.token || false
    }
  };
}

addRepoPRJob.method = 'post';

module.exports = addRepoPRJob;
