"use strict";

var q = require('q'),
    // async = require('async'),

    // TODO: Keep these concepts? or rename?
    allowed_events = ['pull_request', 'retest', 'push'];

module.exports = require('../vent').extend({
  receiver: undefined,

  init: function(option) {
    // TODO: think about putting this into vent instead
    option = require('nconf').defaults(option);
    this._super(option);
  },

  setReceiver: function(plugin) {
    var Receiver = require('../plugins/receivers/' + plugin);

    q.fcall(function() {
      var r = new Receiver(this.config.get(plugin));
      r.log = this.log;

      return r;
    }.bind(this))
    .then(function(instance) {
      this.receiver = instance;
    }.bind(this))
    .catch(this.log.error(this.error))
    .done();

    return;
  },

  start: function() {
  },

  eventCheck: function(request) {
    var eventType = this.receiver.parseEvent(request);

    if (!~allowed_events.indexOf(eventType)) {
      throw {
          status: 501,
          body: {
            message: 'Unsupported event type ' + eventType
          }
      };
    }

    this.log.debug('Event type ' + eventType + ' detected');

    return eventType;
  },

  handleRequest: function(request) {
    this.log.debug('handling new request');

    return {
      type: this.eventCheck(request),
      data: this.receiver.handleRequest(request)
    };
  },

  handlePullRequest: function(payload) {
    this.log.debug('handling pull_request');

    var pull_request = this.receiver.handlePullRequest(payload);

    if (!~['validated', 'updated', 'closed'].indexOf(pull_request.action)) {
      //not supported
    }

    this.publish('pull_request.' + pull_request.action, payload);
  },
  //
  // processPullRequest: function(payload) {
  //   this.log.debug('processing pull_request');
  //
  //   this.publish('pull_request.updated');
  // },

  handlePush: function(payload) {
    this.log.debug('processing push - not implemented yet');

    this.publish('push.validated');
  },

  handleRetest: function(paylod) {
    this.recevier.debug('handling retest - not implemented yet');

    //TODO: Decide what to do here
  }
});
