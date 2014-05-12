exports.config = {
  // used to create webhooks. port is appended to this
  // so no trailing slash!
  host: 'http://your.hosts.domain',
  // port that express will run on
  port: '8080',
  // info or debug
  log_level: 'debug',
  // whether to save this configuration into the database
  // and opt to use stored configs over this file
  persist_config: true,
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
  plugins: {
    github: {
      method: 'hooks',
      // passed directly into the github module so username & password works too
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
      token: 'project_trigger_token_for_all_projects',
      push_projects: {
        'your_repo': {
          // refs
          rules: [ new RegExp(/^master$/) ],
          name: 'jenkins_project_to_trigger_on_push',
          token: 'project_trigger_token_just_for_this_project'
        }
      },
      // todo: enforce using a hash
      projects: [
        {
          name: 'project_name',
          repo: 'mapped_repo',
          rules: [],
          token: 'project_trigger_token_just_for_this_project'
        }
      ],
      frequency: 2000
    }
  }
};
