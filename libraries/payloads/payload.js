"use strict";

function validationError(message) {
  throw '[payload.validate] ' + message;
}

function parse(body) {
  body = body || '{}';
  var data;

  try {
    data = (typeof body === 'string') ? JSON.parse(body) : body;
  }
  catch(err) {
    throw 'content type must == "application/json"';
  }

  return data;
}

/**
 * @module Payload
 * Wrapper class for Singularity "payload" objects - things that are passed
 * around between adapters, the event_mapper & receiver
 */
module.exports = require('nbd/Class').extend({
  required_fields: [],
  field_vals: {},
  name: 'payload',

  init: function(data) {
    this.original_data = data;
    this.data = parse(data);
  },

  setName: function(name) {
    if (typeof name !== 'string') {
      throw 'payload name "' + name + '"given not string';
    }
    this.name = name;
    return this;
  },

  appendData: function(field, data) {
    this.data = this.data || {};
    this.data[field] = data;
    return this;
  },

  payload: function() {
    var pl = {};
    pl[this.name] = this.data || {};
    return pl;
  },

  validate: function() {
    if (!this.data.hasOwnProperty('type')) {
      validationError('missing payload type!');
    }
    this.required_fields.forEach(function(field) {
      if (!this.data.hasOwnProperty(field)) {
        validationError('missing field ' + field);
      }
      if (this.field_vals[field]) {
        if (!~this.field_vals[field].indexOf(this.data[field])) {
          validationError(
            'value for ' +
            field +
            '(' + this.data[field] + ')' +
            ' not in ' +
            this.field_vals[field].toString()
          );
        }
      }
    }, this);
    return this;
  }
});
