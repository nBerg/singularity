"use strict";

var request = require('request'),
    url = require('url'),
    q = require('q'),
    uuid = require('node-uuid'),
    reqBaseVcsParams = ['repo', 'after', 'change', 'actor'],
    reqChangeVcsParams = ['before'],
    reqProposalVcsParams = ['repo_url', 'base_ref', 'fork_ref', 'fork_url'],
    validBuildCodes = [200, 201],
    getRepoProjects,
    buildPayloadFromVcs,
    createJobParams;

function getProjectFromObject(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  return obj.project;
}

function getRepoProjects(repo, type, config) {
  var masterToken = (config.auth) ? config.auth.project_token : null;

  config = config.projects;
  if (!config) {
    throw 'no projects given in config';
  }
  if (!config[repo]) {
    throw 'repo ' + repo + ' not associated with any projects';
  }

  var repoProjectToken = config[repo].project_token || null;

  if (typeof config[repo] === 'string') {
    return [
        {
            project: config[repo],
            project_token: repoProjectToken || masterToken
        }
    ];
  }

  if (!config[repo][type]) {
    throw 'no ' + type + ' project(s) associated with ' + repo;
  }

  // conform to array - allow singular objects
  // also, reference modification, what can go wrong?
  if (!Array.isArray(config[repo][type])) {
    config[repo][type] = [config[repo][type]];
  }

  return config[repo][type].map(function(obj) {
    return {
        project: getProjectFromObject(obj),
        project_token: obj.project_token || repoProjectToken || masterToken
    };
  });
}

function buildPayloadFromVcs(project, vcsPayload, host) {
  return {
      artifacts: {},
      buildId: uuid.v1(),
      cause: 'vcsPayload',
      link: '',
      host: host,
      project: project.project,
      repo: vcsPayload.repo,
      status: 'queued',
      type: 'jenkins',
      triggeringPayload: vcsPayload
  };
}

// TODO: update this when the vcsPayload schema has been corrected to use camelcase
function createJobParams(buildPayload, project, vcsPayload) {
  var params = {
      token: project.project_token || '',
      cause: vcsPayload.change,

      buildId: buildPayload.buildId,
      host: buildPayload.host,
      baseUrl: vcsPayload.repo_url,
      baseBranch: vcsPayload.base_ref,
      forkUrl: vcsPayload.fork_url || '',
      forkRef: vcsPayload.fork_ref || '',
      before: vcsPayload.before || '',
      after: vcsPayload.after || ''
  };

  return params;
}

/**
 * Generate headers for a build trigger based on a given plugin config
 *
 * @param {Object} config Jenkins plugin config
 * @return {Object} headers used for request
 * @todo Research other ways for auth
 */
function buildHeaders(config) {
  var auth = config.auth || {};
  if (auth.user && auth.password) {
    console.log(auth.user + ":" + auth.pass);
    return {
      authorization: 'Basic ' +
      (new Buffer(auth.user + ":" + auth.password, 'ascii')
      .toString('base64'))
    };
  }
  return false;
}

/**
 * Ensure that a given vcsPayload has the given required fields, PLUS
 * the base-required fields
 *
 * @param {Object} vcsPayload
 * @return {Promise} resolves with vcsPayload if valid
 */
function validateVcsParams(vcsPayload, required) {
  required = reqBaseVcsParams.concat(required);

  return q.all(
    required.map(function(param) {
      return q(param)
      .then(function() {
        if (!vcsPayload[param]) {
          throw 'given VCS payload missing "' + param + '"';
        }
        return vcsPayload[param];
      });
    }, this)
  )
  .thenResolve(vcsPayload);
}

module.exports = require('../plugin').extend({
  name: 'jenkins',
  bound_fx: ['_buildForVcs', '_buildProject', '_triggerBuild'],

  validateChange: function(vcsPayload) {
    return validateVcsParams(vcsPayload, reqChangeVcsParams);
  },

  validateProposal: function(vcsPayload) {
    return validateVcsParams(vcsPayload, reqProposalVcsParams);
  },

  buildChange: function(vcsPayload) {
    return this._buildForVcs(vcsPayload);
  },

  buildProposal: function(vcsPayload) {
    return this._buildForVcs(vcsPayload);
  },

  /**
   * @param httpPayload {Object} Internally build httpPayload, based on the
   *                             the payload built by the notification-plugin
   * @return {Object} httpPayload
   */
  validateBuildUpdate: function(httpPayload) {
    if (!httpPayload.__headers) {
      throw 'no __headers field; payload was not built internally';
    }
    if (!httpPayload.build || !httpPayload.build.parameters) {
      throw 'no parameters for build';
    }
    if (httpPayload.build.parameters.host !== this.config.host) {
      throw 'unable to determine jenkins instance that sent this payload';
    }
    if (!httpPayload.build.url) {
      throw 'no build URL in http payload, ignoring';
    }
    return httpPayload;
  },

  /**
   * @param httpPayload {Object} Internally build httpPayload, based on the
   *                             the payload built by the notification-plugin
   * @return {Promise} Object that represents a complete buildPayload
   */
  createUpdatePayload: function(httpPayload) {
    return q({
        artifacts: httpPayload.build.artifacts,
        buildId: httpPayload.build.parameters.buildId,
        cause: httpPayload.build.parameters.cause,
        link: this.config.protocol + '://' + this.config.host + httpPayload.build.url,
        host: httpPayload.build.parameters.host,
        project: httpPayload.name,
        repo: httpPayload.repo,
        status: this._determineBuildStatus(httpPayload),
        type: 'jenkins',
        triggeringPayload: httpPayload
    });
  },

  /**
   * Reads an httpPayload from the notification-plugin
   * Maps the status of the payload to an internally recognized status
   *
   * @param httpPayload {Object} internally built payload
   * @return {String}
   */
  _determineBuildStatus: function(httpPayload) {
    if (httpPayload.build.phase === 'STARTED') {
      return 'building';
    }
    if (httpPayload.build.phase === 'FINALIZED') {
      return (httpPayload.build.phase === 'SUCCESS') ? 'success' : 'failure';
    }
    throw 'build has not been finalized yet ' + this.logForObject(httpPayload);
  },

  /**
   * POST to the Jenkins API to start a build
   *
   * @function triggerBuild
   * @param project {Object} internally built project object based on config
   * @param params {Object} internally built params from createJobParams
   * @return {Promise} ninvoke on mikael/request
   *                   (POST to /job/name_name/buildWithParameters)
   */
  _triggerBuild: function(project, params) {
    var headers = buildHeaders(this.config),
        options = {
          url: url.format({
            protocol: this.config.protocol,
            host: this.config.host,
            pathname: '/job/' + project.project + '/buildWithParameters',
            query: params
          }),
          method: 'GET'
        };

    if (headers) { options.headers = headers; }

    this.info('jenkins build trigger', project.project);
    this.debug('trigger options', options);

    return q.nfcall(request, options)
    .spread(function(response, body) {
      if (!response.statusCode ||
          !~validBuildCodes.indexOf(response.statusCode)) {
        this.debug(body);
        throw '[' + response.statusCode +
        '] failed to trigger build for ' +
          this.logForObject(project);
      }
    }.bind(this));
  },

  /**
   * @param project {Object} internally built project object based on config
   * @param vcsPayload {Object} payloads/vcs
   * @return {Promise} Resolves with build payload, queued status only
   */
  _buildProject: function(project, vcsPayload) {
    var publishPayload;

    return q([project, vcsPayload, this.config.host])
    .spread(buildPayloadFromVcs)
    .then(function(buildPayload) {
      publishPayload = buildPayload;
      return [buildPayload, project, vcsPayload];
    })
    .spread(createJobParams)
    .then(function(params) {
      return [project, params];
    })
    .spread(this._triggerBuild)
    .then(function() {
      return publishPayload;
    });
  },

  /**
   * @param vcsPayload {Object} payloads/vcs
   * @return {Promise} Maps out projects to trigger for this plugin instance
   *                   calls _buildProject to trigger them
   */
  _buildForVcs: function(vcsPayload) {
    return q([vcsPayload.repo, vcsPayload.type, this.config])
    .spread(getRepoProjects)
    .then(function(projects) {
      return q.all(
        projects.map(function(project) {
          return this._buildProject(project, vcsPayload);
        }, this)
      );
    }.bind(this))
    .then(function(payloads) {
      return payloads.filter(function(pl) {
        return !!pl;
      });
    });
  }
});
