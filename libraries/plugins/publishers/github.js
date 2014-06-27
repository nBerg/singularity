"use strict";

var GitHubApi = require('github'),
    q = require('q'),
    PublisherPayload = require('../../payloads/publisher').PublisherPayload;

function logMsg(message) { return '[publisher.github] ' + message; }
// function throwError(message) { throw logMsg(message); }

/**
 * MUST BIND `this`
 *
 * Uses the GitHub API to create a commit status for a ref
 * https://developer.github.com/v3/repos/statuses/
 *
 * @method createStatus
 * @param owner {String}
 * @param repo {String}
 * @param sha {String}
 * @param state {String}
 * @param target_url {String}
 * @param description {String}
 */
function createGithubStatus(owner, repo, sha, state, targetUrl, description) {

  logMsg('creating status ' + state + ' for sha ' + sha);

  var hash = {
    user: owner,
    repo: repo,
    sha: sha,
    state: state,
    target_url: targetUrl,
    description: description
  };

  return q.ninvoke(this._api.statuses, 'create', hash)
  .then(function(response) {
    return response;
  })
  .catch(this.error);
}

function buildPublisherPayload(payload, githubResponse) {
  return new PublisherPayload({
    repo: payload.data.repo,
    owner: payload.data.owner,
    sha: payload.data.sha,
    status: payload.data.status,
    buildLink: payload.data.buildLink,
    type: (githubResponse.state ? 'statusUpdate' : 'comment'),
    publishedMessage: githubResponse.description
  });
}

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

  createStatus: function(payload) {
    var state = payload.data.status;
    if (state === 'queued' || state === 'building') {
      state = 'pending';
    }

    return createGithubStatus.call(this,
             payload.data.owner,
             payload.data.repo,
             payload.data.sha,
             state,
             payload.data.buildLink,
             payload.data.message
           )
           .then(buildPublisherPayload.bind(this, payload))
           .catch(this.error);
  }

//
//   /**
//    * Uses the GitHub API to create an inline comment on the diff of a pull request.
//    *
//    * @method createComment
//    * @param pull {Object}
//    * @param sha {String}
//    * @param file {String}
//    * @param position {String}
//    * @param comment {String}
//    */
//   createComment: function(pull, sha, file, position, comment) {
//     if (!file && !position && !comment) {
//       return q.ninvoke(this._api.issues, 'createComment', {
//         user: this.config.user,
//         repo: pull.repo,
//         number: pull.number,
//         body: sha
//       })
//       .catch(this.error);
//     }
//     else {
//       return q.ninvoke(this._api.pullRequests, 'createComment', {
//         user: this.config.user,
//         repo: pull.repo,
//         number: pull.number,
//         body: comment,
//         commit_id: sha,
//         path: file,
//         position: position
//       })
//       .catch(this.error);
//     }
//   },
//
//   /**
//    * Create / configure webhooks for a given list of repos
//    *
//    * @method setupRepoHook
//    * @param repos {Array}
//    */
//   setupRepoHook: function(repo, callback) {
//     if (~this.config.repos.indexOf(repo)) {
//       if (callback) {
//         callback('repo already configured', null);
//       }
//       return q.reject('repo already configured');
//     }
//
//     return this.createWebhook(repo, callback)
//     .catch(function(err) {
//       if (callback) {
//         callback('Failed to create webhook', { repo: repo, error: err });
//       }
//       this.error('Failed to create webhook');
//       throw { repo: repo, error: err };
//     });
//   },
//
//   /**
//    * Create webhook for a given repo
//    *
//    * @param repo {String}
//    * @method createWebhook
//    */
//   createWebhook: function(repo, callback) {
//     var promise = q.ninvoke(this._api.repos, 'createHook', {
//       user: this.config.user,
//       repo: repo,
//       name: 'web',
//       active: true,
//       events: [
//         'pull_request',
//         'issue_comment',
//         'push'
//       ],
//       config: {
//         url: this.application.getDomain(),
//         content_type: 'json'
//       }
//     });
//
//     if (callback) {
//       promise.done(function(res) {
//         callback(null, res);
//       });
//     }
//
//     return promise;
//   }
});
