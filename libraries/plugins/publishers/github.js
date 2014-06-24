// "use strict";
//
// var GitHubApi = require('github'),
// async = require('async'),
// q = require('q');
//
module.exports = require('../plugin').extend({
//   init: function(option) {
//     this._super(option);
//     this._api = new GitHubApi({
//       version: '3.0.0',
//       host: option.host,
//       port: option.port
//     });
//     this.authenticate();
//   },
//
//   addRepo: function(data) {
//     if (!data.repo || !data.organization) {
//       throw 'Missing repo or organization in passed data';
//     }
//
//     if (!this.config.repos) {
//       this.config.repos = [];
//     }
//
//     this.log.info('GitHub Lib: adding repo', data.repo);
//     this.config.repos.push(data.repo);
//
//     return this.setupRepoHook(data.repo);
//   },
//
//   /**
//    * Sets up the GitHub plugin. Depending on the selecting configs either a webserver
//    * will be setup for receiving webhook events or asynchronous polling will be setup.
//    *
//    * @method start
//    */
  start: function() {
//     if (this.config.method === 'hooks') {
//       this.checkRepos();
//       return this;
//     }
//
//     var self = this;
//     async.parallel({
//       github: function() {
//         var run_github = function() {
//           self.checkRepos();
//           setTimeout(run_github, self.config.frequency);
//         };
//
//         run_github();
//       }
//     });
//
//     return this;
  },
//
//   authenticate: function() {
//     this._api.authenticate(this.config.auth);
//   },
//
//   /**
//    * Uses the GitHub API to create a Merge Status for a pull request.
//    *
//    * @method createStatus
//    * @param sha {String}
//    * @param user {String}
//    * @param repo {String}
//    * @param state {String}
//    * @param build_url {String}
//    * @param description {String}
//    */
//   createStatus: function(sha, user, repo, state, build_url, description) {
//     this.log.info('creating status ' + state + ' for sha ' + sha + ' for build_url ' + build_url);
//     return q.ninvoke(this._api.statuses, 'create', {
//       user: user,
//       repo: repo,
//       sha: sha,
//       state: state,
//       target_url: build_url,
//       description: description
//     })
//     .catch(this.error);
//   },
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
