const chalk = require('chalk');

class ConfigManager {
  static loadConfiguration(logger) {
    logger.log('Loading configuration from environment variables', 'info');
    
    const dokployUrl = process.env.DOKPLOY_URL;
    const apiToken = process.env.DOKPLOY_API_KEY;
    const customDomain = process.env.DOKPLOY_DOMAIN;
    
    logger.log(`DOKPLOY_URL from env: ${dokployUrl ? 'set' : 'not set'}`, 'debug');
    logger.log(`DOKPLOY_API_KEY from env: ${apiToken ? 'set (' + apiToken.substring(0, 10) + '...)' : 'not set'}`, 'debug');
    logger.log(`DOKPLOY_DOMAIN from env: ${customDomain ? 'set (' + customDomain + ')' : 'not set (using default)'}`, 'debug');

    if (!dokployUrl) {
      logger.log('DOKPLOY_URL environment variable is missing', 'error');
      console.error(chalk.red('Error: DOKPLOY_URL environment variable is required'));
      console.log(chalk.gray('Set it with: export DOKPLOY_URL=https://your-dokploy-instance.com'));
      process.exit(1);
    }

    if (!apiToken) {
      logger.log('DOKPLOY_API_KEY environment variable is missing', 'error');
      console.error(chalk.red('Error: DOKPLOY_API_KEY environment variable is required'));
      console.log(chalk.gray('Set it with: export DOKPLOY_API_KEY=your-api-token'));
      process.exit(1);
    }

    logger.log(`Validating URL: ${dokployUrl}`, 'debug');
    try {
      new URL(dokployUrl);
      logger.log('URL validation successful', 'success');
    } catch (error) {
      logger.log(`URL validation failed: ${error.message}`, 'error');
      console.error(chalk.red('Error: DOKPLOY_URL must be a valid URL'));
      process.exit(1);
    }

    const finalUrl = dokployUrl.replace(/\/$/, '');
    logger.log(`Final URL (trailing slash removed): ${finalUrl}`, 'debug');
    
    // Domain is required
    if (!customDomain) {
      logger.log('DOKPLOY_DOMAIN environment variable is missing', 'error');
      console.error(chalk.red('Error: DOKPLOY_DOMAIN environment variable is required'));
      console.log(chalk.gray('Set it with: export DOKPLOY_DOMAIN=your-wildcard-domain.com'));
      process.exit(1);
    }
    
    logger.log(`Using domain: ${customDomain}`, 'debug');
    
    return {
      dokployUrl: finalUrl,
      apiToken,
      domain: customDomain
    };
  }
}

module.exports = ConfigManager;