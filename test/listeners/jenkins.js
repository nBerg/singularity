var sinon = require('sinon'),
    assert = require('assert'),
    Emitter = require('events').EventEmitter,
    Jenkins = require('../../listeners/jenkins');

describe('Jenkins', function() {
  var test = this;

  beforeEach(function(done) {
    test.events = new Emitter();
    test.app = new Emitter();
    test.generator = {v1: function() { return 'test-id'; }};
    test.config = {
      token: 'global_test_token',
      push_projects: {
        test_repo: {
          name: 'test_project',
          token: 'test_token'
        }
      }
    };
    test.jenkins = Jenkins.init(test.config, test.app, test.generator);
    test.mockPush = {
      repository: { name: 'test_repo' },
      before: 'before_sha',
      ref: 'test_ref',
      after: 'after_sha'
    };

    done();
  });

  describe('buildPush', function() {
    it('triggers builds with expected params', function() {
      var triggerSpy = sinon.spy(),
          expected_opts = {
            token: 'test_token',
            cause: 'test_ref updated to after_sha',
            BRANCH_NAME: 'test_branch',
            BEFORE: 'before_sha',
            AFTER: 'after_sha',
            JOB: 'test-id'
          };

      sinon.stub(test.jenkins, 'triggerBuild', triggerSpy);

      test.jenkins.buildPush(test.mockPush, 'test_branch');

      assert(triggerSpy.withArgs('test_project', expected_opts).calledOnce);
    });
  });
});
