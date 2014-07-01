"use strict";

var q = require('q');

function buildChangePayload(vcsPayload) {
  return q(vcsPayload)
  .then(validateChange.bind(this))
  .thenResolve(vcsPayload)
  .then(buildChange.bind(this));
}

function buildProposalPayload(vcsPayload) {
  return q(vcsPayload)
  .then(validateProposal.bind(this))
  .thenResolve(vcsPayload)
  .then(buildProposal.bind(this));
}

function executeAndPublish(workflow, payload) {
  this.debug(
    'request for build received',
     this.logForObject(payload)
  );
  this.executeInPlugins(workflow, payload)
  .then(function(pluginResults) {
    pluginResults.forEach(function(buildResults) {
      buildResults.forEach(function(buildPayload) {
        this.publishPayload(buildPayload);
      });
    }.bind(this));
  }.bind(this));
}

module.exports = require('./adapter').extend({
  name: 'build',
  pluginType: 'builders',

  buildChange: function(changePayload) {
    executeAndPublish.call(this, buildChangePayload, changePayload);
  },

  buildProposal: function(proposalPayload) {
    executeAndPublish.call(this, buildProposalPayload, proposalPayload);
  }
});
