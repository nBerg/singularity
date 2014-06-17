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

  return q.allSettled(routePromises);
}

/**
 * Add a route to the router.
 *
 * @param {Object[]} routes array args for router.on()
 */
function dispatchRoutes(routes) {
  routes.forEach(function(route) {
    app.router.on.apply(app.router, route);
  }, this);
}

/**
 * Given a config, fills in the blanks that are required
 *
 * @param {Object} config
 * @return {Object} updated config
 */
function standardizeConfig(config) {
  if (!config) {
    config = {};
  }

  if (!config.port) {
    config.port = 8080;
  }

  if (!config.log) {
    config.log = {
      console: {
        level: 'debug',
        colorize: true
      }
    };
  }

  if (!config.github) {
    config.github = {};
  }

  if (!config.github.repos) {
    config.github.repos = [];
  }

  if (!config.build) {
    config.build = {
      jenkins: {
        projects: [],
        push_projects: []
      }
    };
  }

  if (!config.db) {
    config.db = {
      mongo: {}
    };
  }

  if (!config.cache) {
    config.cache = {
      max: 64,
      maxAge: 60 * 1000
    };
  }

  return config;
}

var Singularity = require('nbd/Class').extend({
  init: function() {
    app.config.defaults(standardizeConfig({}));
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
    q.ninvoke(fs, 'readdir', dir)
     .then(function(files) {
       files.forEach(function(file) {
          var filename = path.join(dir, file),
              pluginName = file.substring(0, file.lastIndexOf('.')),
              appCfg = app.config.get(pluginName);

          if (!filename.match(/\.js$/) || !appCfg || appCfg.disabled) {
            this.log.debug('Ignore the fallen.', { name: pluginName });
            return;
          }

          var plugin = require(filename);
          plugin.name = pluginName;
          app.use(plugin, appCfg);
       }.bind(this));
     }.bind(this))
     .catch(this.error)
     .done();
  }
});

module.exports = new Singularity();
