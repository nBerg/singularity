var range_check = require('range_check');

// We only want to accept local requests and GitHub requests. See the Service Hooks
// page of any repo you have admin access to to see the list of GitHub public IPs.
var allowed_ips = ['127.0.0.1'],
    allowed_events = ['pull_request', 'issue_comment', 'push'],
    allowed_ranges = [
        '207.97.227.253/32',
        '50.57.128.197/32',
        '108.171.174.178/32',
        '50.57.231.61/32',
        '204.232.175.64/27',
        '192.30.252.0/22'
    ];

exports.init = function(app, request, response) {

  var response_obj = {
    message: 'received',
    error: false
  };

  if (allowed_ips.indexOf(request.connection.remoteAddress) === -1) {
    var allowed = false;
    for (var i in allowed_ranges) {
      if (range_check.in_range(request.connection.remoteAddress, allowed_ranges[i])) {
        allowed = true;
      }
    }

    if (!allowed) {
      app.log.debug('Received post from blocked ip: ' + request.connection.remoteAddress);
      response_obj.message = 'not allowed';
      response_obj.error = true;
      response.send(403, response_obj);
      return;
    }
  }

  if (typeof request.headers['x-github-event'] === 'undefined' ||
      allowed_events.indexOf(request.headers['x-github-event']) === -1) {
    app.log.debug('Received post for unsupported event: ' + request.headers['x-github-event']);
    response_obj.message = 'unsupported event type';
    response_obj.error = true;
    response.send(501, response_obj);
    return;
  }

  var data = '';
  request.on('data', function(chunk) {
    data += chunk.toString();
  });

  request.on('end', function() {
    app.log.debug('Received post for event: ' + request.headers['x-github-event']);
    app.emit(request.headers['x-github-event'], JSON.parse(data));
  });

  response.send(200, response_obj);
};
