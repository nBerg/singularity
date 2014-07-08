"use strict";

module.exports.BuildPayload = require('./payload').extend({
  payload: 'build',

  // TODO: flesh this out, this is just what the publisher needs
  required_fields: [
      'artifacts',
      'buildId',
      'link',
      'owner',
      'repo',
      'sha',
      'status'
  ],
  field_vals: {
    //should this be the type?
    status: ['queued', 'building', 'success', 'failure', 'error']
  }
});
