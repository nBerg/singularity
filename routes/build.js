var q = require('q'),
    payload = require('../libraries/payloads/http');

function handleRequest(req) {
  q(['build.payload', req])
  .spread(payload.preparePayload);
}

handleRequest.method = "post";

module.exports = handleRequest;
