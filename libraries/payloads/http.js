"use strict";

var HttpPayload;

module.exports.HttpPayload = HttpPayload = require('./payload').extend({
  name: 'http',
  required_fields: ['__headers']
});

/**
 * Utility fx to wrap HTTP requests into objects that are readable by the rest of
 * the system
 *
 * @function payload
 * @param {String} event Name of the event (channel.topic pair)
 * @param {Object} request Raw flatiron request object
 */
module.exports = function payload(event, request) {
  return (new HttpPayload(request.body))
  .setName(event)
  .appendData('__headers', request.headers)
  .validate()
  .payload();
};
