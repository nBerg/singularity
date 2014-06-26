module.exports = function() {
  return {
    repo: 'foo/bar',
    before: 'pr_base_sha',
    after: 'pr_head_sha',
    actor: 'pr_foo_user',
    repo_url: 'git@github.com:foo/bar',
    base_ref: 'refs/heads/master',
    fork_url: 'git@github.com:forker/bar',
    fork_ref: 'pr/fork/branch',
    status: 'open',
    repo_id: 123,
    change: 1,
    change_id: 321,
    type: 'proposal'
  };
};
