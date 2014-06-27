"use strict";

var q = require('q'),
async = require('async');

function validateOpts(opts) {
  return opts;
}

module.exports = require('./adapter').extend({
  init: function(option) {
    this.name = 'build';
    this.pluginType = 'builders';
    this._super(option);
  },

  buildChange: function(changePayload) {
  },

  buildProposal: function(proposalPayload) {
  }
});
