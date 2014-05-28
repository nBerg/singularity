"use strict";

var postal = require('postal'),
channel;

module.exports = require('nbd/Class').extend({

  setChannel: function(channelName) {
    channel = postal.channel(channelName);
  },

  publish: function(topic, data) {
    if (!channel) {
      this.error('cannot publish topic, no channel - ' + topic);
      return;
    }
    channel.publish(topic, data);
  },

  init: function(option) {
    this.config = option;
    this.error = this.error.bind(this);
  },

  error: function(error) {
    this.log.error(error);
  }
});
