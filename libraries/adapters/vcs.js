"use strict";

var q = require('q'),
    VcsPayload = require('../payloads/vcs').VcsPayload;

function validateVcsPayload(vcsPayload) {
  new VcsPayload(vcsPayload).validate();
  return vcsPayload;
}

function poll() {
  return this.pollRepos();
}

function processPayload(payload) {
  return q(payload)
  .then(this.validatePayload.bind(this))
  .thenResolve(payload)
  .then(this.generateVcsPayload.bind(this))
  .then(validateVcsPayload);
}

module.exports = require('./adapter').extend({
  name: 'vcs',
  pluginType: 'vcs',

  /**
   * Typically called by an external force to start internal
   * processes, such as polling
   */
  start: function() {
    this.executeInPlugins(poll)
    .then(function(validPluginResults) {
      validPluginResults.forEach(function(pluginResults) {
        pluginResults.forEach(function(payload) {
          this.debug(
            'publishing payload from polling',
            this.logForObject(payload)
          );
          this.publishPayload(payload);
        }, this);
      }, this);
    }.bind(this))
    .done();
  },

  handleRequest: function(payload) {
    this.debug(
      'http request payload received',
      this.logForObject(payload)
    );
    this.executeInPlugins(processPayload, payload)
    .then(function(payloads) {
      payloads.forEach(function(payload) {
        this.publishPayload(payload);
      }, this);
    }.bind(this));
  }
});
