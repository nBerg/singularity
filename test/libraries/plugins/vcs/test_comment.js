module.exports = function() {
  return {
    __headers: {
      'x-github-event': 'issue_comment'
    },
    repository: {
      id: 567,
      name: 'comment_repo',
      url: 'https://github.com/comment_repo_owner/comment_repo',
      owner: {
        name: 'comment_repo_owner'
      }
    },
    comment: {
      body: 'replace this field for tests'
    },
    issue: {
      pull_request: {
        html_url: 'https://github.com/comment_owner/comment_repo'
      }
    }
  };
};
