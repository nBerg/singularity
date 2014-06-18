"use strict";

var q = require('q'),
fs = require('fs'),
path = require('path'),
async = require('async'),
clientConnection;

function getClient() {
  if (clientConnection) {
    return clientConnection;
  }
  throw 'No DB client - error connecting on startup? Incorrect configuration?';
}

function validateOpts() {
  
}

module.exports = require('../vent').extend({
  init: function(option) {
    option = require('nconf').defaults(option);
    this._super(option);
    this.name = 'BuildAdapter';
  },

  // todo: DRY b/w here & adapters/db
  setClient: function(client) {
    if (!this.config.get(client)) {
      this.log.error('No config for build.<client>, ignoring', {client: client});
      return;
    }

    var clientPath = this.config.get('client_path') ||
                     path.join(__dirname, '../plugins/builders/', client + '.js');
    if (fs.existsSync(clientPath)) {
      var ClientObj = require(clientPath);

      q.fcall(function() {
        return new ClientObj(this.config.get(client));
      }.bind(this))
      .then(function(instance) {
        clientConnection = instance;
      })
      .catch(this.log.error)
      .done();

      return;
    }

    this.log.error(clientPath + ' does not exist, ignoring');
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
    this.log.debug('Checking status of a pr job');
    // buildSys.checkPullRequestJob(pull);
  },

  checkPushJob: function(push) {

  },

  // buildPullRequest: function(pull) {
  //   this.log.debug('building pull request - not implemented');
  //
  //   // TODO: this should come from plugin
  //   var prJob = {job: {job_id: '123'}, pull: pull.pr_id};
  //
  //   this.publish('pull_request.triggered', prJob);
  // },

  triggerBuild: function(req_body) {
    var self = this;

    return q.fcall(getClient)
    .thenResolve(req_body)
    .then(validateOpts)
    .then(clientConnection.triggerBuild)
    .then(function(res) {
      self.publish('build.triggered', req_body);
    })
    .catch(self.error)
    .done();
  }
});
