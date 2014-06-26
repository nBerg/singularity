"use strict";

var q = require('q'),
allowed_events = ['pull_request', 'retest', 'push'];

module.exports = require('./adapter').extend({
  name: 'vcs',
  pluginType: 'vcs',
  bound_fx: ['handleRequest'],

  handleRequest: function(payload) {
    this.log.debug(
      '[vcs.payload_received]',
      JSON.stringify(payload).substring(0, 64) + '...'
    );
    this.delegateTask('processPayload', payload);
  }
});
