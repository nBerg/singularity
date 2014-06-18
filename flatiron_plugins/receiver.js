"use strict";

var plugin,
Receiver = require('../libraries/adapters/receiver');

// TODO: refactor so that it's easy to swap this out with other DB libs
module.exports = plugin = {
  name: 'Receiver',

  attach: function(options) {
    this.receiver = new Receiver(options);
    this.receiver.log = this.log.get('console');
  },

  init: function(done) {
    this.receiver.setReceiver(this.config.get('receiver').client);
    done();
  }
};
