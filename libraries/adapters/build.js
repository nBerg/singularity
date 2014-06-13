"use strict";

var q = require('q'),
    async = require('async');

module.exports = require('../vent').extend({
  init: function(option) {
    this._super(option);
  },p

  start: function() {
    var self = this,
    timeout = this.config.frequency || 2000;

    async.parallel({
      poll: function() {
        var pingForPoll = function() {
          self.publish('jobs.polling');
          setTimeout(pingForPoll, timeout);
        };

        pingForPoll();
      }
    });
  },

  checkPullRequestJob: function(pull) {

  },

  checkPushJob: function(push) {

  }
});
