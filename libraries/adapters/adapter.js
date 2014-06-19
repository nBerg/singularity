"use strict";

/**
 * MUST BIND `this`
 * Validates that a config for a plugin exists
 *
 * @param {String} plugin Name of the plugin
 * @return {Object} Config for plugin
 */
function validatePluginCfg(plugin) {
  if (!this.config.get(plugin)) {
    throw 'No config for ' + this.name + '.<plugin>';
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

function loadFromPath(path) {
  var klass = require(path);
  this.plugins.push(new klass(this.config.get(plugin)));
}

module.exports = require('../vent').extend({
  plugins: [],

  /**
   *
   */
  start: function() {
    this.error(this.name + ': no start() override');
  },

  /**
   *
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
  },

  /**
   *
   */
  attachPlugin: function(plugin) {
    return q.resolve(plugin)
    .then(validatePluginCfg.bind(this))
    .thenResolve(plugin)
    .then(pathFromName.bind(this))
    .then(loadFromPath.bind(this))
    .catch(this.error)
    .done();
  }
});
