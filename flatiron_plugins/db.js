"use strict";

var plugin,
Db = require('../libraries/adapters/db');

// TODO: refactor so that it's easy to swap this out with other DB libs
module.exports = plugin = {
  name: 'Database',

  attach: function(options) {
    this.log.debug("attaching db");
    this.db = new Db(options);
    this.db.log = this.log.get('console');
  },

  init: function(done) {
    this.db.setClient(this.config.get('db').client);

    done();
  }
};
