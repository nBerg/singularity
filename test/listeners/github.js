var sinon = require('sinon'),
    chai = require('chai'),
    expect = chai.expect,
    Emitter = require('events').EventEmitter,
    GitHub = require('../../listeners/github');

chai.use(require('sinon-chai'));

describe('listeners/github', function() {
  var test = this;

  beforeEach(function() {
    test.app = new Emitter();
    test.app.log = { info: function() {} };
    test.config = {repos: ['old_repo']};
    test.github = GitHub.init(test.config, test.app);
  });

  describe('handlePush', function(done) {
    it('is called when push event is emitted', function() {
      var handlePushSpy = sinon.spy();

      sinon.stub(test.github, 'handlePush', handlePushSpy);

      test.app.emit('push', 'dummy');

      expect(handlePushSpy).to.be.calledWith('dummy');
    });
  });

  describe('handleIssueComment', function(done) {
    it('is called when issue_comment event is emitted', function() {
      var handleIssueCommentSpy = sinon.spy();

      sinon.stub(test.github, 'handleIssueComment', handleIssueCommentSpy);

      test.app.emit('issue_comment', 'dummy');

      expect(handleIssueCommentSpy).to.be.calledWith('dummy');
    });
  });

  describe('handlePullRequest', function(done) {
    it('reacts properly to pull_request events', function() {
      var handlePRSpy = sinon.spy();

      sinon.stub(test.github, 'handlePullRequest', handlePRSpy);

      test.app.emit('pull_request', 'application_emit');
      test.app.emit('pull_request', 'self_emit');

      expect(handlePRSpy).to.have.been.calledTwice;
      expect(handlePRSpy).to.have.been.calledWith('application_emit');
      expect(handlePRSpy).to.have.been.calledWith('self_emit');
    });
  });

  describe('setupRepoHooks', function(done) {
    it('ignores repos in config', function() {
      var webhookSpy = sinon.spy();
      sinon.stub(test.github, 'createWebhook', webhookSpy);

      test.github.setupRepoHooks(test.config.repos);

      expect(webhookSpy).to.not.have.been.called;
    });

    it('filters repos', function() {
      var webhookSpy = sinon.spy();
      sinon.stub(test.github, 'createWebhook', webhookSpy);

      test.github.setupRepoHooks(['new_repo']);

      expect(webhookSpy).to.have.been.calledOnce;
      expect(webhookSpy).to.have.been.calledWith('new_repo');
    });
  });
});
