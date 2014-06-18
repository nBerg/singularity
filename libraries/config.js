// TODO: turn this into an actual object / component
// ...when we need something *more* than just a hash

module.exports = {
  port: 8080,
  log: {
    console: {
      level: 'debug',
      colorize: true
    }
  },
  build: {
    client: 'jenkins',
    method: 'hooks',
    jenkins: {
      projects: [],
      push_projects: []
    }
  },
  db: {
    client: 'memory',
    memory: {}
  },
  receiver: {
    client: 'github',
    method: 'hooks',
    github: {
      repos: []
    }
  },
  cache: {
    max: 64,
    maxAge: 60 * 1000
  }
};
