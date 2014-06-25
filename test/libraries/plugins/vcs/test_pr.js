module.exports = function() {
  return {
    __headers: {
      'x-github-event': 'pull_request'
    },
    merged: false,
    state: 'open',
    number: 1,
    id: 321,
    base: {
      ref: 'refs/heads/master',
      sha: 'pr_base_sha',
      repo: {
        id: 123,
        full_name: 'foo/bar',
        ssh_url: 'git@github.com:foo/bar'
      }
    },
    head: {
      ref: 'pr/fork/branch',
      sha: 'pr_head_sha',
      repo: {
        ssh_url: 'git@github.com:forker/bar'
      }
    },
    user: {
      login: 'pr_foo_user'
    }
  };
};
