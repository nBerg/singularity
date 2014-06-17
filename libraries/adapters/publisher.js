"use strict";

var // q = require('q'),
    // async = require('async'),
    publisher;

module.exports = require('../vent').extend({
  init: function(option) {
    this._super(option);
  },

  start: function() {
  },

  setPublisher: function(source) {
    // TODO: do this smarter
    publisher = require('../plugins/publishers/' + source);
  },

  createStatus: function(status) {
    this.log.debug('creating status - not implemented');
  }
});
