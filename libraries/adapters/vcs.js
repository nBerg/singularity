"use strict";

var q = require('q'),
    allowed_events = ['pull_request', 'retest', 'push'];

module.exports = require('./adapter').extend({
  init: function(option) {
    this.name = 'vcs';
    this.pluginType = 'vcs';
    this._super(option);
  },

  eventCheck: function(request) {
    var eventType = this.receiver.parseEvent(request);
    if (!~allowed_events.indexOf(eventType)) {
      throw {
          status: 501,
          body: {
            message: 'Unsupported event type ' + eventType
          }
      };
    }
    this.log.debug('Event type ' + eventType + ' detected');
    return eventType;
  },

  handleRequest: function(request) {
    this.log.debug('handling new request');

    return {
      type: this.eventCheck(request),
      data: this.receiver.handleRequest(request)
    };
  },

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
});
