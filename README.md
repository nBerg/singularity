Singularity [![Build Status](https://travis-ci.org/behance/singularity.svg?branch=master)](https://travis-ci.org/behance/singularity)
===========

**All your github payloads are belong to us.**

A refactored form of SnapInteractive's [Mergeatron](https://github.com/SnapInteractive/mergeatron), sitting behind an [express.js](https://github.com/visionmedia/express) application (v4.x).

###Main differences:

- data schema has a few additions
- MongoDB is the only supported DB layer (sorry - until I figure out a way to simulate a DB abstraction interface)
- plugins are split out into `listeners` and that's all they do. The github plugin does not contain a simple http server anymore, events are emitted to it from the application.
- various endpoints that allow users / services / applications to query data & interact with github (most importantly, merge PRs and store data for those merges).
- dynamic loading, registering & storing of repos & Jenkins jobs (with said endpoints)
- schema for the config is simplified.
- a LOT more logging (that's actually useful)
- **tests. actual. tests.**

###To Come:

- persistence of configs in mongo, or writing updates to the file...or both.
- support for multiple organizations
- better module structuring
- proper routing / yavascripts (because I'm not a JS dev)
