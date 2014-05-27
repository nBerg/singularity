var Class = require('nbd/Class'),
    q = require('q'),
    db = require('./db'),
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
    })
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
 * Given a config, fills in the blanks that are required
 *
 * @param {Object} config
 * @return {Object} updated config
 */
function standardizeConfig(config) {
  if (!config.github) {
    config.github = {};
  }

  if (!config.github.repos) {
    config.github.repos = [];
  }

  if (!config.jenkins) {
    config.jenkins = {};
  }

  if (!config.jenkins.projects) {
    config.jenkins = [];
  }

  if (!config.jenkins.push_projects) {
    config.jenkins.push_projects = {};
  }

  return config;
}


function pluginSubscriptions(meta) {
  return q.invoke(function validatePostalMeta() {
    if (!meta.subscriptions || !meta.plugin) {
      throw 'missing metadata fields;  plugin & subscriptions required';
    }
    return meta;
  })
  .done(function(meta) {
    meta.subscriptions.forEach(function(subscription) {
      var channel = subscription.channel || meta.plugin,
      channelObj = postal.channel(channel),
      callback = function(data, envelope) {
        app[meta.plugin][subscription.callback](data);
      };

      app.log.info('creating subscription', {
        channel: channel,
        topic: subscription.topic,
        plugin: meta.plugin,
        callback: subscription.callback
      });

      channelObj.subscribe(subscription.topic, callback);
    });
  });
}

var Singularity = Class.extend({
  init: function() {
    var defaultConfig = standardizeConfig({
      fake_events: false,
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
  },

  initChannels: function() {
    var githubTopics = {
      plugin: 'github',
      subscriptions: [
        { topic: 'pull_request', callback: 'handlePullRequest' },
        { topic: 'issue_comment', callback: 'handleIssueComment' },
        { topic: 'push', callback: 'handlePush' },
        { topic: 'config', callback: 'addRepo' },
        { channel: 'jenkins', topic: 'build.*', callback: 'createStatus' }
      ]
    },
    jenkinsTopics = {
      plugin: 'jenkins',
      subscriptions: [
        { channel: 'github', topic: 'pull.found', callback: 'pullFound' },
        { channel: 'github', topic: 'pull.processed', callback: 'buildPull' },
        { channel: 'github', topic: 'push.found', callback: 'pushFound' }
      ]
    };

    pluginSubscriptions(githubTopics);
    pluginSubscriptions(jenkinsTopics);
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

          var plugin = require(filename);

          plugin.name = pluginName;
          app.use(plugin, appCfg);

          plugin.publish = postal.channel(pluginName).publish;
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
