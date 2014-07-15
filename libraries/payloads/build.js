"use strict";

module.exports.BuildPayload = require('./payload').extend({
  payload: 'build',

  // TODO: flesh this out, this is just what the publisher needs
  required_fields: [
      'cause',
      'artifacts',
      'buildId',
      'link',
      'project',
      'repo',
      'status',
      'triggeringPayload'
  ],
  field_vals: {
    //should this be the type?
    status: ['queued', 'building', 'success', 'failure', 'error']
  }
});
