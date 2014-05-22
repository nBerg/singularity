"use strict";

var GithubWrapper = require('../libraries/github'),
plugin;

module.exports = plugin = {
  name: 'GithubApi',

  attach: function(options) {
    this.github = new GithubWrapper(options);
    this.github.log = this.log.get(plugin.name);
  },

  init: function(done) {
    this.github.start();
    done();
  }
};
