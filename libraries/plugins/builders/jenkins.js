"use strict";

var request = require('request'),
    url = require('url'),
    q = require('q'),
    uuid = require('node-uuid'),
    reqBaseVcsParams = ['repo', 'after', 'change', 'actor'],
    reqChangeVcsParams = ['before'],
    reqProposalVcsParams = ['repo_url', 'base_ref', 'fork_ref', 'fork_url'],
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

function buildPayloadFromVcs(project, vcsPayload) {
  return {
      artifacts: {},
      buildId: uuid.v1(),
      link: '',
      project: project.project,
      repo: vcsPayload.repo,
      status: 'queued',
      type: 'jenkins'
  };
}

// TODO: update this when the vcsPayload schema has been corrected to use camelcase
function createJobParams(buildPayload, project, vcsPayload) {
  var params = {
      buildId: buildPayload.buildId,
      cause: vcsPayload.repo + ' - ' + vcsPayload.change,
      baseUrl: vcsPayload.repo_url,
      baseBranch: vcsPayload.base_ref,
      forkUrl: vcsPayload.fork_url || '',
      forkRef: vcsPayload.fork_ref || '',
      before: vcsPayload.before || '',
      after: vcsPayload.after || ''
  };

  if (project.project_token) {
    params.token = project.project_token;
  }

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
  if (config.user && config.password) {
    return {
      authorization: 'Basic ' +
        (new Buffer(config.user + ":" + config.pass, 'ascii')
        .toString('base64'))
    };
  }
  return {};
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
   * POST to the Jenkins API to start a build
   *
   * @function triggerBuild
   * @param project {Object} internally built project object based on config
   * @param params {Object} internally built params from createJobParams
   * @return {Promise} ninvoke on mikael/request
   *                   (POST to /job/name_name/buildWithParameters)
   */
  _triggerBuild: function(project, params) {
    var options = {
      url: url.format({
        protocol: this.config.protocol,
        host: this.config.host,
        pathname: '/job/' + project.project + '/buildWithParameters',
        query: params
      }),
      method: 'POST',
      headers: buildHeaders(this.config)
    };

    this.debug('jenkins build trigger', options);

    // TODO: error throwing
    return q.ninvoke(request, 'post', options);
  },

  /**
   * @param project {Object} internally built project object based on config
   * @param vcsPayload {Object} payloads/vcs
   * @return {Promise} Resolves with build payload, queued status only
   */
  _buildProject: function(project, vcsPayload) {
    var publishPayload;

    return q([project, vcsPayload])
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
    // TODO: error throwing
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

/**
 * Downloads the artifact list for a build and dispatches an event for each one. This lets other
 * plugins parse and process results from the build however they like.
 *
 * @method processArtifacts
 * @param job_name {String}
 * @param build {String}
 * @param pull {Object}
Jenkins.prototype.processArtifacts = function(job_name, build, pull) {
  var options = {
    url: url.format({
      protocol: this.config.protocol,
      host: this.config.host,
      pathname: '/job/' + job_name + '/' + build.number + '/api/json',
      query: {
        tree: 'artifacts[fileName,relativePath]'
      }
    }),
    json: true
  };

  if (this.config.user && this.config.pass) {
    options.headers = {
      authorization: 'Basic ' + (new Buffer(this.config.user + ":" + this.config.pass, 'ascii').toString('base64'))
    };
  }

  var self = this;
  self.request(options, function(err, response) {
    if (err) {
      self.application.log.error(err);
      return;
    }

    self.application.log.debug('Retrieved artifacts for build', { build: build.number, project: job_name });

    response.body.artifacts.forEach(function(artifact) {
      artifact.url = self.config.protocol + '://' + self.config.host + '/job/' + job_name + '/' + build.number + '/artifact/' + artifact.relativePath;

      self.application.log.debug('Found artifact for build', { build: build.number, url: artifact.url });
      self.application.emit('build.artifact_found', build, pull, artifact);
    });
  });
};

/**
 * Downloads a specific artifact and dispatches an event with its contents.
 *
 * @method downloadArtifact
 * @param build {String}
 * @param pull {Object}
 * @param url {String}
Jenkins.prototype.downloadArtifact = function(build, pull, artifact) {
  var self = this,
      options = { url: artifact.url };

  if (this.config.user && this.config.pass) {
    options.headers = {
      authorization: 'Basic ' + (new Buffer(this.config.user + ":" + this.config.pass, 'ascii').toString('base64'))
    };
  }

  self.request(options, function(err, response) {
    if (err) {
      self.application.log.error(err);
      return;
    }

    self.application.emit('build.artifact_downloaded', build, pull, artifact.relativePath, response.body);
  });
};
*/
