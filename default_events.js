"use strict";

// not a JSON file because...this needs comments

module.exports = [
    // PAYLOAD EVENTS
    {channel: 'hook', topic: 'payload', adapter: 'vcs', callback: 'handleRequest'},

    // reactions to VCS payloads
    {channel: 'vcs', topic: 'change', adapter: 'build', callback: 'buildChange'},
    {channel: 'vcs', topic: 'proposal', adapter: 'build', callback: 'buildProposal'},

    // publisher triggers
    {channel: 'build', topic: 'queued', adapter: 'publisher', callback: 'createStatus'},
    {channel: 'build', topic: 'building', adapter: 'publisher', callback: 'createStatus'},
    {channel: 'build', topic: 'success', adapter: 'publisher', callback: 'createStatus'},
    {channel: 'build', topic: 'failure', adapter: 'publisher', callback: 'createStatus'},
    {channel: 'build', topic: 'error', adapter: 'publisher', callback: 'createStatus'}

];
