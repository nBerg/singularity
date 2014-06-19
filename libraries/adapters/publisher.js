"use strict";

var q = require('q'),
    publisher;

module.exports = require('./adapter').extend({
  init: function(option) {
    this.name = 'publish';
    this.pluginType = 'publishers';
    this._super(option);
  },

  createStatus: function(status) {
    this.log.debug('creating status - not implemented');
  }
});
