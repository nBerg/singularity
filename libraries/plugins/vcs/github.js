var GitHubApi = require('github'),
async = require('async'),
q = require('q'),
allowed_events = ['issue_comment', 'pull_request', 'push'];

function throwError(message) {
  throw '[vcs.github] ' + message;
}

module.exports = require('../../vent').extend({
  init: function(option) {
    this._super(option);
    this._api = new GitHubApi({
      version: '3.0.0',
      host: option.host,
      port: option.port
    });
    this.authenticate();
    this.name = 'github';
  },

  authenticate: function() {
    this._api.authenticate(this.config.auth);
  },

  processPayload: function(payload) {
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
  },

  start: function() {
    if (this.config.method === 'hooks') {
      this.checkRepos();
      return;
    }
    var self = this;
    async.parallel({
      github: function() {
        var run_github = function() {
          self.checkRepos();
          setTimeout(run_github, self.config.frequency);
        };
        run_github();
      }
    });
  },

  checkRepos: function() {

  }

//parseEvent: function(request) {
//  var event = request.headers['x-github-event'];

//  if (event === 'issue_comment') {
//    return 'retest';
//  }

//  return event;
//},

//handleRequest: function(request) {
//  var data;

//  try {
//    data = JSON.parse(JSON.stringify(request.body));
//  }
//  catch(err) {
//    throw {
//      status: 422,
//      body: {
//        message: 'Invalid payload sent. Make sure content type == "application/json"'
//      }
//    };
//  }

//  return data;
//},

///**
// * Iterates over the configured list of repositories and uses
// * the GitHub API to check each one for pull requests.
// *
// * @method checkRepos
// */
//checkRepos: function() {
//  this.log.debug('Polling github for new and updated Pull Requests');
//
//  return q.allSettled(this.config.repos.map(function(repo) {
//    // Getting PRs for each repo
//    return q.ninvoke(this._api.pullRequests, 'getAll', {
//      user: this.config.user,
//      repo: repo,
//      state: 'open'
//    })
//    .then(function getPR(resp) {
//      return q.allSettled(Object.keys(resp)
//      .map(function(i) { return resp[i]; })
//      .filter(function(pull) {
//        return pull.number && pull.number !== 'undefined';
//      })
//      .map(function getPRDetails(pull) {
//        // Currently the GitHub API doesn't provide the same information for polling as
//        // it does when requesting a single, specific, pull request. So we have to
//        return q.ninvoke(this._api.pullRequests, 'get', {
//          user: this.config.user,
//          repo: repo,
//          number: pull.number
//        })
//        .then(function(pull) {
//          this.publish('pull_request', pull);
//        }.bind(this));
//      }, this));
//    }.bind(this))
//    .catch(this.error);
//  }, this));
//},

///**
// * Decide whether this PR is considered to be updated or not
// *
// * @method processPullRequest
// * @param pull {Object}
// */
//processPullRequest: function(pull) {
//  if (!pull.head || !pull.head.repo) {
//    this.log.error('Skipping pull request, invalid payload given', { number: pull.number, repo: pull.repo });
//    return;
//  }

//  // pull.issue_comment: internally modified
//  // a "@user retest" comment was found
//  if (pull.head.sha !== pull.head.sha || pull.issue_comment) {
//    this.publish('pull_request.updated', pull);
//    return;
//  }
//},

///**
// * Uses the GitHub API to create a Merge Status for a pull request.
// *
// * @method createStatus
// * @param sha {String}
// * @param user {String}
// * @param repo {String}
// * @param state {String}
// * @param build_url {String}
// * @param description {String}
// */
//createStatus: function(sha, user, repo, state, build_url, description) {
//  this.log.info('creating status ' + state + ' for sha ' + sha + ' for build_url ' + build_url);
//  return q.ninvoke(this._api.statuses, 'create', {
//    user: user,
//    repo: repo,
//    sha: sha,
//    state: state,
//    target_url: build_url,
//    description: description
//  })
//  .catch(this.error);
//},

///**
// * Uses the GitHub API to create an inline comment on the diff of a pull request.
// *
// * @method createComment
// * @param pull {Object}
// * @param sha {String}
// * @param file {String}
// * @param position {String}
// * @param comment {String}
// */
//createComment: function(pull, sha, file, position, comment) {
//  if (!file && !position && !comment) {
//    return q.ninvoke(this._api.issues, 'createComment', {
//      user: this.config.user,
//      repo: pull.repo,
//      number: pull.number,
//      body: sha
//    })
//    .catch(this.error);
//  }
//  else {
//    return q.ninvoke(this._api.pullRequests, 'createComment', {
//      user: this.config.user,
//      repo: pull.repo,
//      number: pull.number,
//      body: comment,
//      commit_id: sha,
//      path: file,
//      position: position
//    })
//    .catch(this.error);
//  }
//},

///**
// * Receives a pull request at the very beginning of the process, either from a webhook event or from the REST API,
// * and checks to make sure we care about it.
// *
// * @method handlePullRequest
// * @param pull {Object}
// */
//handlePullRequest: function(pull) {
//  // Check if this came through a webhooks setup
//  if (pull.action !== undefined) {
//    if (pull.action === 'closed') {
//      // this.publish('pull_request.closed', pull);
//      // if (pull.pull_request.merged) {
//      //   this.log.debug('pull was merged, skipping');
//      //   this.publish('pull_request.merged', pull);
//      // }
//      // else {
//      //   this.log.debug('pull was closed, skipping');
//      // }

//      return 'closed';
//    }

//    if (pull.action !== 'synchronize' && pull.action !== 'opened') {
//      this.log.debug('Ignoring pull request, action not supported', { pull_number: pull.number, action: pull.action });
//      return;
//    }

//    pull = pull.pull_request;
//  }

//  // During testing there were cases where the mergeable flag was null when using webhooks.
//  // In that case we want to allow the build to be attempted. We only want to prevent it when
//  // the mergeable flag is explicitly set to false.
//  if (pull.mergeable !== undefined && pull.mergeable === false) {
//    this.log.debug('Ignoring pull request, not in mergeable state', { pull_number: pull.number, mergeable: pull.mergeable });
//    return;
//  }

//  if (pull.body && pull.body.indexOf('@' + this.config.user + ' ignore') !== -1) {
//    this.log.debug('Ignoring pull request, flagged to be ignored', { pull_number: pull.number });
//    return;
//  }

//  pull.repo = pull.base.repo.name;
//  // if (this.config.skip_file_listing) {
//  //   this.log.debug('skipping file listing for PR');
//  //   pull.files = [];
//  //   this.publish('pull_request.validated', pull);
//  // }
//  // else {
//  //   this.checkFiles(pull);
//  // }


//  // TODO: Decide what this return object should look like

//  // TODO: Possibly updated?
//  pull.action = 'validated';
//  return pull;
//},

//validateRetest: function(payload) {
//  //just assume all retests issue comments for now
//  var validated = this.handleIssueComment(payload);
//  return validated;
//},

///**
// * Receives an issue comment from a webhook event and checks to see if we need to worry about it. If so the
// * associated pull request will be loaded via the REST API and sent on its way for processing.
// *
// * @method handleIssueComment
// * @param comment {Object}
// */
//handleIssueComment: function(comment) {
//  // This event will pick up comments on issues and pull requests but we only care about pull requests
//  if (comment.issue.pull_request.html_url == null) {
//    this.log.debug('Ignoring non-pull request issue notification');
//    return false;
//  }

//  var commentArray = comment.comment.body.split(' '),
//      addressedIndex = commentArray.indexOf('@' + this.config.auth.username),
//      command = commentArray[addressedIndex + 1];

//  if (!~addressedIndex) {
//    this.log.debug("Ignoring comment not addressed to me");
//    return false;
//  }

//  if (command !== 'retest') {
//    this.log.debug("Ignoring uknown request: " + comment.comment.body);
//    return false;
//  }

//  this.log.debug('Received retest request for pull', { pull_number: comment.issue.number, repo: comment.repository.name });

//  return q.ninvoke(this._api.pullRequests, 'get', {
//    user: this.config.user,
//    repo: comment.repository.name,
//    number: comment.issue.number
//  })
//  .then(function(pull) {
//    pull.issue_comment = true;
//    return true;
//  }.bind(this))
//  .catch(this.error);
//},

///**
// * Processes & validates push events
// *
// * @method handlePush
// * @param payload {Object}
// */
//validatePush: function(push) {
//  if (!push.repository ||
//      !push.repository.name ||
//      !push.ref ||
//      !push.before ||
//      !push.after ||
//      !push.pusher ||
//      !push.pusher.name ||
//      !push.pusher.email) {
//    this.error('Invalid push payload event', push);
//    return false;
//  }

//  return true;
//},
});
