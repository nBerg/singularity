"use strict";
//
var q = require('q'),
    retVals = {
      updated: 0,
      stored: 1,
      ignored: -1
    };
// collections = ['pulls', 'pushes', 'config'],
// dbConnection;

module.exports = require('nbd/Class').extend({

  collections: {
    config: {},
    pulls: {},
    pushes: {}
  },

  init: function(option) {
    this.config = option;
  },

  insertPull: function(data) {
    if (!this.collections.pulls[data.pr_id]) {
      //TODO
      this.collections.pulls[data.pr_id] = data;

      this.printDB();

      return q.fcall(function() {
        return retVals.stored;
      });
    }

    else {
      // TODO: an update
      return q.fcall(function() {
        return retVals.updated;
      });
    }
  },

  insertPullRequestJob: function(pr, job) {
    if (!this.collections.pulls[pr].jobs[job.job_id]) {
      this.collections.pulls[pr].jobs[job.job_id] = job;

      this.printDB();
    }

    // TODO: Handle
  },

  printDB: function() {
    console.log('pulls');
    console.log(this.collections.pulls);
  }
});
