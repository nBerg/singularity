/**
 * The Jenkins integration plugin
 * @module Jenkins
 */
"use strict";

var request = require('request'),
    url = require('url'),
    uuid = require('node-uuid'),
    async = require('async');

/**
 * @class Jenkins
 * @param config {Object} The plugins configs
 * @param application {application} An instance of the main application object
 * @constructor
 */
var Jenkins = function(config, application) {
  var self = this;

  self.config = config;
  self.application = application;

  self.application.on('push.found', function(push) {
    self.pushFound(push);
  });

  self.application.on('pull.processed', function(pull, pull_number, sha, ssh_url, branch, updated_at) {
    self.buildPull(pull, pull_number, sha, ssh_url, branch, updated_at);
  });

  self.application.on('pull.found', function(pull) {
    self.pullFound(pull);
  });

  self.application.on('build.download_artifact', function(build, pull, artifact) {
    self.downloadArtifact(build, pull, artifact);
  });

  self.application.on('build.trigger', function(job_name, url_options) {
    self.triggerBuild(job_name, url_options, function(error) {
      if (error) {
        self.application.log.info('Received error from Jenkins when triggering build', { job_name: job_name, url_options: url_options });
      }
    });
  });

  self.application.on('build.check', function(job_name, callback) {
    self.checkBuild(job_name, callback);
  });

  self.application.on('process_artifacts', function(job_name, build, pull) {
    self.processArtifacts(job_name, build, pull);
  });
};

/**
 * Searches a pull requests jobs to find the unfinished one, if one exists.
 *
 * @method findUnfinishedJob
 * @param pull {Object}
 * @returns {Object}
 */
Jenkins.prototype.findUnfinishedJob = function(pull) {
  for (var x in pull.jobs) {
    if (pull.jobs[x].status !== 'finished') {
      return pull.jobs[x];
    }
  }
};

/**
 * Searches through the configs to find the appropriate project for the provided repo.
 *
 * @method findProjectByRepo
 * @param repo {String}
 * @returns {Object}
 */
Jenkins.prototype.findProjectByRepo = function(repo) {
  var found = null;
  this.config.projects.forEach(function(project) {
    if (repo === project.repo) {
      found = project;
    }
  });

  return found;
};

/**
 * Sets up an asynchronous job that polls the Jenkins API to look for jobs that are finished.
 *
 * @method start
 */
Jenkins.prototype.start = function() {
  var self = this;
  async.parallel({
    jenkins: function() {
      var run_jenkins = function() {
        self.application.db.findPullsByJobStatus(['new', 'started'], function(err, pull) {
          if (err) {
            self.application.log.error(err);
            process.exit(1);
          }

          if (!pull) {
            return;
          }
          self.checkJob(pull);
        });

        setTimeout(run_jenkins, self.config.frequency);
      };

      run_jenkins();
    }
  });

  return this;
};

/**
 * Uses the Jenkins REST API to trigger a new build for the provided pull request.
 *
 * @method buildPull
 * @param pull {Object}
 * @param number {String}
 * @param sha {String}
 * @param ssh_url {String}
 * @param branch {String}
 * @param updated_at {String}
 * @todo Do we need to pass all these parameters, is just passing pull enough?
 */
Jenkins.prototype.buildPull = function(pull, number, sha, ssh_url, branch, updated_at) {
  var project = this.findProjectByRepo(pull.repo),
      job_id = uuid.v1(),
      self = this,
      trigger_token = project.token || self.config.token;

  this.application.log.info('Starting build for pull', { pull_number: pull.number, project: project.name });

  this.triggerBuild(project.name, {
    token: trigger_token,
    cause: 'Testing Pull Request: ' + number,
    REPOSITORY_URL: ssh_url,
    BRANCH_NAME: branch,
    JOB: job_id,
    PULL: number,
    BASE_BRANCH_NAME: pull.base.ref,
    SHA: sha
  },
  function(error) {
    if (error) {
      self.application.log.error(error);
      return;
    }

    self.application.db.updatePull(number, pull.repo, { head: sha, updated_at: updated_at});
    self.application.db.insertJob(pull, {
      id: job_id,
      status: 'new',
      head: sha
    });
  });
};

/**
 * Called when a new pull is being checked to see if it should be processed. This method will iterate
 * over the configured projects to find the right one and check that ones rules to see if a build should
 * be triggered for it based on the files that were modified.
 *
 * @method pullFound
 * @param pull {Object}
 */
Jenkins.prototype.pullFound = function(pull) {
  var project = this.findProjectByRepo(pull.repo);

  if (!project) {
    this.application.log.error('No jenkins job found for PR', { pull: pull.number, repository: pull.base.repo.fullname || pull.base.repo.name });
    return;
  }

  if (!project.rules) {
    this.application.log.debug('Validating pull with no rules', { pull: pull.number, project: project.name });
    this.application.emit('pull.validated', pull);
    return;
  }

  for (var x in pull.files) {
    if (!pull.files[x].filename || typeof pull.files[x].filename !== 'string') {
      continue;
    }

    for (var y in project.rules) {
      if (pull.files[x].filename.match(project.rules[y])) {
        this.application.log.debug('Validating pull with rules', { pull: pull.number, project: project.name });
        this.application.emit('pull.validated', pull);
        return;
      }
    }
  }

  this.application.log.debug('Invalidating pull with rules', { pull: pull.number, project: project.name });
};

/**
 * Validate that a push can be used to trigger a build, given the config
 * @method validatePush
 * @param push {Object}
 */
Jenkins.prototype.validatePush = function(push) {
  var repo = push.repository.name,
      log_info = { repo: repo, reference: push.ref, head: push.after };

  if (!this.config.push_projects) {
    this.application.log.debug('No push_projects config for jenkins plugin', log_info);
    return false;
  }

  if (!(repo in this.config.push_projects)) {
    this.application.log.debug('repo not configured for push events', log_info);
    return false;
  }

  if (!this.config.push_projects[repo].name) {
    this.application.log.error('No jenkins project given for repo', log_info);
    return false;
  }

  return true;
};

/**
 * Called when a push event is given, looks at the ref and sees if it matches any rules. If it does, triggers
 * a given project.
 *
 * @method pushFound
 * @param push {Object}
 */
Jenkins.prototype.pushFound = function(push) {
  if (!this.validatePush(push)) {
    return;
  }

  var self = this,
      repo = push.repository.name,
      project_config = self.config.push_projects[repo],
      log_info = { repo: repo, reference: push.ref, head: push.after },
      branch = push.ref.split('/').pop();

  if (!branch) {
    self.application.log.error('Bad ref name', { ref: push.ref, parsed: branch });
    return;
  }

  if (!project_config.rules || !(project_config.rules instanceof Array)) {
    self.application.log.info('no ref regex rules for push', log_info);
    self.buildPush(push, branch);
    return;
  }

  project_config.rules.some(function(regex) {
    if (!branch.match(regex)) {
      self.application.log.debug(branch + ' did not match ' + regex);
      return false;
    }

    log_info.jenkins_trigger = { project: project_config.name, branch: branch };
    self.application.log.info('regex rule matched for push', log_info);
    self.buildPush(push, branch);

    return true;
  });
};

/**
 * Build a given push command. Assumes that validatePush was run on push & runs a given project.
 *
 * @method buildPush
 * @param push {Object}
 * @param branch {String}
 */
Jenkins.prototype.buildPush = function(push, branch) {
  var self = this,
      repo = push.repository.name,
      url_opts = {
        token: self.config.push_projects[repo].token || self.config.token,
        cause: push.ref + ' updated to ' + push.after,
        BRANCH_NAME: branch,
        BEFORE: push.before,
        AFTER: push.after,
      };

  self.triggerBuild(self.config.push_projects[repo].name, url_opts, function(error) {
    if (error) {
       self.application.log.error(error);
    }
  });
};

/**
 * Uses the Jenkins REST API to check if the provided pull request has any jobs that recently finished. If so
 * their status in the database is updated and events are triggered so other plugins can re-act to the completion
 * of the job.
 *
 * @method checkJob
 * @param pull {Object}
 */
Jenkins.prototype.checkJob = function(pull) {
  var noun,
      self = this,
      job = this.findUnfinishedJob(pull),
      project = this.findProjectByRepo(pull.repo);

  if (!job || !project) {
    noun = (!job) ? 'job' : 'project';
    self.application.log.error('Could not find a ' + noun + ' for ' + pull.repo + ' #' + pull.number + ' on ' + self.config.host);
    return;
  }

  this.checkBuild(project.name, function(error, response) {
    if (error) {
      self.application.log.error('Could not connect to jenkins, there seems to be a connectivity issue!');
      return;
    }

    response.body.builds.forEach(function(build) {
      if (typeof build.actions === 'undefined' || typeof build.actions[0].parameters === 'undefined' || !build.actions[0].parameters) {
        return;
      }

      build.actions[0].parameters.forEach(function(param) {
        if (param.name === 'JOB' && param.value === job.id) {
          if (job.status === 'new') {
            self.application.db.updateJobStatus(job.id, 'started', 'BUILDING');
            self.application.emit('build.started', job, pull, build.url);
          }

          if (job.status !== 'finished' && !build.building) {
            if (build.result === 'FAILURE') {
              self.application.db.updateJobStatus(job.id, 'finished', build.result);
              self.application.emit('build.failed', job, pull, build.url + 'console');

              self.processArtifacts(project.name, build, pull);
            }
            else if (build.result === 'SUCCESS') {
              self.application.db.updateJobStatus(job.id, 'finished', build.result);
              self.application.emit('build.succeeded', job, pull, build.url);

              self.processArtifacts(project.name, build, pull);
            }
            else if (build.result === 'ABORTED') {
              self.application.db.updateJobStatus(job.id, 'finished', build.result);
              self.application.emit('build.aborted', job, pull, build.url);
            }
          }
        }
      });
    });
  });
};

/**
 * Makes a GET request to the Jenkins API to start a build
 *
 * @method triggerBuild
 * @param job_name {String}
 * @param url_options {Options}
 * @param callback {Function}
 */
Jenkins.prototype.triggerBuild = function(job_name, url_options, callback) {
  var options = {
    url: url.format({
      protocol: this.config.protocol,
      host: this.config.host,
      pathname: '/job/' + job_name + '/buildWithParameters',
      query: url_options
    }),
    method: 'GET'
  };

  if (this.config.user && this.config.pass) {
    options.headers = {
      authorization: 'Basic ' + (new Buffer(this.config.user + ":" + this.config.pass, 'ascii').toString('base64'))
    };
  }

  this.application.log.debug('jenkins build trigger', options);

  request(options, callback);
};

/**
 * Checks the Jenkins API for the status of a job
 *
 * @method checkBuild
 * @param job_name {String}
 * @param callback {Function}
 */
Jenkins.prototype.checkBuild = function(job_name, callback) {
  var self = this,
      options = {
        url: url.format({
          protocol: this.config.protocol,
          host: this.config.host,
          pathname: '/job/' + job_name + '/api/json',
          query: {
            tree: 'builds[number,url,actions[parameters[name,value]],building,result]'
          }
        }),
        json: true
      };

  if (this.config.user && this.config.pass) {
    options.headers = {
      authorization: 'Basic ' + (new Buffer(this.config.user + ":" + this.config.pass, 'ascii').toString('base64'))
    };
  }

  request(options, function(error, response) {
    callback(error, response, self.application);
  });
};

/**
 * Downloads the artifact list for a build and dispatches an event for each one. This lets other
 * plugins parse and process results from the build however they like.
 *
 * @method processArtifacts
 * @param job_name {String}
 * @param build {String}
 * @param pull {Object}
 */
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
  request(options, function(err, response) {
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
 */
Jenkins.prototype.downloadArtifact = function(build, pull, artifact) {
  var self = this,
      options = { url: artifact.url };

  if (this.config.user && this.config.pass) {
    options.headers = {
      authorization: 'Basic ' + (new Buffer(this.config.user + ":" + this.config.pass, 'ascii').toString('base64'))
    };
  }

  request(options, function(err, response) {
    if (err) {
      self.application.log.error(err);
      return;
    }

    self.application.emit('build.artifact_downloaded', build, pull, artifact.relativePath, response.body);
  });
};

/**
 * Utility function to load this "plugin" into the application without having to know the object name
 */
exports.init = function(config, application) {
  return new Jenkins(config, application);
};
