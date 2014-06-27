var range_check = require('range_check'),
    q = require('q'),
    payload = require('../libraries/payloads/http');

// We only want to accept local requests and GitHub requests. See the Service
// Hooks page of any repo you have admin access to to see the list of GitHub
// public IPs.
var allowed_ips = ['127.0.0.1'],
allowed_ranges = [
    '207.97.227.253/32',
    '50.57.128.197/32',
    '108.171.174.178/32',
    '50.57.231.61/32',
    '204.232.175.64/27',
    '192.30.252.0/22'
];

function ipCheck(request) {
  if (~allowed_ips.indexOf(request.connection.remoteAddress)) {
    return request;
  }
  if (allowed_ranges.some(function(range) {
    return range_check.in_range(request.connection.remoteAddress, range);
  })) {
    return request;
  }
  throw {
    status: 403,
    body: {
      message: 'Not allowed'
    }
  };
}

function handleRequest(request) {
  return q(request)
  .then(ipCheck)
  .then(function(req) { return ['hook.payload', req]; })
  .spread(payload.preparePayload);
}

handleRequest.method = "post";

module.exports = handleRequest;
