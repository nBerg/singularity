var Logger = require('./log'),
    Db = require('./db'),
    NSQClient = require('nsqjs').Reader,
    fs = require('fs'),
    path = require('path'),
    express = require('express'),
    noop = function() {};

module.exports = function(config, log) {

  var app = express(),
      standardizeConfig = function(config) {
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

  app.loadListeners = function(directories) {
    if (!Array.isArray(directories)) {
      throw new Error('directories must be array');
    }

    directories.forEach(function(dir) {
      fs.readdir(dir, function(err, files) {
        if (err) {
          app.log.error(err);
          process.exit(1);
        }

        if (!app.config.plugins) {
          app.log.info('No plugin configurations found - skipping');
          return;
        }

        for (var i = 0, l = files.length; i < l; i++) {
          var filename = path.join(dir, files[i]),
              pluginName = files[i].split('.', 2)[0];

          if (!filename.match(/\.js$/)) {
            continue;
          }

          if (!app.config.plugins[pluginName]) {
            app.log.info('No configuration for ' + pluginName + ', not loading');
            continue;
          }

          var pluginEnabled = app.config.plugins[pluginName].enabled;

          if (pluginEnabled === undefined || pluginEnabled) {
            app.log.info('Loading plugin: ' + pluginName);
            app.listeners.push(require(filename).init(app.config.plugins[pluginName], app).start());
          }
          else {
            app.log.info('Not loading disabled plugin ' + pluginName);
          }
        }
      });
    });
  };

  app.getConfig = function() {
    if (!app.config || !app.config.plugins) {
      return {};
    }

    var selectData = {},
        configs = app.config.plugins,
        formatProjectCfg = function(projects) {
          if (!projects && !Array.isArray(projects) && !(projects instanceof Object)) {
            return [];
          }
          var ret = [];
          for (var repo in projects) {
            ret.push({
              name: projects[repo].name,
              repo: !isNaN(parseInt(repo)) ? projects[repo].repo : repo,
              has_trigger_token: !!projects[repo].token
            });
          }
          return ret;
        };

    if (configs.github) {
      selectData.github = {};
      selectData.github.ci_user = (configs.github.auth) ? configs.github.auth.username : false;
      selectData.github.repositories = configs.github.repos || [];
    }

    if (configs.jenkins) {
      selectData.jenkins = {};
      selectData.jenkins.has_global_trigger_token = !!configs.jenkins.token;
      selectData.jenkins.projects = formatProjectCfg(configs.jenkins.projects);
      selectData.jenkins.push_projects = formatProjectCfg(configs.jenkins.push_projects);
    }

    return selectData;
  };

  app.addRepoPRJob = function(params, callback) {
    callback = callback || noop;

    if (app.config.plugins.github.repos.indexOf(params.repo) !== -1) {
      app.log.info('duplicate github repo', params);
      callback();
      return false;
    }

    var duplicate = app.config.plugins.jenkins.projects.some(function(project) {
      return (params.project === project.name || params.repo === project.repo);
    });

    if (duplicate) {
      app.log.info('duplicate jenkins repo or project', params);
      callback();
      return false;
    }

    app.emit('github.new_repo', params.repo);
    app.emit('jenkins.new_pr_job', {
      name: params.project,
      repo: params.repo,
      token: params.token || false
    });
    app.log.info('Singularity: runtime config updated');

    callback();
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

  if (config.nsq && (config.nsq.host || config.nsq.port)) {
    var topic = config.nsq.topic || 'singularity',
        channel = config.nsq.channel || 'repos',
        host = config.nsq.host || '127.0.0.1',
        port = config.nsq.port || '4150',
        url = host + ':' + port,
        reader = new NSQClient(topic, channel, { nsqdTCPAddresses: url });

    app.log.info('Connection to NSQ Client', { topic: topic, channel: channel, url: url });

    reader.connect();

    reader.on(NSQClient.MESSAGE, function(message) {
      if (!message.body) {
        app.log.error('Bad NSQ Message', message.id);
        return;
      }

      var data, valid;

      try {
        data = JSON.parse(message.body.toString()),
        valid = ['organization', 'repo', 'project'].forEach(function(param) {
          if (!data[param]) {
            throw new Error('missing parameter: ' + param);
          }
        });
      }
      catch(e) {
        app.log.error('error interpreting NSQ message', { error: e });
        valid = false;
      }
      finally {
        message.finish();
      }

      if (valid) {
        app.log.info('pausing NSQ');
        reader.pause();
        app.addRepoPRJob(data, function() {
          app.log.info('unpausing NSQ');
          reader.unpause();
        });
      }
    });
  }

  return app;
};
