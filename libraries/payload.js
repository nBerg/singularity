"use strict";

function parseRequest(body) {
  body = body || '{}';
  var data;

  try {
    data = JSON.parse(JSON.stringify(body));
  }
  catch(err) {
    throw 'content type must == "application/json"';
  }

  return data;
}

module.exports = function createRequestWrapper(event, request) {
  if (typeof event !== 'string') {
    throw 'event given not string';
  }
  var payload = {};
  payload[event] = parseRequest(request.body);
  payload[event].__headers = request.headers;
  return payload;
};
