"use strict"

// not a JSON file because...this needs comments

module.exports = [
    // PAYLOAD EVENTS
    {channel: 'hook', topic: 'payload', adapter: 'vcs', callback: 'handleRequest'},

    // reactions to VCS payloads
    {channel: 'vcs', topic: 'change', adapter: 'build', callback: 'buildChange'},
    {channel: 'vcs', topic: 'proposal', adapter: 'build', callback: 'buildProposal'}
];
