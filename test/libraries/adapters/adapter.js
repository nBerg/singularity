"use strict";

var Adapter = require('../../../libraries/adapters/adapter'),
    chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon');

chai.use(require('sinon-chai'));

var TestAdapter = Adapter.extend({
  pluginType: 'test_adapters',
  name: 'test_adapter'
});

describe('Adapter', function() {
  var instance, sinonSandbox, errorStub, debugStub;

  beforeEach(function(done) {
    sinonSandbox = sinon.sandbox.create();
    instance = new TestAdapter({});
    errorStub = sinonSandbox.stub(instance, 'error');
    debugStub = sinonSandbox.stub(instance, 'debug');
    done();
  });

  afterEach(function(done) {
    sinonSandbox.restore();
    done();
  });

  describe('#publishPayload', function() {
    it('errors when undefined payload given', function() {
      instance.publishPayload();
      expect(debugStub).to.have.been.calledOnce;
      expect(debugStub).to.have.been.calledWithMatch(/no payload given/);
    });

    it('errors when payload has no type', function() {
      instance.publishPayload({});
      expect(debugStub).to.have.been.calledOnce;
      expect(debugStub).to.have.been.calledWithMatch(/payload has no type/);
    });

    it('publishes!', function() {
      var postalStub = sinonSandbox.stub(instance.channel, 'publish'),
          payload = { type: 'test_payload' };
      instance.publishPayload(payload);
      expect(errorStub).to.not.have.been.called;
      expect(debugStub).to.have.been.called;
      expect(postalStub).to.have.been.calledOnce;
      expect(postalStub).to.have.been.calledWithExactly('test_payload', payload);
    });
  });

  describe('#_getCfgPluginList', function() {
    it('can take a single plugin name', function() {
      expect(instance._getCfgPluginList({plugin: 'blah'}))
      .to.eql(['blah']);
    });

    it('can take an array of plugin names', function() {
      expect(instance._getCfgPluginList({plugin: ['foo', 'bar']}))
      .to.eql(['foo', 'bar']);
    });

    it('attempts to pull out all plugin configs otherwise', function() {
      expect(instance._getCfgPluginList({foo: {}, bar: {}}))
      .to.eql(['foo', 'bar']);
    });
  });
});
