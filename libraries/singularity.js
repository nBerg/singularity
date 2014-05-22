var Class = require('nbd/Class'),
    q = require('q'),
    db = require('./db'),
    app = require('flatiron').app,
    fs = require('fs'),
    path = require('path'),
    postal = require('postal');

function publishEvents(events) {
  events.forEach(function(event) {
    postal.publish(event);
  });
}

function packageMeta(meta) {
  return q.fcall(function() {
    return Object.keys(meta).filter(function(field) {
      return !~['body', 'status'].indexOf(field);
    })
  })
  .then(function(metaFields) {
    var envelopes = [];

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

function standardizeConfig(config) {
  if (!config.plugins) {
    config.plugins = {};
  }

  if (!config.plugins.github) {
    config.plugins.github = {};
  }

  if (!config.plugins.github.repos) {
    config.plugins.github.repos = [];
  }

  if (!config.plugins.jenkins) {
    config.plugins.jenkins = {};
  }

  if (!config.plugins.jenkins.projects) {
    config.plugins.jenkins = [];
  }

  if (!config.plugins.jenkins.push_projects) {
    config.plugins.jenkins.push_projects = {};
  }

  return config;
};

var Singularity = Class.extend({
  init: function() {
    this.githubChannel = postal.channel('GitHub');
    this.githubChannel.subscribe('config', function(data, envelope) {
      if (!data.repo) {
        app.log.error('no repo given');
        return;
      }
      app.github.addRepo(data.repo);
    });

    this.jenkinsChannel = postal.channel('Jenkins');
  },

  route: function(routes) {
    if (routes == null) { return; }

    Object.keys(routes)
    .forEach(function(path) {
      var route = routes[path],
      self = this,
      routerArgs = [
        route.method || 'get',
        path,
        function() {
          requestWrapper.call(this, route)
          .then(packageMeta)
          .then(publishEvents);
        }
      ];

      app.router.on.apply(app.router, routerArgs);
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
           this.error('Skipping plugin', { name: pluginName });
           return;
         }

         app.log.info('loading plugin', pluginName);
         app.use(require(filename), appCfg);
       }.bind(this));
     }.bind(this))
     .catch(this.error);
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
