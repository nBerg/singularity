"use strict";

var q = require('q');

function addRepoToConfig(payload) {
  return q(payload)
  // THIS:
  .then(addRepoToConfig)

  // OR THIS: (roughly)
  .then(function(payload) {
    this.addRepo(payload.org, payload.repoName);

    // Per type of builder???
    this.addRepoProposalJobs(payload.repo, payload.proposalJobs); //jobs is an array
    this.addRepoChangeJobs(payload.repo, payload.changeJobs);

    // Add type of publisher???
  }.bind(this));
}

module.exports = require('./adapter').extend({
  name: 'db',
  pluginType: 'dbs',

  start: function() {
    // set up connection here? make sure various collections/tables exist?
    // call plugin.start()
  },

  // What sort of payload would this receive?
  addRepoToConfig: function(payload) {
    q(payload)
    .then(validatePayload)
    .then(function(payload) {
      return this.executeInPlugins(addRepoToConfig, payload);
    }.bind(this))
    .then(function(dbPayloads) {
      dbPayloads.forEach(function(payload) {
        // Will this be a db payload? db config payload?? dunno
        validateDbPayload(payload);
        this.publishPayload(payload);
      }, this);
    }.bind(this));
  }
});

// "use strict";
//
// var q = require('q'),
// fs = require('fs'),
// path = require('path'),
// insertionStatuses = ['ignored', 'updated', 'stored'],
// clientConnection;
//
// function getClient() {
//   if (clientConnection) {
//     return clientConnection;
//   }
//   throw 'No DB client - error connecting on startup? Incorrect configuration?';
// }
//
// function buildPullRequestRecord(pull) {
//   return {
//     pr_id: pull.pull_request.id,
//     repo_id: pull.repository.id,
//     repo: pull.repository.name,
//     number: pull.number,
//     head: pull.pull_request.head.sha,
//     merged: false,
//     status: 'open',
//     jobs: {}
//
//     // // Not used right now
//     // merge_result: null,
//     // extra_info: pull
//   };
// }
//
// module.exports = require('./adapter').extend({
//   init: function(option) {
//     this.name = 'db';
//     this.pluginType = 'dbs';
//     this._super(option);
//   },
//
//   setClient: function(client) {
//     if (!this.config.get(client)) {
//       this.log.error('No config for db.<client>, ignoring', {client: client});
//       return;
//     }
//
//     var clientPath = this.config.get('client_path') ||
//                      path.join(__dirname, '../plugins/dbs/', client + '.js');
//     if (fs.existsSync(clientPath)) {
//       var ClientObj = require(clientPath);
//
//       q.fcall(function() {
//         var c = new ClientObj(this.config.get(client));
//         c.log = this.log;
//         return c;
//       }.bind(this))
//       .then(function(instance) {
//         clientConnection = instance;
//       }.bind(this))
//       .catch(this.log.error(this.error))
//       .done();
//
//       return;
//     }
//
//     this.log.error(clientPath + ' does not exist, ignoring');
//   },
//
//   findPullRequest: function(pull) {
//     this.log.debug("finding pull_request - not implemented");
//
//     this.publish("pull_request.not_found", pull);
//   },
//
//   insertPullRequest: function(pull) {
//     this.log.debug("inserting pull_request");
//
//     var self = this;
//
//     return q.fcall(getClient)
//     .thenResolve(pull)
//     .then(buildPullRequestRecord)
//     .then(function(record) {
//       return clientConnection.insertPull(record)
//       .then(function(res) {
//         if (!!~insertionStatuses.indexOf(res)) {
//           self.publish('pull_request.' + res, record);
//           return;
//         }
//
//         // -1 means (to us) that nothing happened
//         if (!~res) {
//           self.publish('pull_request.not_stored', record);
//           return;
//         }
//         // >= 1 means that something was inserted
//         if (res) {
//           self.publish('pull_request.stored', record);
//           return;
//         }
//         // 0 means that something happened, but nothing was added
//         self.publish('pull_request.updated', record);
//       })
//       .catch(function(err) {
//         pull.error = err;
//         self.publish('pull_request.not_stored', record);
//       })
//       .done();
//     })
//     .catch(this.log.error(this.error))
//     .done();
//   },
//
//   insertPullRequestJob: function(prJob) {
//     this.log.debug("attaching job to pr");
//
//     // TODO: check for job existing and other cases
//
//     return q.fcall(getClient)
//     .then(function(client) {
//
//       client.insertPullRequestJob(prJob.pull, prJob.job);
//       this.publish("pull_request.build_stored", prJob.pull);
//
//     }.bind(this))
//     .catch(this.log.error(this.error))
//     .done();
//   }
// });
//
// //
// // function buildPushQuery(push) {
// //   if (!push.repository) {
// //     throw 'Push missing repository';
// //   }
// //
// //   if (!push.repository.name) {
// //     throw 'Push missing repository name';
// //   }
// //
// //   if (!push.repository.organization) {
// //     throw 'Push missing repository name';
// //   }
// //
// //   if (!push.ref) {
// //     throw 'Push missing ref';
// //   }
// //
// //   if (!push.after) {
// //     throw 'Push missing after SHA';
// //   }
// //
// //   return {
// //     ref: push.ref,
// //     sha: push.after,
// //     repo: push.repository.organization + '/' + push.repository.name
// //   };
// // }
// //
// // function buildPushRecord(push) {
// //   var record = buildPushQuery(push);
// //   record.job = {
// //     id: null,
// //     result: null,
// //     status: null
// //   };
// //
// //   return record;
// // }
// //
// // function buildPullQuery(pull) {
// //   if (!pull.number) {
// //     throw 'missing PR number';
// //   }
// //   if (!pull.base || !pull.base.repo || !pull.base.repo.full_name) {
// //     throw 'invalid PR base';
// //   }
// //   return {
// //     number: pull.number,
// //     repo: pull.base.repo.full_name
// //   };
// // }
// //
// // function buildPullRecord(pull) {
// //
// // }
// //
// // function getClient() {
// //   if (clientConnection) {
// //     return clientConnection;
// //   }
// //   throw 'No DB client - error connecting on startup? Incorrect configuration?';
// // }
// //
// // module.exports = require('../vent').extend({
// //   init: function(option) {
// //     // TODO: think about putting this into vent instead
// //     option = require('nconf').defaults(option);
// //     this._super(option);
// //   },
// //
// //   setClient: function(client) {
// //     if (!this.config.get(client)) {
// //       this.log.error('No config for db.<client>, ignoring', {client: client});
// //       return;
// //     }
// //
// //     var clientPath = this.config.get('client_path') ||
// //                      path.join(__dirname, '../plugins/dbs/', client + '.js');
// //     if (fs.existsSync(clientPath)) {
// //       var ClientObj = require(clientPath);
// //
// //       q.fcall(function() {
// //         return new ClientObj(this.config.get(client));
// //       }.bind(this))
// //       .then(function(instance) {
// //         clientConnection = instance;
// //       })
// //       .catch(this.log.error)
// //       .done();
// //
// //       return;
// //     }
// //
// //     this.log.error(clientPath + ' does not exist, ignoring');
// //   },
// //
// //   findPendingJobs: function() {
// //     q.fcall(getClient)
// //
// //     .then(clientConnection.findPendingPushJobs)
// //     .then(function(pulls) {
// //       pulls.forEach(function(pull) {
// //         this.publish('pull_request.build_pending', pull);
// //       }.bind(this));
// //     }.bind(this))
// //
// //     .then(clientConnection.findPendingPullJobs)
// //     .then(function(pushes) {
// //       pushes.forEach(function(push) {
// //         this.publish('push.build_pending', push);
// //       }.bind(this));
// //     }.bind(this))
// //
// //     .catch(this.log.error)
// //     .done();
// //   },
// //
// //   insertPush: function(push) {
// //     var self = this;
// //
// //     return q.fcall(getClient)
// //     .thenResolve(push)
// //     .then(buildPushRecord)
// //     .then(function(record) {
// //       return clientConnection.insertPush(record)
// //       .then(function(res) {
// //         self.publish('push.stored', push);
// //       })
// //       .catch(function(err) {
// //         push.error = err;
// //         self.publish('push.not_stored', push);
// //       })
// //       .done();
// //     })
// //     .catch(self.error)
// //     .done();
// //   },
// //
// //   findPush: function(push) {
// //     var self = this;
// //
// //     return q.fcall(getClient)
// //     .thenResolve(push)
// //     .then(buildPushQuery)
// //     .then(function(query) {
// //       return clientConnection.findPush(query)
// //       .then(function(item) {
// //         self.publish((item) ? 'push.found' : 'push.not_found', push);
// //       })
// //       .catch(self.error)
// //       .done();
// //     })
// //     .catch(self.error)
// //     .done();
// //   },
// //
// //   insertPull: function(pull) {
// //     var self = this;
// //
// //     return q.fcall(getClient)
// //     .thenResolve(pull)
// //     .then(buildPullRecord)
// //     .then(function(record) {
// //       return clientConnection.insertPull(record)
// //       .then(function(res) {
// //         if (!!~insertionStatuses.indexOf(res)) {
// //           self.publish('pull_request.' + res, pull);
// //           return;
// //         }
// //
// //         // -1 means (to us) that nothing happened
// //         if (!~res) {
// //           self.publish('pull_request.not_stored', pull);
// //           return;
// //         }
// //         // >= 1 means that something was inserted
// //         if (res) {
// //           self.publish('pull_request.stored', pull);
// //           return;
// //         }
// //         // 0 means that something happened, but nothing was added
// //         self.publish('pull_request.updated', pull);
// //       })
// //       .catch(function(err) {
// //         pull.error = err;
// //         self.publish('pull_request.not_stored', pull);
// //       })
// //       .done();
// //     })
// //     .catch(self.error)
// //     .done();
// //   },
// //
// //   findPull: function(pull) {
// //     var self = this;
// //
// //     return q.fcall(getClient)
// //     .thenResolve(pull)
// //     .then(buildPullQuery)
// //     .then(function(query) {
// //       return clientConnection.findPush(query)
// //       .then(function(item) {
// //         self.publish((item) ? 'pull_request.found' : 'pull_request.not_found', pull);
// //       })
// //       .catch(self.error)
// //       .done();
// //     })
// //     .catch(self.error)
// //     .done();
// //   }
// // });
