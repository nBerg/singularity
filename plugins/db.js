"use strict";

var plugin,
db = require('../libraries/db');

// TODO: refactor so that it's easy to swap this out with other DB libs
module.exports = plugin = {
  name: 'Database',

  attach: function(options) {
    this.db = new db(options);
    this.db.log = this.log.get('console');
  },

  init: function(done) {
    this.db.setClient(this.config.get('db.client') || 'mongo');
    done();
  }
};
