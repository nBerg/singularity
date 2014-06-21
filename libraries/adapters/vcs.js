"use strict";

var q = require('q'),
allowed_events = ['pull_request', 'retest', 'push'];

module.exports = require('./adapter').extend({
  name: 'vcs',
  pluginType: 'vcs',

  handleRequest: function(payload) {
    this.log.debug(
      '[vcs.payload_received]',
      JSON.stringify(payload).substring(0, 64) + '...'
    );
    this.delegateTask('processPayload', payload);
  },

  /**
  handlePullRequest: function(payload) {
    this.log.debug('handling pull_request');

    var pull_request = this.receiver.handlePullRequest(payload);

    if (!~['validated', 'updated', 'closed'].indexOf(pull_request.action)) {
      //not supported
      this.log.info("unsupported pull request action received: " + pull_request.action);
      // how to handle? throw something?
    }

    this.publish('pull_request.' + pull_request.action, payload);
  },

  handlePush: function(payload) {
    this.log.debug('processing push - not implemented yet');

    if (this.receiver.validatePush(payload)) {
      this.publish('push.validated');
    }
    else {
      // bad push received
    }
  },

  handleRetest: function(payload) {
    this.log.debug('handling retest - not implemented yet');

    if (this.receiver.validateRetest(payload)) {
      // TODO: for now, we only support retests on PRs
      this.publish('pull_request.retest');
    }
    else {
      //bad/ignored retest event
    }
  }
  **/
});
