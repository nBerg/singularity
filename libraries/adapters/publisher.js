"use strict";

var q = require('q');

module.exports = require('./adapter').extend({
  name: 'publisher',
  pluginType: 'publisher',
  bound_fx: ['createPendingStatus'],

  createStatus: function(payload) {
    this.log.debug('creating status - not implemented');

    /*
      validatePayload(payload)?

      switch status
      case pending:
        if (build == null)
          paylod.message = 'job has been added to queue'
          res = plugin.createQueuedStatus(payload)
        else
          payload.message = 'currently running'
          res = plugin.createPendingStatus(payload)
      case success:
        payload.message = 'successfully built'
        res = plugin.createSuccessStatus(payload)
      case failure:
        payload.message = 'failed to build'
        res = plugin.createFailureStatus(payload)
      case error:
        payload.message = 'There was an error trying to test this pr'
        res = plugin.createErrorStatus(payload)
      default:
        shouldn't ever get here cuz validated, but throw some sort of error


      if (res == success)
        // Does this need to return some payload?
        publish('published.success')
      else
        publish('published.error')
     */
  }
});
