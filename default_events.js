"use strict"

// not a JSON file because...this needs comments

module.exports = [
    // PUSH CHAIN
    {channel: 'receiver', topic: 'push', vent: 'receiver', callback: 'handlePush'},
    {channel: 'receiver', topic: 'push.validated', vent: 'db', callback: 'findPush'},
    {channel: 'db', topic: 'push.not_found', vent: 'build', callback: 'buildPush'},
    {channel: 'build', topic: 'push.triggered', vent: 'db', callback: 'insertPush'},

    // PULL REQUEST CHAIN
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
    {channel: 'db', topic: 'pull_request.build_stored', vent: 'receiver', callback: 'createStatus'},

    // ISSUE COMMENT CHAIN
    // depending on whether the callback publishes an event or not, the rest of the chain *should* be
    // equivalent to the `pullChain`
    // i.e.: `handleIssueComment()` must publish data that is isometric to a regular pull_request
    //       event payload
    {channel: 'receiver', topic: 'issue_comment', vent: 'receiver', callback: 'handleIssueComment'},

    // BUILD CHAIN
    {channel: 'build', topic: 'jobs.polling', vent: 'db', callback: 'findPendingJobs'},
    // previous call should publish events for everything
    {channel: 'db', topic: 'pull_request.build_pending', vent: 'build', callback: 'checkPullRequestJob'},
    {channel: 'db', topic: 'push.build_pending', vent: 'build', callback: 'checkPushJob'},
    // job status change - update DB
    {channel: 'build', topic: 'pull_request.build_updated', vent: 'db', callback: 'updatePullRequestJob'},
    {channel: 'build', topic: 'push.build_updated', vent: 'db', callback: 'updatePushJob'},
    // pull_request.build.* => build status update in DB that should be written to receiver
    {channel: 'db', topic: 'pull_request.build.*', vent: 'receiver', callback: 'createStatus'},

    // CONFIG EVENTS
    {channel: 'receiver', topic: 'config', vent: 'receiver', callback: 'addRepo'},
    {channel: 'build', topic: 'config', vent: 'build', callback: 'addProject'}
];
