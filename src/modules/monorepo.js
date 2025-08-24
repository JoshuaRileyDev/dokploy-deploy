const path = require('path');
const fs = require('fs');
const ora = require('ora');
const chalk = require('chalk');

class MonorepoDetector {
  constructor(currentDir, logger) {
    this.currentDir = currentDir;
    this.logger = logger;
    this.isMonorepo = false;
    this.monorepoFolders = [];
  }

  async checkMonorepo() {
    const spinner = ora('Analyzing project structure...').start();
    
    this.isMonorepo = false;
    this.monorepoFolders = [];

    spinner.text = 'Checking for monorepo indicators...';
    console.log(chalk.gray('\n🔍 Detailed monorepo detection:'));

    // Check for monorepo configuration files
    const configIndicators = [
      { file: 'lerna.json', type: 'Lerna' },
      { file: 'nx.json', type: 'Nx' },
      { file: 'rush.json', type: 'Rush' },
      { file: 'pnpm-workspace.yaml', type: 'PNPM Workspace' },
      { file: 'pnpm-workspace.yml', type: 'PNPM Workspace' },
      { file: 'yarn.lock', type: 'Yarn Workspace (potential)' }
    ];

    const foundIndicators = this.checkConfigIndicators(configIndicators);
    this.checkPackageJsonWorkspaces(foundIndicators);

    // Check for common monorepo directory structures
    const foundDirectories = this.checkDirectoryStructures();

    // Determine if this is a monorepo
    const hasConfigIndicators = foundIndicators.length > 0;
    const hasMultipleApps = foundDirectories.some(d => d.count > 1);
    const hasSingleAppInStructuredDir = foundDirectories.some(d => d.count >= 1);

    console.log(chalk.gray('\n📊 Analysis Results:'));
    console.log(chalk.gray(`  - Config indicators found: ${foundIndicators.length}`));
    console.log(chalk.gray(`  - Directory structures found: ${foundDirectories.length}`));
    console.log(chalk.gray(`  - Total potential applications: ${foundDirectories.reduce((sum, d) => sum + d.count, 0)}`));

    this.processDetectionResults(hasConfigIndicators, hasMultipleApps, hasSingleAppInStructuredDir, foundDirectories, spinner);

    console.log(''); // Add spacing
    return { isMonorepo: this.isMonorepo, monorepoFolders: this.monorepoFolders };
  }

  checkConfigIndicators(configIndicators) {
    const foundIndicators = [];
    for (const indicator of configIndicators) {
      const filePath = path.join(this.currentDir, indicator.file);
      if (fs.existsSync(filePath)) {
        foundIndicators.push(indicator);
        console.log(chalk.green(`  ✓ Found ${indicator.type}: ${indicator.file}`));
        this.logger.log(`Found monorepo indicator: ${indicator.file}`, 'debug');
      }
    }
    return foundIndicators;
  }

  checkPackageJsonWorkspaces(foundIndicators) {
    const packageJsonPath = path.join(this.currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (pkg.workspaces) {
          foundIndicators.push({ file: 'package.json', type: 'Yarn/NPM Workspaces' });
          console.log(chalk.green(`  ✓ Found Yarn/NPM Workspaces in package.json`));
          console.log(chalk.gray(`    - Workspace patterns: ${JSON.stringify(pkg.workspaces)}`));
          this.logger.log(`Found workspaces in package.json: ${JSON.stringify(pkg.workspaces)}`, 'debug');
        }
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not parse package.json: ${error.message}`));
        this.logger.log(`Package.json parse error: ${error.message}`, 'error');
      }
    }
  }

  checkDirectoryStructures() {
    const possibleAppDirs = [
      'packages', 'apps', 'projects', 'modules', 'libs', 
      'services', 'components', 'workspaces', 'sites'
    ];
    
    console.log(chalk.gray('\n📁 Checking directory structures:'));
    const foundDirectories = [];
    
    // First check if directories at root level match monorepo patterns (like api, app)
    const rootItems = fs.readdirSync(this.currentDir).filter(item => {
      const itemPath = path.join(this.currentDir, item);
      return fs.lstatSync(itemPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules';
    });
    
    this.checkRootLevelApps(rootItems, foundDirectories);
    this.checkStructuredDirectories(possibleAppDirs, foundDirectories);

    return foundDirectories;
  }

  checkRootLevelApps(rootItems, foundDirectories) {
    const rootApps = rootItems.filter(item => {
      const itemPath = path.join(this.currentDir, item);
      return this.isProjectDirectory(itemPath);
    });

    if (rootApps.length > 1) {
      console.log(chalk.green(`  ✓ Found ${rootApps.length} applications at root level:`));
      rootApps.forEach(app => {
        const indicators = this.getProjectIndicators(path.join(this.currentDir, app));
        console.log(chalk.gray(`      - ${app}/ (${indicators.join(', ')})`));
      });
      
      foundDirectories.push({
        dir: '.',
        count: rootApps.length,
        apps: rootApps
      });
    }
  }

  checkStructuredDirectories(possibleAppDirs, foundDirectories) {
    for (const dir of possibleAppDirs) {
      const fullPath = path.join(this.currentDir, dir);
      console.log(chalk.gray(`  Checking: ${dir}/`));
      
      if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
        try {
          const items = fs.readdirSync(fullPath);
          const subDirs = items.filter(item => {
            const itemPath = path.join(fullPath, item);
            return fs.lstatSync(itemPath).isDirectory() && this.isProjectDirectory(itemPath);
          });
          
          if (subDirs.length > 0) {
            foundDirectories.push({
              dir,
              count: subDirs.length,
              apps: subDirs
            });
            console.log(chalk.green(`    ✓ Found ${subDirs.length} potential applications:`));
            subDirs.forEach(app => {
              const indicators = this.getProjectIndicators(path.join(fullPath, app));
              console.log(chalk.gray(`      - ${app}/ (${indicators.join(', ')})`));
            });
          } else {
            console.log(chalk.gray(`    - No applications found in ${dir}/`));
          }
        } catch (error) {
          console.log(chalk.yellow(`    ⚠ Error reading ${dir}/: ${error.message}`));
          this.logger.log(`Error reading directory ${dir}: ${error.message}`, 'error');
        }
      } else {
        console.log(chalk.gray(`    - ${dir}/ not found`));
      }
    }
  }

  isProjectDirectory(itemPath) {
    const hasPackageJson = fs.existsSync(path.join(itemPath, 'package.json'));
    const hasIndex = fs.existsSync(path.join(itemPath, 'index.js')) || 
                   fs.existsSync(path.join(itemPath, 'index.ts')) ||
                   fs.existsSync(path.join(itemPath, 'src'));
    const hasNextConfig = fs.existsSync(path.join(itemPath, 'next.config.js')) ||
                        fs.existsSync(path.join(itemPath, 'next.config.ts'));
    const hasViteConfig = fs.existsSync(path.join(itemPath, 'vite.config.js')) ||
                        fs.existsSync(path.join(itemPath, 'vite.config.ts'));
    const hasDockerfile = fs.existsSync(path.join(itemPath, 'Dockerfile'));
    
    return hasPackageJson || hasIndex || hasNextConfig || hasViteConfig || hasDockerfile;
  }

  getProjectIndicators(itemPath) {
    const indicators = [];
    if (fs.existsSync(path.join(itemPath, 'package.json'))) indicators.push('package.json');
    if (fs.existsSync(path.join(itemPath, 'src'))) indicators.push('src/');
    if (fs.existsSync(path.join(itemPath, 'next.config.js'))) indicators.push('next.config.js');
    if (fs.existsSync(path.join(itemPath, 'Dockerfile'))) indicators.push('Dockerfile');
    return indicators;
  }

  processDetectionResults(hasConfigIndicators, hasMultipleApps, hasSingleAppInStructuredDir, foundDirectories, spinner) {
    if (hasConfigIndicators && (hasMultipleApps || hasSingleAppInStructuredDir)) {
      this.isMonorepo = true;
      this.collectApplications(foundDirectories);
      
      spinner.succeed(`Monorepo detected with ${this.monorepoFolders.length} applications`);
      console.log(chalk.cyan('\n🚀 Applications that will be deployed:'));
      this.monorepoFolders.forEach((folder, index) => {
        console.log(chalk.green(`  ${index + 1}. ${folder.name} → ${folder.path}/`));
      });
    } else if (foundDirectories.length > 0 && !hasConfigIndicators) {
      console.log(chalk.yellow('\n⚠ Found structured directories but no monorepo config files.'));
      console.log(chalk.yellow('This might be a monorepo without proper configuration.'));
      
      if (foundDirectories.some(d => d.count >= 1)) {
        this.isMonorepo = true;
        this.collectApplications(foundDirectories);
        spinner.succeed(`Potential monorepo detected with ${this.monorepoFolders.length} applications`);
        console.log(chalk.cyan('\n🚀 Applications that will be deployed:'));
        this.monorepoFolders.forEach((folder, index) => {
          console.log(chalk.green(`  ${index + 1}. ${folder.name} → ${folder.path}/`));
        });
      } else {
        spinner.succeed('Single application repository detected');
      }
    } else {
      spinner.succeed('Single application repository detected');
    }
  }

  collectApplications(foundDirectories) {
    this.monorepoFolders = [];
    for (const dirInfo of foundDirectories) {
      if (dirInfo.count > 0) {
        const appsInDir = dirInfo.apps.map(app => ({
          name: app,
          path: dirInfo.dir === '.' ? app : path.join(dirInfo.dir, app)
        }));
        this.monorepoFolders.push(...appsInDir);
      }
    }
  }
}

module.exports = MonorepoDetector;