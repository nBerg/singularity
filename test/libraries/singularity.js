var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    Singularity = require('../../libraries/singularity');

chai.use(require('sinon-chai'));

describe('libraries/singularity', function() {
  var test = this,
      checkSparseConfig = function(config) {
        expect(config).to.have.keys(['github', 'jenkins']);

        expect(config.github).to.have.keys(['ci_user', 'repositories']);
        expect(config.github.ci_user).to.be.false;
        expect(config.github.repositories).to.be.an('Array');
        expect(config.github.repositories).to.be.empty;

        expect(config.jenkins).to.have.keys(['has_global_trigger_token', 'projects', 'push_projects']);
        expect(config.jenkins.has_global_trigger_token).to.be.false;
        expect(config.jenkins.projects).to.be.an('Array');
        expect(config.jenkins.projects).to.be.empty;
        expect(config.jenkins.push_projects).to.be.an('Array');
        expect(config.jenkins.push_projects).to.be.empty;
      };

  beforeEach(function(done) {
    test.config = require('../../config.sample.js').config;
    // don't want to test the db...
    test.config.db = null;
    done();
  });

  describe('getDomain', function() {
    it('builds default domain correctly', function() {
      var app = new Singularity({});

      expect(app.getDomain()).to.equal('localhost:80');
    });

    it('can take host & endpoint overrides', function() {
      var app = new Singularity({ host: 'blah', port: '8889' });

      expect(app.getDomain()).to.equal('blah:8889');
    });
  });

  describe('getConfig', function(done) {
    it('sets defaults correctly', function() {
      checkSparseConfig(new Singularity({}).getConfig());
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
    var self = this,
        config = {
          plugins: {
            github: {
              repos: ['test_repo']
            },
            jenkins: {
              projects: [
                {
                  repo: 'test_repo',
                  name: 'test_repo_project'
                },
                {
                  repo: 'test_repo2',
                  name: 'test_repo2_project'
                }
              ]
            }
          }
        };

    beforeEach(function(done) {
      self.app = new Singularity(config);
      self.logSpy = sinon.spy(),
      self.emitSpy = sinon.spy();
      sinon.stub(self.app.log, 'info', self.logSpy);
      sinon.stub(self.app, 'emit', self.emitSpy);

      done();
    });

    it('does not update when repo is already in github config', function() {
      var args = { repo: 'test_repo', project: 'test_repo_project' };
      expect(self.app.addRepoPRJob(args)).to.be.false;
      expect(self.logSpy).to.have.been.calledWithExactly('duplicate github repo', args);
      expect(self.emitSpy).to.not.have.been.called;
    });

    it('does not update when repo is already in a jenkins config', function() {
      var args = { repo: 'test_repo2', project: 'new_test_repo2_project' };
      expect(self.app.addRepoPRJob(args)).to.be.false;
      expect(self.logSpy).to.have.been.calledWithExactly('duplicate jenkins repo or project', args);
      expect(self.emitSpy).to.not.have.been.called;
    });

    it('does not update when project is already in a jenkins config', function() {
      var args = { repo: 'new_test_repo', project: 'test_repo2_project' };
      expect(self.app.addRepoPRJob(args)).to.be.false;
      expect(self.logSpy).to.have.been.calledWithExactly('duplicate jenkins repo or project', args);
      expect(self.emitSpy).to.not.have.been.called;
    });

    it('actually updates properly', function() {
      var args = { repo: 'new_test_repo', project: 'new_test_project' };

      expect(self.app.addRepoPRJob(args)).to.be.true;
      expect(self.logSpy).to.have.been.called;
      expect(self.emitSpy).to.have.been.calledWith('jenkins.new_pr_job');
      expect(self.emitSpy).to.have.been.calledWithExactly('github.new_repo', 'new_test_repo');
    });
  });
});
