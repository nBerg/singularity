"use strict";

// TODO: abstract receiver out
var GithubWrapper = require('../libraries/plugins/receivers/github'),
plugin;

module.exports = plugin = {
  name: 'GithubApi',

  attach: function(options) {
    this.github = new GithubWrapper(options);
    this.github.log = this.log.get('console');
  },

  init: function(done) {
    this.github.start();
    done();
  }
};
