module.exports = function() {
  return {
    repo: 'push_repo_owner/push_repo',
    before: 'push_before_sha',
    after: 'push_after_sha',
    actor: 'push_user',
    repo_url: 'https://github.com/push_repo_owner/push_repo',
    base_ref: 'push/repo/ref',
    fork_url: null,
    fork_ref: null,
    status: null,
    repo_id: 987,
    change: 'push_before_sha...push_after_sha',
    change_id: 'push_after_sha',
    type: 'change'
  };
};
