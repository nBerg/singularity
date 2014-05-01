var expect = require('chai').expect,
    assert = require('chai').assert,
    Singularity = require('../../libraries/singularity');

describe('Singularity', function() {
  var test = this,
      checkSparseConfig = function(config) {
        expect(config).to.have.keys(['github', 'jenkins']);

        expect(config.github).to.have.keys(['ci_user', 'repositories']);
        expect(config.github.ci_user).to.be.false;
        assert.isArray(config.github.repositories);
        expect(config.github.repositories).to.be.empty;

        expect(config.jenkins).to.have.keys(['has_global_trigger_token', 'projects', 'push_projects']);
        expect(config.jenkins.has_global_trigger_token).to.be.false;
        assert.isArray(config.jenkins.projects);
        expect(config.jenkins.projects).to.be.empty;
        assert.isArray(config.jenkins.push_projects);
        expect(config.jenkins.push_projects).to.be.empty;
      };

  beforeEach(function() {
    test.config = require('../../config.sample.js').config;
  });

  describe('getConfig', function(done) {
    it('sets defaults correctly', function() {
      var defaultAppConfig = new Singularity({}).getConfig();

          checkSparseConfig(defaultAppConfig);
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

  describe('addRepoPRJob', function() {
    it('does not update when repo is already in github config', function() {

    });

    it('does not update when repo is already in a jenkins config', function() {

    });

    it('does not update when project is already in a jenkins config', function() {

    });

    it('actually updates properly', function() {

    });
  });
});
