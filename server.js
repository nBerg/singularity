"use strict";
var flatiron = require('flatiron'),
    app = flatiron.app;

// configure & init the flatiron app *then* instantiate singularity
// init() instantiates the logs
// also, because singletons, and I hate everything
app.config.file(__dirname + '/config.json');
app.use(flatiron.plugins.http);

var singularity = require('./libraries/singularity'),
pushChain = [
  {channel: 'github', topic: 'push', vent: 'github', callback: 'handlePush'},
  {channel: 'github', topic: 'push.validated', vent: 'db', callback: 'findPush'},
  {channel: 'db', topic: 'push.not_found', vent: 'jenkins', callback: 'buildPush'},
  {channel: 'jenkins', topic: 'push.triggered', vent: 'db', callback: 'insertPush'}
],

pullChain = [
  // incoming from *some* source (hook, issue_comment, w/e) & then validate that this is a payload
  // that we should trigger a build for
  {channel: 'github', topic: 'pull_request', vent: 'github', callback: 'handlePullRequest'},
  {channel: 'github', topic: 'pull_request.validated', vent: 'db', callback: 'findPullRequest'},

  // see if we contain a record of this PR & process if we have it on record
  {channel: 'db', topic: 'pull_request.found', vent: 'github', callback: 'processPullRequest'},
  // pull_request on record - update stored PR fields
  {channel: 'github', topic: 'pull_request.updated', vent: 'db', callback: 'updatePullRequest'},
  // otherwise, just insert
  {channel: 'db', topic: 'pull_request.not_found', vent: 'db', callback: 'insertPullRequest'},

  // regardless of whether the PR was new (stored) or updated, trigger a build
  {channel: 'db', topic: 'pull_request.updated', vent: 'jenkins', callback: 'buildPullRequest'},
  {channel: 'db', topic: 'pull_request.stored', vent: 'jenkins', callback: 'buildPullRequest'},

  // store data on the triggered job
  {channel: 'jenkins', topic: 'pull_request.triggered', vent: 'db', callback: 'insertPullRequestJob'},

  // once stored, create a status - say that the build is starting, no link yet
  {channel: 'db', topic: 'pull_request.build_stored', vent: 'github', callback: 'createStatus'}
],

commentChain = [
  // depending on whether the callback publishes an event or not, the rest of the chain *should* be
  // equivalent to the `pullChain`
  // i.e.: `handleIssueComment()` must publish data that is isometric to a regular pull_request
  //       event payload
  {channel: 'github', topic: 'issue_comment', vent: 'github', callback: 'handleIssueComment'}
],

buildChain = [
  {channel: 'build', topic: 'jobs.polling', vent: 'db', callback: 'findPendingJobs'},

  // previous call should publish events for everything
  {channel: 'db', topic: 'pull_request.build_pending', vent: 'build', callback: 'checkPullRequestJob'},
  {channel: 'db', topic: 'push.build_pending', vent: 'build', callback: 'checkPushJob'},

  // job status change - update DB
  {channel: 'build', topic: 'pull_request.build_updated', vent: 'db', callback: 'updatePullRequestJob'},
  {channel: 'build', topic: 'push.build_updated', vent: 'db', callback: 'updatePushJob'},

  // pull_request.build.* => build status update in DB that should be written to github
  {channel: 'db', topic: 'pull_request.build.*', vent: 'github', callback: 'createStatus'}
],

configEvents = [
  {channel: 'github', topic: 'config', vent: 'github', callback: 'addRepo'},
  {channel: 'jenkins', topic: 'config', vent: 'jenkins', callback: 'addProject'}
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
