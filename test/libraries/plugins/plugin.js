var Plugin = require('../../../libraries/plugins/plugin'),
chai = require('chai'),
expect = chai.expect,
sinon = require('sinon');

chai.use(require('sinon-chai'));

describe('Plugin', function() {
  // stubbing like this because...libs use singletons
  var instance = new Plugin(),
  logErrorSpy = sinon.spy(),
  postalChannelSpy = sinon.spy();
  sinon.stub(require('postal'), 'channel', postalChannelSpy);
  sinon.stub(instance.log, 'error', logErrorSpy);

  beforeEach(function(done) {
    instance = new Plugin();
    done();
  });

  describe('#setChannel', function() {
    it('creates a channel with the given name', function() {
      instance.setChannel('foo');
      expect(postalChannelSpy).to.have.been.calledWithExactly('foo');
    });
  });

  describe('#publish', function() {
    it('throws when there is no channel set', function() {
      instance.publish('foo', 'bar');
      expect(logErrorSpy).to.have.been
        .calledWithMatch('cannot publish topic, no channel');
    });

    it('publishes to topic with data', function() {
      var channelSpy = sinon.spy();
      instance.channel = { publish: function() {} };
      sinon.stub(instance.channel, 'publish', channelSpy);

      instance.publish('foo', 'bar');
      expect(channelSpy).to.have.been.calledWithExactly('foo', 'bar');
    });
  });
});
