"use strict";
var flatiron = require('flatiron'),
    path = require('path'),
    app = flatiron.app;

// configure & init the flatiron app *then* instantiate singularity
// init() instantiates the logs
// also, because singletons, and I hate everything
app.config.file(path.join(__dirname, '/config.json'));
app.use(flatiron.plugins.http);

var singularity = require('./libraries/singularity'),
pushChain = [
  {channel: 'receiver', topic: 'push', vent: 'receiver', callback: 'handlePush'},
  {channel: 'receiver', topic: 'push.validated', vent: 'db', callback: 'findPush'},
  {channel: 'db', topic: 'push.not_found', vent: 'build', callback: 'buildPush'},
  {channel: 'build', topic: 'push.triggered', vent: 'db', callback: 'insertPush'}
],

pullChain = [
  // incoming from *some* source (hook, issue_comment, w/e) & then validate that this is a payload
  // that we should trigger a build for
  {channel: 'receiver', topic: 'pull_request', vent: 'receiver', callback: 'handlePullRequest'},
  {channel: 'receiver', topic: 'pull_request.validated', vent: 'db', callback: 'findPullRequest'},

  // pull_request on record - update stored PR fields & trigger build
  {channel: 'db', topic: 'pull_request.updated', vent: 'db', callback: 'updatePullRequest'},
  {channel: 'db', topic: 'pull_request.updated', vent: 'build', callback: 'buildPullRequest'},

  // not on record - insert & trigger
  {channel: 'db', topic: 'pull_request.not_found', vent: 'db', callback: 'insertPullRequest'},
  {channel: 'db', topic: 'pull_request.not_found', vent: 'build', callback: 'buildPullRequest'},

  // store data on the triggered job
  {channel: 'build', topic: 'pull_request.triggered', vent: 'db', callback: 'insertPullRequestJob'},
  {channel: 'build', topic: 'pull_request.triggered', vent: 'receiver', callback: 'createPendingStatus'},

  // once stored, update status with build link
  {channel: 'db', topic: 'pull_request.build_stored', vent: 'receiver', callback: 'createStatus'}
],

commentChain = [
  // depending on whether the callback publishes an event or not, the rest of the chain *should* be
  // equivalent to the `pullChain`
  // i.e.: `handleIssueComment()` must publish data that is isometric to a regular pull_request
  //       event payload
  {channel: 'receiver', topic: 'issue_comment', vent: 'receiver', callback: 'handleIssueComment'}
],

buildChain = [
  {channel: 'build', topic: 'jobs.polling', vent: 'db', callback: 'findPendingJobs'},

  // previous call should publish events for everything
  {channel: 'db', topic: 'pull_request.build_pending', vent: 'build', callback: 'checkPullRequestJob'},
  {channel: 'db', topic: 'push.build_pending', vent: 'build', callback: 'checkPushJob'},

  // job status change - update DB
  {channel: 'build', topic: 'pull_request.build_updated', vent: 'db', callback: 'updatePullRequestJob'},
  {channel: 'build', topic: 'push.build_updated', vent: 'db', callback: 'updatePushJob'},

  // pull_request.build.* => build status update in DB that should be written to receiver
  {channel: 'db', topic: 'pull_request.build.*', vent: 'receiver', callback: 'createStatus'}
],

configEvents = [
  {channel: 'receiver', topic: 'config', vent: 'receiver', callback: 'addRepo'},
  {channel: 'build', topic: 'config', vent: 'build', callback: 'addProject'}
],

server = app.start(app.config.get('port'), function() {
  singularity.injectFlatironPlugins(__dirname + '/flatiron_plugins');

  singularity.createChannelEventChain(pushChain);
  singularity.createChannelEventChain(pullChain);
  singularity.createChannelEventChain(buildChain);
  singularity.createChannelEventChain(commentChain);
  singularity.createChannelEventChain(configEvents);

  singularity.route({
    '/hook': require('./routes/hook'),
    '/config': require('./routes/cfg'),
    '/pull_requests': require('./routes/pull_requests'),
    '/merge': require('./routes/merge')
  });

  app.log.info('Listening on port %d', app.config.get('port'));
});
