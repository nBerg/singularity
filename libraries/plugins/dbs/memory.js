"use strict";
//
var q = require('q'),
    retVals = {
      'updated': 0,
      'stored': 1,
      'ignored': -1
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
      this.collections.pulls[data.pr_id] = {
        // TODO: what to store
      };

      return q.fcall(function () {
        return retVals.stored;
      });
    }

    else {
      // TODO: an update
      return q.fcall(function () {
        return retVals.updated;
      });
    }
  }
});
