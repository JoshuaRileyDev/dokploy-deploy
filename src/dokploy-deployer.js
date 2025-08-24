const path = require('path');
const chalk = require('chalk');

const Logger = require('./utils/logger');
const ConfigManager = require('./utils/config');
const RepositoryManager = require('./modules/repository');
const MonorepoDetector = require('./modules/monorepo');
const DokployManager = require('./modules/dokploy');

class DokployDeployer {
  constructor(options = {}) {
    this.currentDir = process.cwd();
    this.folderName = path.basename(this.currentDir);
    this.verbose = options.verbose || false;
    
    // Initialize logger
    this.logger = new Logger(this.verbose);
    
    // Initialize configuration
    this.dokployUrl = '';
    this.apiToken = '';
    
    // Initialize managers
    this.repositoryManager = null;
    this.monorepoDetector = null;
    this.dokployManager = null;
    
    // State
    this.remoteUrl = '';
    this.isMonorepo = false;
    this.monorepoFolders = [];
  }

  async init() {
    console.log(chalk.blue('🚀 Dokploy Deploy CLI'));
    console.log(chalk.gray(`Working in: ${this.currentDir}`));
    console.log(chalk.gray(`Project name: ${this.folderName}`));
    
    this.logger.log('Initializing Dokploy Deploy CLI', 'info');
    this.logger.log(`Current directory: ${this.currentDir}`, 'debug');
    this.logger.log(`Project name: ${this.folderName}`, 'debug');
    this.logger.log(`Verbose mode: ${this.verbose ? 'enabled' : 'disabled'}`, 'debug');

    await this.loadConfiguration();
    await this.setupRepository();
    await this.detectProjectStructure();
    await this.deployToDocploy();
  }

  async loadConfiguration() {
    const config = ConfigManager.loadConfiguration(this.logger);
    this.dokployUrl = config.dokployUrl;
    this.apiToken = config.apiToken;
    this.domain = config.domain;
    
    console.log(chalk.green(`✓ Using Dokploy instance: ${this.dokployUrl}`));
    
    // Initialize Dokploy manager with configuration
    this.dokployManager = new DokployManager(this.dokployUrl, this.apiToken, this.logger, this.domain);
  }

  async setupRepository() {
    this.repositoryManager = new RepositoryManager(this.currentDir, this.folderName, this.logger);
    this.remoteUrl = await this.repositoryManager.checkAndCreateRemoteRepo();
  }

  async detectProjectStructure() {
    this.monorepoDetector = new MonorepoDetector(this.currentDir, this.logger);
    const result = await this.monorepoDetector.checkMonorepo();
    this.isMonorepo = result.isMonorepo;
    this.monorepoFolders = result.monorepoFolders;
  }

  async deployToDocploy() {
    try {
      const projectId = await this.dokployManager.createProject(this.folderName);

      if (this.isMonorepo) {
        await this.dokployManager.createMonorepoApplications(projectId, this.monorepoFolders, this.remoteUrl, this.folderName);
      } else {
        await this.dokployManager.createSingleApplication(projectId, this.folderName, this.remoteUrl);
      }
    } catch (error) {
      this.logger.log(`Deployment failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

module.exports = DokployDeployer;