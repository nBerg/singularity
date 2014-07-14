var Plugin = require('../../../../libraries/plugins/dbs/redis'),
    VcsPayload = require('../../../../libraries/payloads/vcs').VcsPayload,
    DbPayload = require('../../../../libraries/payloads/db').DbPayload,
    chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    redis = require('redis');

// dependencies & test lib configuration
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
var pluginConfig = {
  port: 6379,
  host: 'localhost'
};

describe('plugins/dbs/redis', function() {
  var instance, logDebugSpy, sinonSandbox, redisStub;

  beforeEach(function(done) {
    instance = new Plugin(pluginConfig);
    sinonSandbox = sinon.sandbox.create();
    logDebugSpy = sinonSandbox.spy(instance.log, 'debug');
    redisStub = sinonSandbox.stub(instance._client);
    done();
  });

  afterEach(function(done) {
    sinonSandbox.restore();
    done();
  });

  describe('#addProposalToRepo', function() {
    it('works', function() {
      var payload = new VcsPayload({
        repo: 'example/example',
        change_id: 5,
      });

      expect(instance.addProposalToRepo(payload.data))
      .to.eventually.eql(new DbPayload(
        {}
      ))
      .then(function() {
        expect(redisStub.set).to.be.calledWith('proposals:5', '{"repo":"example/example","change_id":5}');
        expect(redisStub.rpush).to.be.calledWith('example/example:proposals', 'proposals:5');
      })
      .done();
    });
  });
});
