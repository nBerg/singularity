"use strict";

var q = require('q'),
    BuildPayload = require('../payloads/build').BuildPayload,
    PublisherPayload = require('../payloads/publisher').PublisherPayload;

/**
 * @param {Object} buildPayload
 */
function validateBuildPayload(buildPayload) {
  new BuildPayload(buildPayload).validate();
  return buildPayload;
}

/**
 * @param {Object} publisherPayload
 */
function validatePublisherPayload(publisherPayload) {
  new PublisherPayload(publisherPayload).validate();
  return publisherPayload;
}

/**
 * Set the message to publish based on the
 * status of the payload
 *
 * @param {Object} buildPayload
 */
function setStatusMessage(buildPayload) {
  switch (buildPayload.status) {
  case 'queued':
      buildPayload.message = 'job has been added to queue';
      break;
    case 'building':
      buildPayload.message = 'currently running';
      break;
    case 'success':
      buildPayload.message = 'successfully built';
      break;
    case 'failure':
      buildPayload.message = 'failed to build';
      break;
    case 'error':
      buildPayload.message = 'There was an error trying to test this pr';
      break;
    default:
      // TODO: throw error
      break;
  }

  return q(buildPayload);
}

function publishStatus(buildPayload) {
  return q(buildPayload)
  .then(this.createStatus.bind(this))
  .then(validatePublisherPayload);
}

module.exports = require('./adapter').extend({
  name: 'publisher',
  pluginType: 'publishers',

  createStatus: function(payload) {

    this.debug('creating status for', this.logForObject(payload));

    q(payload)
    .then(validateBuildPayload)
    .then(setStatusMessage)
    .then(function(buildPayload) {
      return this.executeInPlugins(publishStatus, payload);
    }.bind(this))
    .then(function(publisherPayloads) {
      publisherPayloads.forEach(function(payload) {
        this.publishPayload(payload);
      }, this);
    }.bind(this))
    .done();
  },

  start: function() {
    //nothing here
  }
});
