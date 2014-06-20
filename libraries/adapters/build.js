"use strict";

var q = require('q'),
async = require('async');

function validateOpts(opts) {
  return opts;
}

module.exports = require('./adapter').extend({
  init: function(option) {
    this.name = 'build';
    this.pluginType = 'builders';
    this._super(option);
  },

  checkPullRequestJob: function(pull) {
  },

  checkPushJob: function(push) {
  },

  triggerBuild: function(req_body) {
    return q.resolve(req_body)
    .then(validateOpts)
    .then(function(opts) {
      return ['triggerBuild', opts];
    })
    .spread(this.delegateTask)
    .catch(this.error)
    .done();
  }
});
