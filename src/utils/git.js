const { execSync } = require('child_process');
const chalk = require('chalk');

class GitUtils {
  static extractRemoteUrl(remotes) {
    const match = remotes.match(/origin\s+(.+?)\s+\(fetch\)/);
    return match ? match[1] : '';
  }

  static parseGitHubUrl(url) {
    // Handle different GitHub URL formats
    // https://github.com/owner/repo.git
    // https://github.com/owner/repo
    // git@github.com:owner/repo.git
    
    let match;
    
    // HTTPS format
    if (url.includes('https://github.com/')) {
      match = url.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    }
    // SSH format
    else if (url.includes('git@github.com:')) {
      match = url.match(/git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    }
    
    if (match) {
      const owner = match[1];
      const repository = match[2];
      return { owner, repository };
    }
    
    // Fallback - try to extract from the end of the URL
    const parts = url.replace('.git', '').split('/');
    const repository = parts[parts.length - 1];
    const owner = parts[parts.length - 2];
    
    return { owner: owner || 'unknown', repository: repository || 'unknown' };
  }

  static async checkRemoteRepository(currentDir, logger) {
    logger.log('Executing: git remote -v', 'debug');
    
    try {
      const remotes = execSync('git remote -v', { encoding: 'utf8', cwd: currentDir });
      logger.log(`Git remotes output: ${remotes.trim()}`, 'debug');
      return remotes;
    } catch (error) {
      logger.log(`Git command error: ${error.message}`, 'error');
      throw error;
    }
  }

  static initializeGitRepo(currentDir, logger) {
    logger.log('Git repository not found, initializing', 'info');
    execSync('git init', { cwd: currentDir });
    logger.log('Git repository initialized', 'success');
  }
}

module.exports = GitUtils;