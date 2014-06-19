"use strict";

var q = require('q'),
    publisher;

module.exports = require('./adapter').extend({
  init: function(option) {
    this.name = 'publish';
    this.pluginType = 'publishers';
    this._super(option);
  },

  setPublisher: function(source) {
    // TODO: do this smarter
    publisher = require('../plugins/publishers/' + source);
  },

  createStatus: function(status) {
    this.log.debug('creating status - not implemented');
  }
});
