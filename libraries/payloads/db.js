"use strict";

module.exports.DbPayload = require('./payload').extend({
  payload: 'db',

  // TODO: flesh this out, this is just what the publisher needs
  required_fields: [
      'repo',
      'repo_id',
      'pull_id',
      'pull_number',
      'status',

      // link, id?
      // if this is null, and the status is pending,
      // it implies the job has been queued/triggered,
      // but the job has not started running yet
      // (or singularity doesn't know about it)
      'build',
  ],
  field_vals: {
    status: ['pending', 'success', 'failure', 'error']
  }
});
