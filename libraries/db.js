"use strict";

/**
 * All callbacks must have 2 args, err & item
 */
exports.init = function(config, log) {

  if (!config) {
    return null;
  }

  var MongoDB = function() {
    this.config = config;
    this.connection = require('mongojs').connect(config.auth, config.collections);
    this.connection.pulls.ensureIndex({number: 1, repo_id: 1 }, { unique: true, sparse: true }, function(err, res) {
      if (err) {
        log.error('db.pulls: failed to ensure indices', err);
        process.exit(1);
      }
      log.info('db.pulls: ensured indices', { indices: res });
    });
  };

  MongoDB.prototype.insertMerge = function(merge, callback) {
    this.connection.merges.insert({
      organization: merge.organization,
      repo: merge.repo,
      number: merge.number,
      merger: merge.merger,
      result: merge.result
    }, callback);
  };

  MongoDB.prototype.findPush = function(repo, ref, head, callback) {
    this.connection.pushes.findOne({ repo: repo, ref: ref, sha: head }, callback);
  };

  MongoDB.prototype.insertPush = function(push, callback) {
    this.connection.pushes.insert({
      repo: push.repository.name,
      ref: push.ref,
      sha: push.after,
      jobs: []
    }, callback);
  };

  MongoDB.prototype.findPull = function(pull_number, pull_repo, callback) {
    this.connection.pulls.findOne({ number: pull_number, repo: pull_repo }, callback);
  };

  MongoDB.prototype.findPullByRepoId = function(pull_number, pull_repo_id, callback) {
    pull_number = parseInt(pull_number);
    pull_repo_id = parseInt(pull_repo_id);
    this.connection.pulls.findOne({ number: pull_number, repo_id: pull_repo_id }, callback);
  };

  MongoDB.prototype.updatePull = function(pull_number, pull_repo, update_columns) {
    this.connection.pulls.update({ number: pull_number, repo: pull_repo }, { $set: update_columns });
  };

  MongoDB.prototype.insertPull = function(pull, callback) {
    this.connection.pulls.insert({
      number: pull.number,
      repo_id: pull.base.repo.id,
      repo: pull.repo,
      created_at: pull.created_at,
      updated_at: pull.updated_at,
      head: pull.head.sha,
      merged: false,
      status: 'open',
      merge_result: null,
      files: pull.files,
      opening_event: pull
    }, callback);
  };

  MongoDB.prototype.findRepoPullsByStatuses = function(repo, statuses, limit, callback) {
    limit = parseInt(limit) || 8;
    repo = parseInt(repo);
    this.connection.pulls.find({ repo_id: repo, status: { $in: statuses } }).limit(limit, callback);
  };

  MongoDB.prototype.findByJobStatus = function(collection, statuses, callback) {
    if (this.config.collections.indexOf(collection) === -1) {
      log.error('unknown collection', collection);
      return;
    }
    this.connection[collection].find({ 'jobs.status': { $in: statuses }}).forEach(callback);
  };

  MongoDB.prototype.insertJob = function(pull, job) {
    if (typeof pull.jobs === 'undefined') {
      pull.jobs = [];
    }

    pull.jobs.push(job);

    this.updatePull(pull.number, pull.repo, { jobs: pull.jobs});
  };

  MongoDB.prototype.insertPushJob = function(push, job_id) {
    var query = {
      ref: push.ref,
      repo: push.repository.name,
      sha: push.after
    };
    this.findPush(push.repository.name, push.ref, push.after, function(err, res) {
      // something went terribly wrong, SHOULD die
      if (err) {
        log.error('failed to insert a push job', err);
        process.exit(1);
      }

      if (res.jobs.length > 0) {
        log.error('job has a build associated with it', {push: query, existing: res});
        return;
      }

      res.jobs.push({ id: job_id, status: 'new', result: null });
      this.connection.pushes.update(query, { $set: res });
    }.bind(this));
  };

  MongoDB.prototype.updateJobStatus = function(collection, job_id, status, result) {
    if (this.config.collections.indexOf(collection) === -1) {
      log.error('unknown collection', collection);
      return;
    }

    this.connection[collection].update({ 'jobs.id': job_id }, { $set: { 'jobs.$.status': status, 'jobs.$.result': result }});
  };

  MongoDB.prototype.insertLineStatus = function(pull, filename, line_number) {
    this.connection.pulls.update({ _id: pull.number, 'files.filename': filename }, { $push: { 'files.$.reported': line_number } });
  };

  return new MongoDB();
};
