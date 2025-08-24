const { execSync } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');
const GitUtils = require('../utils/git');

class RepositoryManager {
  constructor(currentDir, folderName, logger) {
    this.currentDir = currentDir;
    this.folderName = folderName;
    this.logger = logger;
    this.remoteUrl = '';
  }

  async checkAndCreateRemoteRepo() {
    const spinner = ora('Checking for remote repository...').start();
    this.logger.log('Starting repository check and setup', 'info');
    
    try {
      const remotes = await GitUtils.checkRemoteRepository(this.currentDir, this.logger);
      
      if (!remotes.includes('origin')) {
        this.logger.log('No origin remote found, creating GitHub repository', 'info');
        spinner.text = 'No remote repository found. Creating GitHub repository...';
        await this.createGitHubRepo();
      } else {
        this.remoteUrl = GitUtils.extractRemoteUrl(remotes);
        this.logger.log(`Extracted remote URL: ${this.remoteUrl}`, 'success');
        spinner.succeed(`Remote repository found: ${this.remoteUrl}`);
      }
    } catch (error) {
      this.logger.log(`Git command error: ${error.message}`, 'error');
      if (error.message.includes('not a git repository')) {
        this.logger.log('Not a git repository, initializing', 'info');
        spinner.text = 'Initializing git repository...';
        GitUtils.initializeGitRepo(this.currentDir, this.logger);
        await this.checkAndCreateRemoteRepo();
      } else {
        this.logger.log(`Repository check failed: ${error.message}`, 'error');
        spinner.fail(`Error checking repository: ${error.message}`);
        process.exit(1);
      }
    }

    return this.remoteUrl;
  }

  async createGitHubRepo() {
    const spinner = ora('Creating GitHub repository...').start();
    this.logger.log('Starting GitHub repository creation', 'info');
    
    try {
      spinner.text = 'Checking GitHub CLI authentication...';
      this.logger.log('Checking GitHub CLI authentication', 'debug');
      
      try {
        execSync('gh auth status', { stdio: 'pipe', cwd: this.currentDir });
        this.logger.log('GitHub CLI authentication verified', 'success');
      } catch (error) {
        this.logger.log('GitHub CLI not authenticated', 'error');
        spinner.fail('GitHub CLI not authenticated. Please run: gh auth login');
        process.exit(1);
      }
      
      spinner.text = 'Creating GitHub repository...';
      this.logger.log(`Creating GitHub repository: ${this.folderName}`, 'debug');
      
      const createRepoResult = execSync(
        `gh repo create ${this.folderName} --public --source=. --remote=origin --push`, 
        { encoding: 'utf8', cwd: this.currentDir }
      );
      
      this.logger.log(`GitHub CLI output: ${createRepoResult}`, 'debug');
      
      const repoUrlMatch = createRepoResult.match(/https:\/\/github\.com\/[^\s]+/);
      this.remoteUrl = repoUrlMatch ? repoUrlMatch[0] : `https://github.com/${this.folderName}`;
      
      this.logger.log(`Repository URL set to: ${this.remoteUrl}`, 'success');
      
      spinner.succeed(`GitHub repository created: ${this.remoteUrl}`);
    } catch (error) {
      this.logger.log(`GitHub repository creation failed: ${error.message}`, 'error');
      if (error.message.includes('gh: command not found')) {
        spinner.fail('GitHub CLI not found. Please install it: https://cli.github.com/');
      } else {
        spinner.fail(`Failed to create GitHub repository: ${error.message}`);
      }
      process.exit(1);
    }
  }
}

module.exports = RepositoryManager;