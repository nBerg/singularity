Singularity [![Build Status](https://travis-ci.org/Barycenter/singularity.svg?branch=master)](https://travis-ci.org/Barycenter/singularity)
===========

**All your github payloads are belong to us.**

A refactored form of SnapInteractive's [Mergeatron](https://github.com/SnapInteractive/mergeatron), sitting behind an [express.js](https://github.com/visionmedia/express) application (v4.x).

###Main differences:

- data schema has a few additions
- MongoDB is the only supported DB layer (sorry)
- various endpoints that allow users / services / applications to query data & interact with github (most importantly, merge PRs and store data for those merges).
- schema for the config is simplified

###To Come:

- dynamic loading, registering & storing of repos & Jenkins jobs.
- persistence of configs in mongo, or writing updates to the file.
- support for multiple organizations
- better module structuring
- proper routing / yavascripts (because I'm not a JS dev)
