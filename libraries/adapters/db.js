"use strict";

var q = require('q'),
fs = require('fs'),
path = require('path'),
insertionStatuses = ['ignored', 'updated', 'stored'],
clientConnection;

function buildPushQuery(push) {
  if (!push.repository) {
    throw 'Push missing repository';
  }

  if (!push.repository.name) {
    throw 'Push missing repository name';
  }

  if (!push.repository.organization) {
    throw 'Push missing repository name';
  }

  if (!push.ref) {
    throw 'Push missing ref';
  }

  if (!push.after) {
    throw 'Push missing after SHA';
  }

  return {
    ref: push.ref,
    sha: push.after,
    repo: push.repository.organization + '/' + push.repository.name
  };
}

function buildPushRecord(push) {
  var record = buildPushQuery(push);
  record.job = {
    id: null,
    result: null,
    status: null
  };

  return record;
}

function buildPullQuery(pull) {
  if (!pull.number) {
    throw 'missing PR number';
  }
  if (!pull.base || !pull.base.repo || !pull.base.repo.full_name) {
    throw 'invalid PR base';
  }
  return {
    number: pull.number,
    repo: pull.base.repo.full_name
  };
}

function buildPullRecord(pull) {

}

function getClient() {
  if (clientConnection) {
    return clientConnection;
  }
  throw 'No DB client - error connecting on startup? Incorrect configuration?';
}

module.exports = require('../vent').extend({
  init: function(option) {
    // TODO: think about putting this into vent instead
    option = require('nconf').defaults(option);
    this._super(option);
  },

  setClient: function(client) {
    if (!this.config.get(client)) {
      this.log.error('No config for db.<client>, ignoring', {client: client});
      return;
    }

    var clientPath = this.config.get('client_path') ||
                     path.join(__dirname, '../plugins/dbs/', client + '.js');
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

  findPendingJobs: function() {
    q.fcall(getClient)

    .then(clientConnection.findPendingPushJobs)
    .then(function(pulls) {
      pulls.forEach(function(pull) {
        this.publish('pull_request.build_pending', pull);
      }.bind(this));
    }.bind(this))

    .then(clientConnection.findPendingPullJobs)
    .then(function(pushes) {
      pushes.forEach(function(push) {
        this.publish('push.build_pending', push);
      }.bind(this));
    }.bind(this))

    .catch(this.log.error)
    .done();
  },

  insertPush: function(push) {
    var self = this;

    return q.fcall(getClient)
    .thenResolve(push)
    .then(buildPushRecord)
    .then(function(record) {
      return clientConnection.insertPush(record)
      .then(function(res) {
        self.publish('push.stored', push);
      })
      .catch(function(err) {
        push.error = err;
        self.publish('push.not_stored', push);
      })
      .done();
    })
    .catch(self.error)
    .done();
  },

  findPush: function(push) {
    var self = this;

    return q.fcall(getClient)
    .thenResolve(push)
    .then(buildPushQuery)
    .then(function(query) {
      return clientConnection.findPush(query)
      .then(function(item) {
        self.publish((item) ? 'push.found' : 'push.not_found', push);
      })
      .catch(self.error)
      .done();
    })
    .catch(self.error)
    .done();
  },

  insertPull: function(pull) {
    var self = this;

    return q.fcall(getClient)
    .thenResolve(pull)
    .then(buildPullRecord)
    .then(function(record) {
      return clientConnection.insertPull(record)
      .then(function(res) {
        if (!!~insertionStatuses.indexOf(res)) {
          self.publish('pull_request.' + res, pull);
          return;
        }

        // -1 means (to us) that nothing happened
        if (!~res) {
          self.publish('pull_request.not_stored', pull);
          return;
        }
        // >= 1 means that something was inserted
        if (res) {
          self.publish('pull_request.stored', pull);
          return;
        }
        // 0 means that something happened, but nothing was added
        self.publish('pull_request.updated', pull);
      })
      .catch(function(err) {
        pull.error = err;
        self.publish('pull_request.not_stored', pull);
      })
      .done();
    })
    .catch(self.error)
    .done();
  },

  findPull: function(pull) {
    var self = this;

    return q.fcall(getClient)
    .thenResolve(pull)
    .then(buildPullQuery)
    .then(function(query) {
      return clientConnection.findPush(query)
      .then(function(item) {
        self.publish((item) ? 'pull_request.found' : 'pull_request.not_found', pull);
      })
      .catch(self.error)
      .done();
    })
    .catch(self.error)
    .done();
  }
});
