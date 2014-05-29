"use strict";

var postal = require('postal'),
channel;

// vent: something turns a bunch of knobs
// ...and things just keep coming out
// ...of all the...holes...? :|
module.exports = require('nbd/Class').extend({
  name: 'unnamed-vent',

  setChannel: function(channelName) {
    channel = postal.channel(channelName);
  },

  publish: function(topic, data) {
    this.log.debug(this.name + ': ' + topic);
    if (!channel) {
      this.error('cannot publish topic, no channel', {topic: topic, vent: this.name});
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
