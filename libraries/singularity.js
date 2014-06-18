var EventMapper = require('./event_mapper'),
    q = require('q'),
    app = require('flatiron').app,
    fs = require('fs'),
    path = require('path');

/**
 * Used to safely wrap function ret vals & respond to requests
 *
 * @param {Object} route A function that returns *some* object
 * @return {Object} A promise
 */
function requestWrapper(route) {
  var deferred = q.defer();
  deferred.resolve(this.req);

  var self = this,
      retval = deferred.promise.then(route),
      writeResponse = function(defaultStatus, meta) {
        self.res.statusCode = meta.status || defaultStatus;
        self.res.writeHead(meta.body || meta);
        self.res.write(JSON.stringify(meta.body || meta));
        self.res.end();
      };

  retval.done(function(meta) {
    writeResponse(200, meta);
  }, function(meta) {
    writeResponse(500, meta);
  });

  return retval;
}

/**
 * Given a path and a route object, build the arguments
 * needed to add to the router.
 *
 * @param {string} path        the path
 * @param {Object|[]} routes   object with route callback and method
 * @param {Object} EventMapper object to pass generated route
 *                             metadata to
 * @return [{Object}] router arguments object
 */
function buildRoutes(path, routes, eventHandler) {
  if (!Array.isArray(routes)) {
    routes = [routes];
  }

  var routePromises = routes.map(function(route) {
    var defer = q.defer();
    defer.resolve([
      route.method || 'get',
      path,
      function() {
        requestWrapper.call(this, route)
        .then(eventHandler.react.bind(eventHandler));
      }
    ]);
    return defer.promise;
  });

  return q.all(routePromises);
}

/**
 * Add a route to the router.
 *
 * @param {Object[]} routes array args for router.on()
 */
function dispatchRoutes(routes) {
  routes.forEach(function(route) {
    app.router.on.apply(app.router, route);
  });
}

/**
 * Generates flatiron plugin name from a filename
 *
 * @param {String} file
 * @return {Promise} string
 */
function pluginNameFromFile(file) {
  var defer = q.defer();
  defer.resolve(file.substring(0, file.lastIndexOf('.')));
  return defer.promise;
}

/**
 * Validates a flatiron plugin file
 *
 * @param {String} file
 * @return {Promise} file
 */
function checkPluginFile(file) {
  var defer = q.defer();
  if (!file.match(/\.js$/)) {
    throw file + ' **PLUGIN FILE NOT VALID**';
  }
  defer.resolve(file);
  return defer.promise;
}

/**
 * Retrieves flatiron plugin config
 *
 * @param {String} name
 * @return {Promise} Resolves with plugin cfg if found
 */
function pluginConfig(name) {
  var defer = q.defer(),
  cfg = app.config.get(name);
  if (cfg && cfg.disabled) {
    defer.reject(name + ' is disabled');
  }
  else if (cfg) {
    defer.resolve(cfg);
  }
  else {
    defer.reject('No config found for ' + name);
  }
  return defer.promise;
}

/**
 * Injects flatiron plugin into app
 *
 * @param {String} file path to file
 * @param {Object} cfg cfg for given plugin
 */
function appUsePlugin(file, cfg) {
  app.use(require(file), cfg);
}

var Singularity = require('nbd/Class').extend({
  init: function() {
    app.config.defaults(require('./config'));
    app.init();
    this.log = app.log.get('console');
    this.eventMapper = new EventMapper();
  },

  route: function(routes) {
    if (routes == null) { return; }

    var self = this,
    promises = Object.keys(routes)
    .map(function(path) {
      return buildRoutes(path, routes[path], self.eventMapper)
      .then(dispatchRoutes);
    }, this);

    return q.allSettled(promises).done();
  },

  mapTriggers: function(triggers) {
    triggers.forEach(function(trigger) {
      this.eventMapper.addTrigger(trigger);
    }, this);
  },

  injectFlatironPlugins: function(dir) {
    var self = this;
    return q.ninvoke(fs, 'readdir', dir)
    .then(function(files) {
      files.forEach(function(file) {
        q.resolve(path.join(dir, file))
        .then(checkPluginFile)
        .thenResolve(
          q.all([
            path.join(dir, file),
            pluginNameFromFile(file)
            .then(pluginConfig)
          ])
        )
        .spread(appUsePlugin)
        .catch(self.log.error.bind(self));
      });
    })
    .done();
  }
});

module.exports = new Singularity();
