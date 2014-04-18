exports.config = {
  db: {
    type: 'mongo',
    auth: {
      user: 'username',
      pass: 'password',
      host: 'your_host',
      port: 27017,
      db: 'mergeatron',
      slaveOk: false
    },
    collections: [ 'pulls', 'pushes', 'merges' ]
  },
  log_level: 'debug',
  port: '8080',
  plugins: {
    github: {
      method: 'hooks',
      auth: {
        type: 'oauth',
        token: 'CI-USER-TOKEN',
        username: 'CI-USER'
      },
      user: 'ORGANIZATION',
      repos: [ 'ARRAY OF REPO NAMES FOR ORG' ],
      skip_file_listing: true
    },
    jenkins:  {
      user: 'YOUR_JENKINS_USER',
      pass: 'PASSWORD',
      protocol: 'http',
      host: 'YOUR_JENKINS_HOST',
      projects: [
        token: 'project_trigger_token'
        {
          name: 'project_name',
          repo: 'mapped_repo',
          token: 'project_trigger_token_just_for_this_project'
        }
      ],
      frequency: 2000
    }
  }
};
