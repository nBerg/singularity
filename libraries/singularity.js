var Class = require('nbd/Class'),
    pubsub = require('nbd/trait/pubsub'),
    q = require('q'),
    app = require('flatiron').app;

function requestWrapper(route) {
  var deferred = q.defer();
  deferred.resolve(this.req);

  var retval = deferred.promise.then(route);

  retval.done(function(meta) {
    this.res.statusCode = meta.status || 200;
    this.res.write(meta.body || meta);
  }.bind(this), function(meta) {
    this.res.statusCode = meta.status || 500;
    this.res.write(meta.body || meta);
  })
  .finally(function() {
    this.res.end();
  }.bind(this));

  return retval;
}

var Singularity = Class.extend({
  route: function(routes) {
    if (routes == null) { return; }

    Object.keys(routes)
    .forEach(function(path) {
      var self = this,
      route = this.routes[path],
      args = [
        path,
        function() {
          requestWrapper.call(this, route)
          .then(self.trigger.bind(self));
        }
      ];

      if (route.method) {
        args.unshift(route.method);
      }
      app.router.on.apply(app.router, args);
    }, this);
  }
})
.mixin(pubsub);

module.exports = new Singularity();
