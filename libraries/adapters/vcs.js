"use strict";

var q = require('q'),
VcsPayload = require('../payloads/vcs').VcsPayload;

function startPolling() {
  if (this.config.method === 'hooks') {
    this.debug('using hooks, performing startup PR scan.');
    this.pollRepos();
    return;
  }
  var self = this,
  frequency = self.config.frequency || 4000;
  async.parallel({
    poll: function() {
      var poll_repos = function() {
        self.pollRepos();
        setTimeout(poll_repos, frequency);
      };
      poll_repos();
    }
  });
}

function processPayload(payload) {
  return q(payload)
  .then(this.validatePayload.bind(this))
  .thenResolve(payload)
  .then(this.generateVcsPayload.bind(this))
  .then(function(vcsPayload) {
    new VcsPayload(vcsPayload).validate();
    return vcsPayload;
  });
}

module.exports = require('./adapter').extend({
  name: 'vcs',
  pluginType: 'vcs',

  /**
   * Typically called by an external force to start internal
   * processes, such as polling
   */
  start: function() {
    this.executeInPlugins(startPolling);
  },

  handleRequest: function(payload) {
    this.debug(
      '[payload_received]',
      JSON.stringify(payload).substring(0, 64) + '...'
    );
    this.executeInPlugins(processPayload, payload)
    .then(function(payloads) {
      payloads.forEach(function(payload) {
        this.publish(payload.type, payload);
      }, this);
    }.bind(this));
  }
});
