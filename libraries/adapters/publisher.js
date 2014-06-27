"use strict";

var q = require('q');

module.exports = require('./adapter').extend({
  name: 'publisher',
  pluginType: 'publishers',
  bound_fx: ['createStatus'],

  createStatus: function(payload) {
    this.log.debug('creating status - not implemented');

    /*
      validatePayload(payload)?

      switch status
      case queued:
        paylod.message = 'job has been added to queue'
      case building:
        payload.message = 'currently running'
      case success:
        payload.message = 'successfully built'
      case failure:
        payload.message = 'failed to build'
      case error:
        payload.message = 'There was an error trying to test this pr'
      default:
        shouldn't ever get here cuz validated, but throw some sort of error

      res = plugin.createStatus(payload)


      if (res == success)
        // Does this need to return some payload?
        validatePublisherPayload(res)
        publish('published.success')
      else
        validatePublisherPayload(res)
        publish('published.error')
     */
  }
});
