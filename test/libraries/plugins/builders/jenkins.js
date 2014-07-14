"use strict";

require('replay');

var Plugin = require('../../../../libraries/plugins/builders/jenkins'),
    chai = require('chai'),
    expect = chai.expect;

chai.use(require('chai-as-promised'));

describe('plugins/builders/jenkins', function() {
  var instance, config;

  beforeEach(function(done) {
    config = {
        auth: {
            project_token: 'global_project_token'
        },
        projects: {
            test_repo_string: 'string_repo',
            test_repo_obj: {}
        }
    };
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

  describe('#_buildForVcs', function() {
    it('rejects when config has no projects', function() {
    instance = new Plugin({});
      return expect(instance._buildForVcs({}))
        .to.eventually.be.rejectedWith('no projects given in config');
    });

    it('rejects when repo config DNE', function() {
      return expect(instance._buildForVcs({repo: 'dne_repo'}))
        .to.eventually.be.rejectedWith(/associated with any projects/);
    });

    it('rejects when repo object config has no matching type', function() {
      return expect(instance._buildForVcs({repo: 'test_repo_obj', type: 'foo'}))
        .to.eventually.be.rejectedWith(/no foo/);
    });
  });
});
