"use strict";
var flatiron = require('flatiron'),
    app = flatiron.app;

// configure & init the flatiron app *then* instantiate singularity
// init() instantiates the logs
// also, because singletons, and I hate everything
app.config.file('./config.json');
app.use(flatiron.plugins.http);

var singularity = require('./libraries/singularity'),
pushChain = [
  {channel: 'github', topic: 'push', plugin: 'github', callback: 'handlePush'},
  {channel: 'github', topic: 'push.lookup', plugin: 'db', callback: 'findPush'},
  {channel: 'db', topic: 'push.found', plugin: 'github', callback: 'processPush'},
  {channel: 'github', topic: 'push.validated', plugin: 'jenkins', callback: 'buildPush'},
  {channel: 'jenkins', topic: 'push.triggered', plugin: 'db', callback: 'insertPush'}
],

pullChain = [
  // incoming from *some* source (hook, issue_comment, w/e) & then validate that this is a payload
  // that we should trigger a build for
  {channel: 'github', topic: 'pull_request', plugin: 'github', callback: 'handlePullRequest'},
  {channel: 'github', topic: 'pull_request.validated', plugin: 'db', callback: 'findPullRequest'},

  // see if we contain a record of this PR & process if we have it on record
  {channel: 'db', topic: 'pull_request.found', plugin: 'github', callback: 'processPullRequest'},

  // pull_request on record - update stored PR fields
  {channel: 'github', topic: 'pull_request.updated', plugin: 'db', callback: 'updatePullRequest'},
  // otherwise, just insert
  {channel: 'db', topic: 'pull_request.not_found', plugin: 'db', callback: 'insertPullRequest'},

  // regardless of whether the PR was new (stored) or updated, trigger a build
  {channel: 'db', topic: 'pull_request.updated', plugin: 'jenkins', callback: 'buildPullRequest'},
  {channel: 'db', topic: 'pull_request.stored', plugin: 'jenkins', callback: 'buildPullRequest'},

  // store data on the triggered job
  {channel: 'jenkins', topic: 'pull_request.triggered', plugin: 'db', callback: 'insertPullRequestJob'},

  // once stored, create a status
  {channel: 'db', topic: 'pull_request.build.stored', plugin: 'github', callback: 'createStatus'}
],

commentChain = [
  // depending on whether the callback publishes an event or not, the rest of the chain *should* be
  // equivalent to the `pullChain`
  // i.e.: `handleIssueComment()` must publish data that is isometric to a regular pull_request
  //       event payload
  { channel: 'github', topic: 'issue_comment', plugin: 'github', callback: 'handleIssueComment' }
],

configEvents = [
  { channel: 'github', topic: 'config', plugin: 'github', callback: 'addRepo' },
  { channel: 'jenkins', topic: 'config', plugin: 'jenkins', callback: 'addProject' },
],

server = app.start(app.config.get('port'), function() {
  singularity.injectFlatironPlugins(__dirname + '/plugins');

  singularity.createChannelEventChain(pushChain);
  singularity.createChannelEventChain(pullChain);
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
