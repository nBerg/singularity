"use strict";

var q = require('q'),
async = require('async'),

function validateOpts(opts) {
  return opts;
}

module.exports = require('./adapter').extend({
  init: function(option) {
    this.name = 'build';
    this.pluginType = 'builder';
    this._super(option);
  },

  start: function() {
    if (this.config.get('method') === 'hooks') {
      this.publish('build.polling');
      return;
    }

    var self = this;
    async.parallel({
      poll: function() {
        var pingForPoll = function() {
          self.publish('build.polling');
          setTimeout(pingForPoll, self.config.frequency || 2000);
        };
        pingForPoll();
      }
    });
  },

  checkPullRequestJob: function(pull) {
  },

  checkPushJob: function(push) {
  },

  triggerBuild: function(req_body) {
    var self = this;

    return this.plugins.forEach(function(builder) {
      q.resolve(req_body)
      .then(validateOpts)
      .then(builder.triggerBuild)
      .then(function(res) {
        self.publish(
          'build.triggered',
          {
            opts: req_body,
            builder: builder.name
          }
        );
      })
      .catch(self.error)
      .done();
    });
  }
});
