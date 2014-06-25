var Plugin = require('../../../../libraries/plugins/vcs/github'),
chai = require('chai'),
expect = chai.expect,
sinon = require('sinon');

// dependencies & test lib configuration
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
var pluginConfig = {
  method: 'hooks',
  host: 'foo',
  port: 'bar',
  auth: {
    token: 'my_token',
    type: 'oauth',
    username: 'my_ci_user'
  }
};

describe('plugins/vcs/github', function() {
  var instance, logDebugSpy, sinonSandbox;

  beforeEach(function(done) {
    instance = new Plugin(pluginConfig);
    sinonSandbox = sinon.sandbox.create();
    logDebugSpy = sinonSandbox.spy(instance.log, 'debug');
    done();
  });

  afterEach(function(done) {
    sinonSandbox.restore();
    done();
  });

  describe('#init', function() {
    it('authenticates with github API', function() {
      expect(instance._api.auth).to.deep.equal(pluginConfig.auth);
    });
  });

  describe('#start', function() {
    it('polls just once when method is hooks', function() {
      var pollReposSpy = sinonSandbox.spy();
      sinonSandbox.stub(instance, 'pollRepos', pollReposSpy);
      instance.start();
      expect(logDebugSpy).to.be.calledOnce;
      expect(pollReposSpy).to.be.calledOnce;
    });
  });

  describe('#processPayload', function() {
    var testPr, testPush, testComment, publishSpy;

    beforeEach(function(done) {
      testPr = require('./test_pr')();
      publishSpy = sinonSandbox.spy(instance, 'publish');
      done();
    });

    it('throws error when no headers given', function() {
      return expect(instance.processPayload({}))
        .to.eventually.be
        .rejectedWith('invalid payload - no __headers field');
    });

    it('throws error when no x-github-event header', function() {
      return expect(instance.processPayload({ __headers: {} }))
        .to.eventually.be
        .rejectedWith('not a github event, ignoring');
    });

    it('throws error when unrecognized event sent', function() {
      return expect(instance.processPayload({
        __headers: {'x-github-event': 'foo'}
      }))
      .to.be
      .rejectedWith(/unrecognized event/);
    });

    describe('=> pull_request', function() {
      it('publishes plain pull_request payloads', function() {
        return expect(instance.processPayload(testPr))
        .to.be.fulfilled
        .then(function() {
          expect(publishSpy).to.be.calledWith('proposal');
        });
      });

      it('accepts hook PR payloads for synchronize actions', function() {
        testPr = {
          __headers: { 'x-github-event': 'pull_request' },
          pull_request: testPr,
          action: 'synchronize'
        };
        return expect(instance.processPayload(testPr))
        .to.be.fulfilled
        .then(function() {
          return expect(publishSpy).to.be.calledWith('proposal');
        });
      });

      it('accepts hook PR payloads for opened actions', function() {
        testPr = {
          __headers: { 'x-github-event': 'pull_request' },
          pull_request: testPr,
          action: 'opened'
        };
        return expect(instance.processPayload(testPr))
        .to.be.fulfilled
        .then(function() {
          return expect(publishSpy).to.be.calledWith('proposal');
        });
      });

      it('rejects hook PR payloads for unrecognized actions', function() {
        testPr = {
          __headers: { 'x-github-event': 'pull_request' },
          pull_request: testPr,
          action: 'bad_event'
        };
        return expect(instance.processPayload(testPr))
        .to.eventually.be.rejectedWith(/ignoring pull action/);
      });

      it('rejects PR payloads that cannot be merged', function() {
        testPr.mergeable = false;
        return expect(instance.processPayload(testPr))
        .to.eventually.be.rejectedWith(/PR cannot be merged, ignoring/);
      });

      it('rejects PR payloads where the user specifies us to ignore', function() {
        testPr.body = '@' + pluginConfig.auth.username + ' ignore';
        return expect(instance.processPayload(testPr))
        .to.eventually.be.rejectedWith(/user requested for PR to be ignored - /);
      });
    });

    describe('=> issue_comment', function() {
      it('can process issue_comment payloads', function() {
        testComment = require('./test_comment')();
        testComment.comment.body = '@' + pluginConfig.auth.username + ' retest';
        return expect(instance.processPayload(testComment))
        .to.be.fulfilled
        .then(function() {
          return expect(publishSpy).to.be.calledWith('proposal');
        });
      });
    });

    describe('=> push', function() {
      it('can process push payloads', function() {
        testPush = require('./test_push')();
        return expect(instance.processPayload(testPush))
        .to.be.fulfilled
        .then(function() {
          return expect(publishSpy).to.be.calledWith('change');
        });
      });
    });

  });
});
