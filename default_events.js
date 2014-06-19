"use strict"

// not a JSON file because...this needs comments

module.exports = [
    // PAYLOAD EVENTS
    {channel: 'hook', topic: 'payload', vent: 'vcs', callback: 'handleRequest'},

    // PUSH CHAIN
    {channel: 'hook', topic: 'push', vent: 'vcs', callback: 'handlePush'},
    {channel: 'vcs', topic: 'push.validated', vent: 'db', callback: 'findPush'},
    {channel: 'db', topic: 'push.not_found', vent: 'build', callback: 'buildPush'},
    {channel: 'build', topic: 'push.triggered', vent: 'db', callback: 'insertPush'},

    // PULL REQUEST CHAIN
    // incoming from *some* source (hook, issue_comment, w/e) & then validate that this is a payload
    // that we should trigger a build for
    {channel: 'hook', topic: 'pull_request', vent: 'vcs', callback: 'handlePullRequest'},
    {channel: 'vcs', topic: 'pull_request.validated', vent: 'db', callback: 'findPullRequest'},
    // pull_request on record - update stored PR fields & trigger build
    {channel: 'db', topic: 'pull_request.updated', vent: 'db', callback: 'updatePullRequest'},
    {channel: 'db', topic: 'pull_request.updated', vent: 'build', callback: 'buildPullRequest'},
    // not on record - insert & trigger
    {channel: 'db', topic: 'pull_request.not_found', vent: 'db', callback: 'insertPullRequest'},
    {channel: 'db', topic: 'pull_request.not_found', vent: 'build', callback: 'buildPullRequest'},
    // store data on the triggered job
    {channel: 'build', topic: 'pull_request.triggered', vent: 'db', callback: 'insertPullRequestJob'},
    {channel: 'build', topic: 'pull_request.triggered', vent: 'publisher', callback: 'createPendingStatus'},
    // once stored, update status with build link
    {channel: 'db', topic: 'pull_request.build_stored', vent: 'publisher', callback: 'createStatus'},

    // ISSUE COMMENT CHAIN
    // depending on whether the callback publishes an event or not, the rest of the chain *should* be
    // equivalent to the `pullChain`
    // i.e.: `handleIssueComment()` must publish data that is isometric to a regular pull_request
    //       event payload
    {channel: 'vcs', topic: 'issue_comment', vent: 'vcs', callback: 'handleIssueComment'},
    {channel: 'hook', topic: 'retest', vent: 'vcs', callback: 'handleRetest'},
    {channel: 'vcs', topic: 'pull_request.retest', vent: 'build', callback: 'buildPullRequest'},
    {channel: 'recevier', topic: 'push.retest', vent: 'build', callback: 'buildPush'},

    // BUILD CHAIN
    {channel: 'build', topic: 'jobs.polling', vent: 'db', callback: 'findPendingJobs'},
    // previous call should publish events for everything
    {channel: 'db', topic: 'pull_request.build_pending', vent: 'build', callback: 'checkPullRequestJob'},
    {channel: 'db', topic: 'push.build_pending', vent: 'build', callback: 'checkPushJob'},
    // job status change - update DB
    {channel: 'build', topic: 'pull_request.build_updated', vent: 'db', callback: 'updatePullRequestJob'},
    {channel: 'build', topic: 'push.build_updated', vent: 'db', callback: 'updatePushJob'},
    // pull_request.build.* => build status update in DB that should be written to vcs
    {channel: 'db', topic: 'pull_request.build.*', vent: 'vcs', callback: 'createStatus'},

    // CONFIG EVENTS
    {channel: 'vcs', topic: 'config', vent: 'vcs', callback: 'addRepo'},
    {channel: 'build', topic: 'config', vent: 'build', callback: 'addProject'}
];
