"use strict";

var winston = require('winston'),
logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)()
  ]
});
logger.cli();

function formatLogArgs(args) {
  args = Array.prototype.slice.call(args);
  args[0] = (typeof args[0] === 'string') ? args[0] : args[0].toString();
  return args;
}

// vent: something turns a bunch of knobs
// ...and things just keep coming out
// ...of all the...holes...? :|
module.exports = require('nbd/Class').extend({
  init: function(option) {
    this.config = option;
    this.log = this.log || logger;
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.error = this.error.bind(this);
  },

  info: function() {
    this.log.info.apply(this.log, formatLogArgs(arguments));
  },

  debug: function() {
    this.log.debug.apply(this.log, formatLogArgs(arguments));
  },

  error: function() {
    this.log.error.apply(this.log, formatLogArgs(arguments));
  }
});
