var q = require('q'),
    payload = require('../../libraries/payloads/http');

function handleRequest(req) {
  return q(['build.update', req])
  .spread(payload.preparePayload);
}

handleRequest.method = "post";

module.exports = handleRequest;
