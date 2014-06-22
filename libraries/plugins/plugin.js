"use strict";

var postal = require('postal');

module.exports = require('../vent').extend({
  name: 'unnamed-vent',
  channel: undefined,

  setChannel: function(channelName) {
    this.channel = postal.channel(channelName);
  },

  publish: function(topic, data) {
    if (!this.channel) {
      this.error(
        'cannot publish topic, no channel',
        {topic: topic, vent: this.name}
      );
      return;
    }
    this.channel.publish(topic, data);
  },

  init: function(option) {
    this._super(option);
    this.setChannel = this.setChannel.bind(this);
  }
});
