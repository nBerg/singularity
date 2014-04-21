module.exports = function(log_level) {
  var winston = require('winston'),
      logger = new (winston.Logger)({
        transports: [new (winston.transports.Console)({ level: log_level })]
      });

  logger.cli();

  return logger;
};
