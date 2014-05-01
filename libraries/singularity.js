var Logger = require('./log'),
    fs = require('fs'),
    path = require('path'),
    express = require('express');

module.exports = function(config) {

  var app = express(),
      standizeConfig = function(config) {
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

  app.config = standizeConfig(config || {});
  app.log = new Logger(config.log_level || 'debug');
  app.listeners = [];

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

        if (!config.plugins) {
          app.log.info('No plugin configurations found - skipping');
          return;
        }

        for (var i = 0, l = files.length; i < l; i++) {
          var filename = path.join(dir, files[i]),
              pluginName = files[i].split('.', 2)[0];

          if (!filename.match(/\.js$/)) {
            continue;
          }

          if (!config.plugins[pluginName]) {
            app.log.info('No configuration for ' + pluginName + ', not loading');
            continue;
          }

          var pluginEnabled = config.plugins[pluginName].enabled;

          if (pluginEnabled === undefined || pluginEnabled) {
            app.log.info('Loading plugin: ' + pluginName);
            app.listeners.push(require(filename).init(config.plugins[pluginName], app).start());
          }
          else {
            app.log.info('Not loading disabled plugin ' + pluginName);
          }
        }
      });
    });
  };

  // todo: make config schema not crap
  app.getConfig = function() {
    if (!config.plugins) {
      return {};
    }

    var selectData = {},
        configs = config.plugins,
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

  app.addRepoPRJob = function(params) {
    if (app.config.plugins.github.repos.indexOf(params.repo) !== -1) {
      app.log.info('duplicate github repo', params);
      return false;
    }

    app.config.plugins.jenkins.projects.forEach(function(project) {
      if (params.project === project.name || params.repo === project.repo) {
        app.log.info('duplicate jenkins repo or project', params);
        return false;
      }
    });

    app.config.plugins.repos.push(params.repo);
    app.config.plugins.jenkins.projects.push({
      name: params.project,
      repo: params.repo,
      token: params.token || false
    });

    app.emit('singularity.config_updated', app.config);
    app.log.info('config updated', app.config);

    return true;
  };

  return app;
};
