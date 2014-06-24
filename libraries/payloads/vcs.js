"use strict";

module.exports.VcsPayload = require('./payload').extend({
  payload: 'vcs',
  required_fields: [
      'repo',
      'before',
      'after',
      'actor',    // who dunnit

      'repo_url',
      'base_ref', // base branch
      'fork_url',
      'fork_ref', // fork branch

      'status',
      'repo_id',  // github ID of repo
      'change',   // pull_request number
      'change_id' // actual pull_request ID
  ],
  field_vals: {
    // null status => N/A
    status: ['open', 'closed', 'merged', null]
  }
});
