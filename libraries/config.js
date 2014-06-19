// TODO: turn this into an actual object / component
// ...when we need something *more* than just a hash

module.exports = {
  port: 8080,
  log: {
    console: {
      level: 'info',
      colorize: false
    }
  },
  build: {
    plugin: 'jenkins',
    jenkins: {
      method: 'hooks',
      projects: [],
      push_projects: []
    }
  },
  db: {},
  vcs: {
    plugin: 'github',
    github: {
      method: 'hooks',
      repos: []
    }
  },
  cache: {
    max: 64,
    maxAge: 60 * 1000
  }
};
