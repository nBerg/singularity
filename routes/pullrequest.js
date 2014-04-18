exports.init = function(app, request, response) {
  if (!request.query) {
    response.writeHead(501, { 'Content-Type': 'text/plain' });
    response.write('No query params.');
    response.end();
    return;
  }

  else if (!request.query.repo || !request.query.number) {
    response.writeHead(501, { 'Content-Type': 'text/plain' });
    response.write('Missing either "repo" or "number" parameters.');
    response.end();
    return;
  }

  app.db.findPull(parseInt(request.query.number), request.query.repo, function(err, item) {
    if (err) {
      app.log.error(err);
      response.writeHead(500, { 'Content-Type': 'text/plain' });
      response.end();
    }

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write(JSON.stringify(item));
    response.end();
  });
};
