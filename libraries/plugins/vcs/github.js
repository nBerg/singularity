var GitHubApi = require('github'),
async = require('async'),
q = require('q'),
allowed_events = ['issue_comment', 'pull_request', 'push'],
allowed_pr_actions = ['synchronize', 'opened'],
VcsPayload = require('../../payloads/vcs').VcsPayload;

// wrapper functions for logging messages, cause...I haven't even started
// thinking of a way to standardize logging...
function logMsg(message) { return '[vcs.github] ' + message; }
function throwError(message) { throw logMsg(message); }

/**
 * Validates that a given payload is ok to parse / use, returns it
 *
 * @param {Object} payload Raw github event with a __headers array appended from
 *                         the HTTP Payload object
 * @return {Object} the same payload
 */
function validateGithubPayload(payload) {
  if (!payload.__headers) {
    throwError('invalid payload - no __headers field');
  }
  if (!payload.__headers['x-github-event']) {
    throwError('not a github event, ignoring');
  }
  if (!~allowed_events.indexOf(payload.__headers['x-github-event'])) {
    throwError(
      'unrecognized event "' +
      payload.__headers['x-github-event'] +
      '"'
    );
  }
  return payload;
}

/**
 * Generates a VCS Payload from a push
 *
 * @param {Object} push github push payload
 * @return {Object} VCS Payload
 */
function payloadFromPush(push) {
  var payload = {
    repo: push.repository.owner.name + '/' + push.repository.name,
    before: push.before,
    after: push.after,
    actor: push.pusher.name,

    repo_url: push.repository.url,
    base_ref: push.ref,
    fork_url: null,
    fork_ref: null,

    status: null,
    repo_id: push.repository.id,
    change: push.compare.split('/').pop(),
    change_id: push.after
  };

  (new VcsPayload(payload)).validate();

  return payload;
}

/**
 * Given a PR, returns a string that represents its state that is recognized by
 * the rest of the system (via the VCS payload)
 *
 * @param {Object} pull Raw github event
 * @return {String} state
 */
function statusOfPull(pull) {
  // During testing there were cases where the mergeable flag was null when using
  // webhooks. We only want to return 'merged' when explicitly set to true
  if (pull.merged) {
    return 'merged';
  }
  return pull.state;
}

/**
 * Checks & validates pull object, whether it should be ignored
 */
function validatePull(pull, auth_user) {
  var pr_name;
  // decide whether this came from a webhook or an API call made internally
  if (pull.pull_request) {
    pr_name = pull.pull_request.base.repo.full_name +
              ' #' + pull.pull_request.number;
    if (!~allowed_pr_actions.indexOf(pull.action)) {
      throwError('ignoring pull action [' + pull.action + '] for ' + pr_name);
    }
    pull = pull.pull_request;
  }

  var pr_name = pull.base.repo.full_name + ' #' + pull.number;

  if (pull.mergeable === false) {
    throwError('PR cannot be merged, ignoring ' + pr_name);
  }
  if (pull.body && ~pull.body.indexOf('@' + auth_user + ' ignore')) {
    throwError('user requested for PR to be ignored - ' + pr_name);
  }
  return pull;
}

/**
 * Generates a VCS Payload from a RAW pull_request (not a webhook payload)
 * ie: webhook_payload.pull_request, not webhook_payload
 *
 * @return {Object} VCS Payload
 */
function payloadFromPull(pull) {
  var payload = {
    repo: pull.base.repo.full_name,
    before: pull.base.sha,
    after: pull.head.sha,
    actor: pull.user.login,

    repo_url: pull.base.repo.ssh_url,
    base_ref: pull.base.ref,
    fork_url: pull.head.repo.ssh_url,
    fork_ref: pull.head.ref,

    status: statusOfPull(pull),
    repo_id: pull.base.repo.id,
    change: pull.number,
    change_id: pull.id
  };

  (new VcsPayload(payload)).validate();

  return payload;
}

/**
 * MUST BIND `this` to this function!
 *
 * @param {Object} payload HTTP hook payload generated from github webhook
 * @return {Object} An object depending on the x-github-event value
 */
function vcsPayload(payload, auth_user) {
  var event = payload.__headers['x-github-event'],
  commentPayload = pullFromComment.bind(this);

  if (event === 'issue_comment') {
    return ['proposal', commentPayload(payload)]
  }
  if (event === 'pull_request') {
    payload = validatePull(payload, auth_user);
    return ['proposal', payloadFromPull(payload)];
  }
  if (event === 'push') {
    return ['change', payloadFromPush(payload)];
  }

  throwError(
    'invalid payload given ' +
    JSON.stringify(payload).substring(0, 64) + '...'
  );
}

/**
 * MUST BIND `this` to this function! Not in object because this is not something
 * that should be exposed.
 * Generates a VCS Payload from a comment
 *
 * @param {Object} comment github issue_comment payload
 * @return {Object} from payloadFromPull
 */
function pullFromComment(comment, auth_user) {
  if (!comment.issue.pull_request ||
      comment.issue.pull_request.html_url == null) {
    throwError('Ignoring non-pull request issue notification');
  }

  var commentArray = comment.comment.body.split(' '),
      addressedIndex = commentArray.indexOf('@' + auth_user),
      command = commentArray[addressedIndex + 1];

  if (!~addressedIndex) {
    throwError('Not addressed @ me');
  }
  if (command !== 'retest') {
    throwError("Ignoring unknown request: " + comment.comment.body);
  }

  this.debug(
    'Received retest request for pull',
    {
      pull_number: comment.issue.number,
      repo: comment.repository.name
    }
  );

  return q.ninvoke(this._api.pullRequests, 'get', {
    user: comment.repository.owner.login,
    repo: comment.repository.name,
    number: comment.issue.number
  })
  .then(function(pull) {
    pull.from_issue_comment = true;
    return pull;
  }.bind(this))
  .catch(this.error);
}

/**
 * Github VCS plugin
 */
module.exports = require('../plugin').extend({
  name: 'github',

  init: function(option) {
    this._super(option);
    this._api = new GitHubApi({
      version: '3.0.0',
      host: option.host,
      port: option.port
    });
    this.authenticate();
  },

  authenticate: function() {
    this._api.authenticate(this.config.auth);
  },

  processPayload: function(payload) {
    var defer = q.defer(),
    promise = q.resolve(payload)
    .then(validateGithubPayload)
    .then(function(pl) {
      return [pl, this.config.auth.username];
    }.bind(this))
    .spread(vcsPayload.bind(this))
    .spread(this.publish.bind(this));

    promise.done(
      function(payload) { return defer.resolve(); },
      function(reason) { return defer.reject(reason); }
    );

    return defer.promise;
  },

  start: function() {
    if (this.config.method === 'hooks') {
      this.debug(logMsg('using hooks, performing startup PR scan.'));
      this.pollRepos();
      return;
    }
    var self = this,
    frequency = self.config.frequency || 4000;
    async.parallel({
      github: function() {
        var run_github = function() {
          self.pollRepos();
          setTimeout(run_github, frequency);
        };
        run_github();
      }
    });
  },

  /**
   * Iterates over the configured list of repositories and uses
   * the GitHub API to check each one for pull requests.
   *
   * @method pollRepos
   */
  pollRepos: function() {
    return q.allSettled(this.config.repos.map(function(repo) {
      var repo_owner = repo.split('/')[0],
      repo_name = repo.split('/')[1];
      // Getting PRs for each repo
      return q.ninvoke(this._api.pullRequests, 'getAll', {
        user: repo_owner,
        repo: repo_name,
        state: 'open'
      })
      .then(function getPR(resp) {
        return q.allSettled(Object.keys(resp)
        .map(function(i) { return resp[i]; })
        .filter(function(pull) {
          return pull.number && pull.number !== 'undefined';
        })
        .map(function getPRDetails(pull) {
          // Currently the GitHub API doesn't provide the same information for
          // polling as it does when requesting a single, specific, pull request.
          return q.ninvoke(this._api.pullRequests, 'get', {
            user: repo_owner,
            repo: repo_name,
            number: pull.number
          })
          .then(function(pull) {
            this.publish('pull_request', payloadFromPull(pull));
          }.bind(this));
        }, this));
      }.bind(this))
      .catch(this.error);
    }, this));
  }
});
