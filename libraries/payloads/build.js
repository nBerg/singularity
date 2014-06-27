"use strict";

module.exports.BuildPayload = require('./payload').extend({
  payload: 'build',

  // TODO: flesh this out, this is just what the publisher needs
  required_fields: [
      'repo',
      'owner',
      'sha',
      'status',

      // link, id?
      'buildLink'
  ],
  field_vals: {
    status: ['queued', 'building', 'success', 'failure', 'error']
  }
});
