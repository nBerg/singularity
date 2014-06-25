module.exports = function() {
  return {
    __headers: {
      'x-github-event': 'push'
    },
    ref: 'push/repo/ref',
    before: 'push_before_sha',
    after: 'push_after_sha',
    repository: {
      id: 987,
      name: 'push_repo',
      url: 'https://github.com/push_repo_owner/push_repo',
      owner: {
        name: 'push_repo_owner'
      }
    },
    pusher: {
      name: 'push_user'
    },
    compare: 'https://github.com/push_repo_owner/push_repo/compare/push_before_sha...push_after_sha'
  };
};
