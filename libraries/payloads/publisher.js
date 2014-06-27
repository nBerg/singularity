"use strict";

module.exports.PublisherPayload = require('./payload').extend({
  payload: 'publisher',

  // TODO: flesh this out, this is just what the publisher needs
  required_fields: [
      'repo',
      'owner',
      'sha',
      'status',

      // link, id?
      'buildLink',
      'type',
      'publishedMessage'
  ],
  field_vals: {
    status: ['queued', 'building', 'success', 'failure', 'error'],
    type: ['statusUpdate', 'comment']
  }
});
