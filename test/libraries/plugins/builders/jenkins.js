"use strict";

require('replay');

var Plugin = require('../../../../libraries/plugins/builders/jenkins'),
    chai = require('chai'),
    expect = chai.expect;

chai.use(require('chai-as-promised'));

describe('plugins/builders/jenkins', function() {
  var instance, config;

  beforeEach(function(done) {
    config = {};
    instance = new Plugin(config);
    done();
  });

  describe('#validateChangeVcs', function() {
    var vcsPayload;

    beforeEach(function(done) {
      vcsPayload = require('../vcs/test_change')();
      done();
    });

    it('throws when a base param not present', function(done) {
      vcsPayload.repo = false;
      expect(instance.validateChange(vcsPayload))
      .to.eventually.be.rejectedWith(/missing "repo"/)
      .notify(done);
    });

    it('throws when no `before` field', function(done) {
      vcsPayload.before = false;
      expect(instance.validateChange(vcsPayload))
      .to.eventually.be.rejectedWith(/missing "before"/)
      .notify(done);
    });

    it('validates change payload', function(done) {
      expect(instance.validateChange(vcsPayload))
      .to.eventually.deep.eql(vcsPayload)
      .notify(done);
    });
  });

  describe('#validateProposalVcs', function() {
    var vcsPayload;

    beforeEach(function(done) {
      vcsPayload = require('../vcs/test_proposal')();
      done();
    });

    it('throws when a base param not present', function(done) {
      vcsPayload.repo = false;
      expect(instance.validateProposal(vcsPayload))
      .to.eventually.be.rejectedWith(/missing "repo"/)
      .notify(done);
    });

    it('throws when no `repo_url` field', function(done) {
      vcsPayload.repo_url = false;
      expect(instance.validateProposal(vcsPayload))
      .to.eventually.be.rejectedWith(/missing "repo_url"/)
      .notify(done);
    });

    it('throws when no `base_ref` field', function(done) {
      vcsPayload.base_ref = false;
      expect(instance.validateProposal(vcsPayload))
      .to.eventually.be.rejectedWith(/missing "base_ref"/)
      .notify(done);
    });

    it('throws when no `fork_ref` field', function(done) {
      vcsPayload.fork_ref = false;
      expect(instance.validateProposal(vcsPayload))
      .to.eventually.be.rejectedWith(/missing "fork_ref"/)
      .notify(done);
    });

    it('throws when no `fork_url` field', function(done) {
      vcsPayload.fork_url = false;
      expect(instance.validateProposal(vcsPayload))
      .to.eventually.be.rejectedWith(/missing "fork_url"/)
      .notify(done);
    });

    it('validates proposal payload', function(done) {
      expect(instance.validateProposal(vcsPayload))
      .to.eventually.deep.eql(vcsPayload)
      .notify(done);
    });
  });
});
