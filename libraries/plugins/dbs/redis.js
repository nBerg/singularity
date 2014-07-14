"use strict";

var q = require('q'),
    redis = require('redis'),
    DbPayload = require('../../payloads/db').DbPayload;

module.exports = require('../plugin').extend({
  name: 'redis',

  init: function(option) {
    this._super(option);

    // wait for ready event
    this._client = redis.createClient(
      (option.port || null),
      (option.host || null),
      (option.options || {})
    );
  },

  addProposalToRepo: function(payload) {
    var repoKey = payload.repo,
        proposalKey = 'proposals:' + payload.change_id,
        value = payload;  // Change at all?

    return q(payload)
    .then(function(payload) {
      // Create the proposal hash
      this._client.set(proposalKey, JSON.stringify(value));

      // Add the key to the proposal hash to the repo proposals list
      this._client.rpush(repoKey + ':proposals', proposalKey);
    }.bind(this))
    .then(function() {
      return new DbPayload({});
    });
  }
});
