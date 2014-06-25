var Plugin = require('../../../../libraries/plugins/vcs/github'),
chai = require('chai'),
expect = chai.expect,
sinon = require('sinon');

// dependencies & test lib configuration
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
var pluginConfig = {
  host: 'foo',
  port: 'bar',
  auth: {
    token: 'my_token',
    type: 'oauth',
    username: 'my_ci_user'
  }
};

describe('plugins/vcs/github', function() {
  var instance;

  beforeEach(function(done) {
    instance = new Plugin(pluginConfig);
    done();
  });

  describe('#init', function() {
    it('authenticates with github API', function() {
      expect(instance._api.auth).to.deep.equal(pluginConfig.auth);
    });
  });

  describe('#processPayload', function() {
    var testPr, publishSpy;

    beforeEach(function(done) {
      testPr = require('./test_pr');
      publishSpy = sinon.spy(instance, 'publish');
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

    it('publishes plain pull_request payloads', function() {
      testPr.__headers = {'x-github-event': 'pull_request'};
      return expect(instance.processPayload(testPr))
      .to.be.fulfilled
      .then(function() {
        expect(publishSpy).to.be.calledWith('proposal');
      });
    });

    it('accepts hook PR payloads for synchronize actions', function() {
      testPr = {
        pull_request: testPr,
        action: 'synchronize'
      };
      testPr.__headers = {'x-github-event': 'pull_request'};
      return expect(instance.processPayload(testPr))
      .to.be.fulfilled
      .then(function() {
        return expect(publishSpy).to.be.calledWith('proposal');
      });
    });

    it('accepts hook PR payloads for opened actions', function() {
      testPr = {
        pull_request: testPr,
        action: 'opened'
      };
      testPr.__headers = {'x-github-event': 'pull_request'};
      return expect(instance.processPayload(testPr))
      .to.be.fulfilled
      .then(function() {
        return expect(publishSpy).to.be.calledWith('proposal');
      });
    });

    it('rejects hook PR payloads for unrecognized actions', function() {
      testPr = {
        pull_request: testPr,
        action: 'bad_event'
      };
      testPr.__headers = {'x-github-event': 'pull_request'};
      return expect(instance.processPayload(testPr))
      .to.eventually.be.rejectedWith(/ignoring pull action/);
    });
  });
});
