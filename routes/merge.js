exports.init = function(request, response) {
  if (!request.query) {
    response.writeHead(501, { 'Content-Type': 'text/plain' });
    response.write('No query params.');
    response.end();
    return;
  }

  [ 'username', 'token', 'organization', 'repo', 'number' ].forEach(function(param) {

  });
};
