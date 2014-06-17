"use strict";

var plugin,
Publisher = require('../libraries/adapters/publisher');

// TODO: refactor so that it's easy to swap this out with other DB libs
module.exports = plugin = {
  name: 'Publisher',

  attach: function(options) {
    this.publisher = new Publisher(options);
    this.publisher.log = this.log.get('console');
  },

  init: function(done) {
    this.publisher.setPublisher('github');
    done();
  }
};
