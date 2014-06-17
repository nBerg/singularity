"use strict";

var //q = require('q'),
    // async = require('async'),
    buildSys;

module.exports = require('../vent').extend({
  init: function(option) {
    this._super(option);
  },

  start: function() {
    // var self = this,
    // timeout = this.config.frequency || 2000;
    //
    // async.parallel({
    //   poll: function() {
    //     var pingForPoll = function() {
    //       self.publish('jobs.polling');
    //       setTimeout(pingForPoll, timeout);
    //     };
    //
    //     pingForPoll();
    //   }
    // });
  },

  checkPullRequestJob: function(pull) {
    this.log.debug('Checking status of a pr job');
    buildSys.checkPullRequestJob(pull);
  },

  checkPushJob: function(push) {

  },

  setBuilder: function(builder) {
    // TODO: do this smarter
    buildSys = require('../' + builder);
  },

  buildPullRequest: function(pull) {
    this.log.debug('building pull request - not implemented');

    // TODO: this should come from plugin
    var prJob = {job: {job_id: '123'}, pull: pull.pr_id};

    this.publish('pull_request.triggered', prJob);
  }
});
