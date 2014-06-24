"use strict"

// not a JSON file because...this needs comments

module.exports = [
    // PAYLOAD EVENTS
    {channel: 'hook', topic: 'payload', adapter: 'vcs', callback: 'handleRequest'},

    // PUSH CHAIN
    {channel: 'vcs', topic: 'push', adapter: 'vcs', callback: 'handlePush'},
    {channel: 'vcs', topic: 'push.validated', adapter: 'db', callback: 'findPush'},
    {channel: 'db', topic: 'push.not_found', adapter: 'build', callback: 'buildPush'},
    {channel: 'build', topic: 'push.triggered', adapter: 'db', callback: 'insertPush'},

    // PULL REQUEST CHAIN
    // incoming from *some* source (hook, vcs, issue_comment, w/e) & then validate that this is a payload
    // that we should trigger a build for
    {channel: 'vcs', topic: 'pull_request', adapter: 'vcs', callback: 'handlePullRequest'},
    {channel: 'vcs', topic: 'pull_request.validated', adapter: 'db', callback: 'findPullRequest'},
    // pull_request on record - update stored PR fields & trigger build
    {channel: 'db', topic: 'pull_request.updated', adapter: 'db', callback: 'updatePullRequest'},
    {channel: 'db', topic: 'pull_request.updated', adapter: 'build', callback: 'buildPullRequest'},
    // not on record - insert & trigger
    {channel: 'db', topic: 'pull_request.not_found', adapter: 'db', callback: 'insertPullRequest'},
    {channel: 'db', topic: 'pull_request.not_found', adapter: 'build', callback: 'buildPullRequest'},
    // store data on the triggered job
    {channel: 'build', topic: 'pull_request.triggered', adapter: 'db', callback: 'insertPullRequestJob'},
    {channel: 'build', topic: 'pull_request.triggered', adapter: 'publisher', callback: 'createPendingStatus'},
    // once stored, update status with build link
    {channel: 'db', topic: 'pull_request.build_stored', adapter: 'publisher', callback: 'createStatus'},

    // ISSUE COMMENT CHAIN
    // depending on whether the callback publishes an event or not, the rest of the chain *should* be
    // equivalent to the `pullChain`
    // i.e.: `handleIssueComment()` must publish data that is isometric to a regular pull_request
    //       event payload
    {channel: 'vcs', topic: 'issue_comment', adapter: 'vcs', callback: 'handleIssueComment'},
    {channel: 'hook', topic: 'retest', adapter: 'vcs', callback: 'handleRetest'},
    {channel: 'vcs', topic: 'pull_request.retest', adapter: 'build', callback: 'buildPullRequest'},
    {channel: 'recevier', topic: 'push.retest', adapter: 'build', callback: 'buildPush'},

    // BUILD CHAIN
    {channel: 'build', topic: 'jobs.polling', adapter: 'db', callback: 'findPendingJobs'},
    // previous call should publish events for everything
    {channel: 'db', topic: 'pull_request.build_pending', adapter: 'build', callback: 'checkPullRequestJob'},
    {channel: 'db', topic: 'push.build_pending', adapter: 'build', callback: 'checkPushJob'},
    // job status change - update DB
    {channel: 'build', topic: 'pull_request.build_updated', adapter: 'db', callback: 'updatePullRequestJob'},
    {channel: 'build', topic: 'push.build_updated', adapter: 'db', callback: 'updatePushJob'},
    // pull_request.build.* => build status update in DB that should be written to vcs
    {channel: 'db', topic: 'pull_request.build.*', adapter: 'vcs', callback: 'createStatus'},

    // CONFIG EVENTS
    {channel: 'vcs', topic: 'config', adapter: 'vcs', callback: 'addRepo'},
    {channel: 'build', topic: 'config', adapter: 'build', callback: 'addProject'}
];
