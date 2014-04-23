"use strict";

/**
 * All callbacks must have 2 args, err & item
 */
exports.init = function(config, log) {

  if (!config) {
    return null;
  }

  // mongo abstraction layer
  var MongoDB = function() {
    this.connection = require('mongojs').connect(config.auth, config.collections);
    this.connection.pulls.ensureIndex( { number: 1, repo_id: 1 }, { unique: true, sparse: true }, function(err, res) {
      if (err) {
        log.error('db: failed to ensure indices', err);
        process.exit(1);
      }
      log.info( 'db: ensured indices', { indices: res } );
    });
  };

  // push methods
  MongoDB.prototype.findPush = function(repo, ref, head, callback) {
    this.connection.pushes.findOne({ repo: repo, ref: ref, sha: head }, callback);
  };

  MongoDB.prototype.insertPush = function(push, callback) {
    this.connection.pushes.insert({
      repo: push.repository.name,
      ref: push.ref,
      sha: push.after
    }, callback);
  };

  // pull methods
  MongoDB.prototype.findPull = function(pull_number, pull_repo, callback) {
    this.connection.pulls.findOne({ number: pull_number, repo: pull_repo }, callback);
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
      files: pull.files,
      opening_event: pull
    }, callback);
  };

  MongoDB.prototype.findPullsByJobStatus = function(statuses, callback) {
    this.connection.pulls.find({ 'jobs.status': { $in: statuses }}).forEach(callback);
  };

  // job methods
  MongoDB.prototype.insertJob = function(pull, job) {
    if (typeof pull.jobs === 'undefined') {
      pull.jobs = [];
    }

    pull.jobs.push(job);

    this.updatePull(pull.number, pull.repo, { jobs: pull.jobs});
  };

  MongoDB.prototype.updateJobStatus = function(job_id, status, result) {
    this.connection.pulls.update({ 'jobs.id': job_id }, { $set: { 'jobs.$.status': status, 'jobs.$.result': result }});
  };

  // inline status methods
  MongoDB.prototype.insertLineStatus = function(pull, filename, line_number) {
    this.connection.pulls.update({ _id: pull.number, 'files.filename': filename }, { $push: { 'files.$.reported': line_number } });
  };

  return new MongoDB();
};
