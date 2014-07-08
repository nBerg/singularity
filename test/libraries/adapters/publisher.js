var Plugin = require('../../../libraries/plugins/plugin'),
    Publisher = require('../../../libraries/adapters/publisher'),
    chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon');

    chai.use(require('sinon-chai'));
    chai.use(require('chai-as-promised'));

var TestPlugin = Plugin.extend({
  name: 'tester',

  createStatus: function(payload) {
    console.log("IN THE FAKE PUBLISHER");
    return {
      type: 'statusUpdate',
      repo: payload.repo,
      owner: payload.owner,
      sha: payload.sha,
      status: payload.status,
      buildLink: payload.link,
      publishedMessage: payload.message
    };
  }
}),

config = {
  plugin: [{
    publisher: {
      tester: {}
    }
  }]
};

describe('adapters/publisher', function() {
  var publisher, sinonSandbox, pluginInstance, publisherSpy;

  beforeEach(function(done) {
    sinonSandbox = sinon.sandbox.create();
    publisher = new Publisher(config);

    sinonSandbox.stub(publisher, 'attachPlugin', function(plugin) {
      plugin.log = this.log;
      this.plugins.push(plugin);
    });

    publisherSpy = sinonSandbox.stub(publisher, 'publishPayload');

    pluginInstance = new TestPlugin();
    publisher.attachPlugin(pluginInstance);

    done();
  });

  afterEach(function(done) {
    sinonSandbox.restore();
    done();
  });

  describe('#createStatus', function() {
    it('publishes', function() {
      var buildPayload = {
        status: 'queued',
        artifacts: '',
        buildId: '',
        link: '',
        owner: '',
        repo: '',
        sha: '',
        type: 'queued'
      };

      publisher.createStatus(buildPayload);
      expect(publisherSpy).to.have.been.calledOnce;
      //Also check publisherSpy arguments
    });
  });
});
