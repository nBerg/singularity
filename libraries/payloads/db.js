"use strict";

module.exports.DbPayload = require('./payload').extend({
  payload: 'db',

  // TODO: flesh this out, this is just what the publisher needs
  required_fields: [
  ],
  field_vals: {
  }
});
