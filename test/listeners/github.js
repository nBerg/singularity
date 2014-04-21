var sinon = require('sinon'),
    assert = require('assert'),
    Emitter = require('events').EventEmitter,
    GitHub = require('../../listeners/github');

describe('Github', function() {
  var test = this;

  beforeEach(function() {
    test.events = new Emitter();
    test.github = GitHub.init({}, test.events, test.events);
  });

  describe('handlePush', function(done) {
    it('is called when push event is emitted', function() {
      var handlePushSpy = sinon.spy();

      sinon.stub(test.github, 'handlePush', handlePushSpy);

      test.events.emit('push', 'dummy');

      assert(handlePushSpy.calledWith('dummy'));
    });
  });

  describe('handleIssueComment', function(done) {
    it('is called when issue_comment event is emitted', function() {
      var handleIssueCommentSpy = sinon.spy();

      sinon.stub(test.github, 'handleIssueComment', handleIssueCommentSpy);

      test.events.emit('issue_comment', 'dummy');

      assert(handleIssueCommentSpy.calledWith('dummy'));
    });
  });

  describe('handlePullRequest', function(done) {
    it('reacts properly to pull_request events', function() {
      var handlePRSpy = sinon.spy();

      sinon.stub(test.github, 'handlePullRequest', handlePRSpy);

      test.events.emit('pull_request', 'application_emit');
      test.events.emit('pull_request', 'self_emit');

      // each one should be called twice, since the internal emitter AND application
      // are the same object
      assert(handlePRSpy.withArgs('application_emit').calledTwice);
      assert(handlePRSpy.withArgs('self_emit').calledTwice);
    });
  });
});
