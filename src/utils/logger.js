const chalk = require('chalk');

class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  log(message, type = 'info') {
    if (!this.verbose) return;
    
    const timestamp = new Date().toISOString();
    const prefix = chalk.gray(`[${timestamp}]`);
    
    switch (type) {
      case 'debug':
        console.log(prefix + ' ' + chalk.blue('[DEBUG]') + ' ' + message);
        break;
      case 'info':
        console.log(prefix + ' ' + chalk.cyan('[INFO]') + ' ' + message);
        break;
      case 'warn':
        console.log(prefix + ' ' + chalk.yellow('[WARN]') + ' ' + message);
        break;
      case 'error':
        console.log(prefix + ' ' + chalk.red('[ERROR]') + ' ' + message);
        break;
      case 'success':
        console.log(prefix + ' ' + chalk.green('[SUCCESS]') + ' ' + message);
        break;
      default:
        console.log(prefix + ' ' + message);
    }
  }
}

module.exports = Logger;