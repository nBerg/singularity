var expect = require('chai').expect,
    assert = require('chai').assert,
    Singularity = require('../../libraries/singularity');

describe('Singularity', function() {
  var test = this;

  beforeEach(function() {
    test.config = require('../../config.sample.js').config;
  });

  describe('getConfig', function(done) {
    it('handles empty configs correctly', function() {
      var bareApp = new Singularity({}),
          sparserApp = new Singularity({ plugins: {} });

      expect(bareApp.getConfig()).to.be.empty;
      expect(sparserApp.getConfig()).to.be.empty;
    });

    it('sets defaults correctly', function() {
      var sparseConfig = { plugins: { github: {}, jenkins: {} } },
          defaultAppConfig = new Singularity(sparseConfig).getConfig();

      expect(defaultAppConfig).to.have.keys(['github', 'jenkins']);

      expect(defaultAppConfig.github).to.have.keys(['ci_user', 'repositories']);
      expect(defaultAppConfig.github.ci_user).to.be.false;
      assert.isArray(defaultAppConfig.github.repositories);
      expect(defaultAppConfig.github.repositories).to.be.empty;

      expect(defaultAppConfig.jenkins).to.have.keys(['has_global_trigger_token', 'projects', 'push_projects']);
      expect(defaultAppConfig.jenkins.has_global_trigger_token).to.be.false;
      assert.isArray(defaultAppConfig.jenkins.projects);
      expect(defaultAppConfig.jenkins.projects).to.be.empty;
      assert.isArray(defaultAppConfig.jenkins.push_projects);
      expect(defaultAppConfig.jenkins.push_projects).to.be.empty;
    });

    it('filters data correctly', function() {
      // rebind values so it's easier to test...
      // todo: really think of a better way to do this
      test.config.plugins.jenkins.push_projects = {
        test_repo: {
          name: 'test_job'
        }
      };
      var config = new Singularity(test.config).getConfig();

      expect(config).to.have.keys(['github', 'jenkins']);
      expect(config.github).to.have.keys(['ci_user', 'repositories']);
      expect(config.github.ci_user).to.equal(test.config.plugins.github.auth.username);
      expect(config.github.repositories).to.deep.equal(test.config.plugins.github.repos);

      expect(config.jenkins).to.have.keys(['has_global_trigger_token', 'projects', 'push_projects']);
      expect(config.jenkins.has_global_trigger_token).to.be.true;
      expect(config.jenkins.projects.length).to.equal(1);

      var projectCfg = config.jenkins.projects.pop(),
          pushProjectCfg = config.jenkins.push_projects.pop(),
          keys = ['name', 'repo', 'has_trigger_token'];

      expect(projectCfg).to.have.keys(keys);
      expect(projectCfg.has_trigger_token).to.be.true;
      expect(projectCfg.repo).to.equal(test.config.plugins.jenkins.projects[0].repo);
      expect(projectCfg.name).to.equal(test.config.plugins.jenkins.projects[0].name);

      expect(pushProjectCfg).to.have.keys(keys);
      expect(pushProjectCfg.has_trigger_token).to.be.false;
      expect(pushProjectCfg.repo).to.equal('test_repo');
      expect(pushProjectCfg.name).to.equal('test_job');
    });
  });
});
