var q = require('q'),
    app = require('flatiron').app,
    fs = require('fs'),
    path = require('path'),
    postal = require('postal');

/**
 * Iterate through an array of postal envelopes & publish
 *
 * @param {Array} events Objects that have channel, topic & data fields
 */
function publishEvents(events) {
  events.forEach(function(event) {
    postal.publish(event);
  });
}

/**
 * Given an object, attempt to create postal objects that *may* be
 * recognizable internally
 *
 * @param {Object} meta Loops through the fields of meta, except for
 *                      body & status, formats the data into postal
 *                      postal envelopes. The returned promise
 *                      resolves with an array of these objects
 * @return {Object} A promise
 */
function packageMeta(meta) {
  return q.fcall(function() {
    return Object.keys(meta).filter(function(field) {
      return !~['body', 'status'].indexOf(field);
    });
  })
  .then(function(metaFields) {
    var envelopes = [];

    // honestly have no idea if this resolves synchronously
    metaFields.forEach(function(field) {
      envelopes.push({
        channel: field.substring(0, field.indexOf('.')),
        topic: field.substring(field.indexOf('.') + 1, field.length),
        data: meta[field]
      });
    });

    return envelopes;
  });
}

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
      retval = deferred.promise.then(function(req) {
        return route(req, app);
      }),
      writeResponse = function(defaultStatus, meta) {
        self.res.statusCode = meta.status || defaultStatus;
        self.res.writeHead(meta.body || meta);
        self.res.write(JSON.stringify(meta.body || meta));
        self.res.end();
      };

  retval.done(function(meta) {
    app.log.info('done success');
    writeResponse(200, meta);
  }, function(meta) {
    app.log.info('done failure');
    writeResponse(500, meta);
  });

  return retval;
}

/**
 * Given a path and a route, build the arguments
 * needed to add to the router.
 *
 * @param {string} the path
 * @param {Object} the object with route callback and method
 * @return [{Object}] router arguments object
 */
function buildRouteArgs(path, route) {
  return [
    route.method || 'get',
    path,
    function() {
      requestWrapper.call(this, route)
      .then(packageMeta)
      .then(publishEvents);
    }
  ];
}

/**
 * Add a route to the router.
 *
 * @param {string} the path
 * @param {(Object | Object[])} object(s) with route callback and method
 */
function addToRouter(path, route) {
   if (!Array.isArray(route)) {
     route = [route];
   }

  route.forEach(function(route) {
    app.router.on.apply(app.router, buildRouteArgs(path, route));
  }, this);
}

/**
 * Given a config, fills in the blanks that are required
 *
 * @param {Object} config
 * @return {Object} updated config
 */
function standardizeConfig(config) {
  if (!config.receivers) {
    config.receiver = {
      'github': {
        'repos': [],
        'skip_file_listing': true
      }
    };
  }

  if (!config.build) {
    config.build = {
      'jenkins': {
        'projects': [],
        'push_projects': {}
      }
    };
  }

  if (!config.db) {
    config.db = {
      'memory': {
        // "auth": {
        //   "user": "username",
        //   "pass": "password",
        //   "host": "localhost",
        //   "port": 27017,
        //   "db": "singularityOverhaul",
        //   "slaveOk": false
        // }
      }
    };
  }

  if (!config.publisher) {
    config.publisher = {};
  }

  return config;
}

function validateSubscriptions(events) {
  return q.fcall(function validateEvents() {
    if (!Array.isArray(events)) {
      throw 'events must be an array';
    }
    events.forEach(function validateEvent(event) {
      ['channel', 'topic', 'vent', 'callback'].forEach(function(param) {
        if (!event[param]) {
          throw 'missing param "' + param + '" in ' + JSON.stringify(event);
        }
      });
    });
    return events;
  });
}

function createSubscriptions(events) {
  events.forEach(function(event) {
    app.log.get('console').debug('Assuming direct control.', event);

    var channelObj = postal.channel(event.channel),
    callback = function(data, envelope) {
      app.log.get('console').debug('[channel.topic -> vent.callback]', event);
      app[event.vent][event.callback](data);
    };

    channelObj.subscribe(event.topic, callback);
  });
}

var Singularity = require('nbd/Class').extend({
  init: function() {
    var defaultConfig = standardizeConfig({
      port: 8080,
      log: {
        console: {
          level: 'debug',
          colorize: true
        }
      }
    });
    app.config.defaults(defaultConfig);
    app.init();
    this.log = app.log.get('console');
  },

  createChannelEventChain: function(chain) {
    validateSubscriptions(chain)
    .then(createSubscriptions)
    .catch(this.log.error)
    .done();
  },

  route: function(routes) {
    if (routes == null) { return; }

    Object.keys(routes)
    .forEach(function(path) {
      addToRouter(path, routes[path]);
    }, this);
  },

  injectFlatironPlugins: function(dir) {
    q.ninvoke(fs, 'readdir', dir)
     .then(function(files) {
       files.forEach(function(file) {
          var filename = path.join(dir, file),
              pluginName = file.substring(0, file.lastIndexOf('.')),
              appCfg = app.config.get(pluginName);

          this.log.debug('Trying to attach flatiron plugin: ' + pluginName);
          this.log.debug('  ' + pluginName + ' config: ');
          this.log.debug(appCfg);

          if (!filename.match(/\.js$/) || !appCfg || appCfg.disabled) {
            this.log.debug('Ignore the fallen.', { name: pluginName });
            return;
          }

          var plugin = require(filename);

          plugin.name = pluginName;
          app.use(plugin, appCfg);
          app[pluginName].setChannel(pluginName);
          app[pluginName].name = pluginName;

          postal.subscribe({
            channel: pluginName,
            topic: 'i_am_harbinger',
            callback: function(data, envelope) {
              this.log.debug('We are Harbinger.', arguments);
            }.bind(this)
          });

          app[pluginName].publish('i_am_harbinger', pluginName);
       }.bind(this));
     }.bind(this))
     .catch(this.error)
     .done();
  }
});

module.exports = new Singularity();

/*
  app.config = standardizeConfig(config || {});
  app.log = log || new Logger(config.log_level || 'debug');
  app.db = Db.init(config.db, app.log);
  app.listeners = [];

  app.attemptDbConfigLoad = function(callback) {
    callback = callback || function() {};

    if (!app.db) {
      app.log.info('no db connection, loading config from file');
      callback();
      return;
    }

    if (!app.config.persist_config) {
      app.log.info('warning: "persist_config" option is off; config will always be loaded from file');
      app.db.getSingularityConfig(function(err, storedConfig) {
        if (err) {
          callback();
          return;
        }

        if (storedConfig && Object.keys(storedConfig).length > 0) {
          app.log.info('Found a configuration in the DB! "persist_config" must be true to load it; Using file');
        }
      });

      callback();
      return;
    }

    app.db.getSingularityConfig(function(err, storedConfig) {
      if (err) {
        app.log.error('Singularity: could not get db config, continuing to use file', err);
        callback();
        return;
      }

      if (!storedConfig || Object.keys(storedConfig).length === 0) {
        app.db.saveSingularityConfig(config, function(err, res) {
          if (err) {
            app.log.error('initial config db write failed', err);
            process.exit(1);
          }

          app.log.error('stored config is empty; using file, storing config');
        });

        callback();
        return;
      }

      app.config = storedConfig;
      app.log.info('Singularity: Using stored application configuration');
      callback();
    });
  };

  app.addRepoPRJob = function(params) {
    if (app.config.plugins.github.repos.indexOf(params.repo) !== -1) {
      app.log.info('duplicate github repo', params);
      return false;
    }

    var duplicate = app.config.plugins.jenkins.projects.some(function(project) {
      return (params.project === project.name || params.repo === project.repo);
    });

    if (duplicate) {
      app.log.info('duplicate jenkins repo or project', params);
      return false;
    }

    app.emit('github.new_repo', params.repo);
    app.emit('jenkins.new_pr_job', {
      name: params.project,
      repo: params.repo,
      token: params.token || false
    });
    app.log.info('Singularity: runtime config updated');

    return true;
  };

  app.getDomain = function() {
    return (app.config.host || 'localhost') + ':' + (app.config.port || '80');
  };

  app.on('singularity.configuration.updated', function(plugin) {
    if (!app.config.persist_config) {
      app.log.info('not persisting config changes', { requesting_plugin: plugin });
    }

    app.db.saveSingularityConfig(app.config, function(err, res) {
      if (err) {
        app.log.error('error saving runtime configuration, exiting!', { error: err });
        process.exit(1);
      }

      app.log.info('Singularity: saved config into DB', { notifying_plugin: plugin });
    });
  });

  return app;
};
*/
