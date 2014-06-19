"use strict";

var q = require('q'),
path = require('path'),
fs = require('fs');

/**
 * MUST BIND `this`
 * Validates that a config for a plugin exists
 *
 * @param {String} plugin Name of the plugin
 * @return {Object} Config for plugin
 */
function validatePluginCfg(plugin) {
  if (!this.config.get(plugin)) {
    throw 'No config for ' + this.name + '.' + plugin;
  }
  return this.config.get(plugin);
}

/**
 * Generate an internally recognized path to where a plugin
 * *should* be
 *
 * @param {String} type type of plugin
 * @param {String} name Name of the plugin
 * @return {String} Supposed path to plugin
 */
function internalPluginPath(type, name) {
  return path.join(__dirname, '..', 'plugins', type, name + '.js');
}

/**
 * MUST BIND `this`
 * Generates a path for the plugin
 * Prefers cfg.plugin_path over the internally generated path
 * (via `internalPluginPath`)
 *
 * @param {String} plugin Name of the plugin
 * @return {String} Path to plugin
 * @throws String when neither cfg path or internal path exists
 */
function pathFromName(plugin) {
  var cfgPath = this.config.get('plugin_path'),
  filePath = internalPluginPath(this.pluginType, plugin);
  cfgPath = fs.existsSync(cfgPath) ? cfgPath : false;
  if (!cfgPath && !fs.existsSync(filePath)) {
    throw this.name +
          ' (' +
          this.pluginType +
          '): plugin_path cfg not defined (or does not exists) & ' +
          filePath +
          ' does not exist';
  }
  return (cfgPath) ? cfgPath : filePath;
}

/**
 * MUST BIND `this`
 * Attempts to load a plugin, pushes it into this.plugins
 *
 * @param {String} path Path of plugin to load
 */
function loadFromPath(path) {
  var klass = require(path);
  this.plugins.push(new klass(this.config.get(plugin)));
}

module.exports = require('../vent').extend({
  // full array of all plugins for this adapter
  plugins: [],

  /**
   * Typically called by an external force to start internal
   * processes, such as polling
   */
  start: function() {
    this.delegateTask('start');
  },

  /**
   * {@inheritDoc}
   * @param {Object} option Configuration
   */
  init: function(option) {
    if (!this.pluginType) {
      throw 'No pluginType defined';
    }
    if (!this.name) {
      throw 'No adapter name defined';
    }
    option = require('nconf').defaults(option);
    this._super(option);
    this.delegateTask.bind(this);
  },

  /**
   * Given a config, attempts to load plugins based on it.
   * If a `plugin` field exists, this fx will exclusively attempt
   * to load that plugin
   *
   * @param {undefined | Object} cfg Defaults to this.config.get()
   */
  attachConfigPlugins: function(cfg) {
    var plugins,
    cfg = cfg || this.config.get();
    if (cfg.plugin) {
      plugins = Array.isArray(cfg.plugin)
                ? cfg.plugin
                : [cfg.plugin];
    }
    else {
      plugins = Object.keys(cfg).filter(function(key) {
        key !== 'plugin';
      });
    }
    plugins.forEach(function(plugin) {
      this.log.debug(
        '[adapter.' + this.name + '.plugin_load]',
        {plugin: plugin}
      );
      this.attachPlugin(plugin);
    }, this);
  },

  /**
   * @param {String} plugin Name of the plugin
   * @return {Promise}
   */
  attachPlugin: function(plugin) {
    q.resolve(plugin)
    .then(validatePluginCfg.bind(this))
    .thenResolve(plugin)
    .then(pathFromName.bind(this))
    .then(loadFromPath.bind(this))
    .catch(this.error)
    .done();
  },

  /**
   * Delegates a fx call & args to all attached plugins
   *
   * @param {String} fx The function to call on each plugin
   * @param {Array} args Arguements to invoke fx with, defauts
   *                     to an empty array
   * @return {Promise} Array of promises, an element for each
   *                   call on plugin.fx
   */
  delegateTask: function(fx, args) {
    args = args || [];
    var self = this,
    promises = this.plugins.map(function(plugin) {
      return q.resolve(plugin)
      .then(function(plugin) {
        self.log.debug(
          '[adapter.delegateTask]',
          {
            task: fx,
            args: args,
            plugin: plugin
          }
        );
        return plugin;
      })
      .invoke(fx, args)
      .catch(plugin.error)
      .done();
    });

    q.allSettled(promises)
    .catch(this.error)
    .done();
  }
});
