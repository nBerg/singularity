"use strict";

module.exports = require('nbd/Class').extend({
  publisher: null,

  publish: function(topic, data) {
    if (!this.publisher) {
      this.error('cannot publish topic, no channel', arguments);
      return;
    }
    this.publisher(topic, data);
  },

  init: function(option) {
    this.config = option;
    this.error = this.error.bind(this);
  },

  error: function(error) {
    this.log.error(error);
  }
});
