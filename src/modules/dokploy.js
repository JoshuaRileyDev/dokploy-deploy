const axios = require('axios');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const GitUtils = require('../utils/git');

class DokployManager {
  constructor(dokployUrl, apiToken, logger, domain) {
    this.dokployUrl = dokployUrl;
    this.apiToken = apiToken;
    this.logger = logger;
    this.domain = domain;
    this.serverId = null;
    this.githubId = null;
  }

  async getDefaultServer() {
    this.logger.log('Fetching available servers', 'info');
    
    try {
      const requestUrl = `${this.dokployUrl}/api/server.withSSHKey`;
      this.logger.log(`Making request to: ${requestUrl}`, 'debug');
      
      const response = await axios.get(requestUrl, {
        headers: {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        }
      });
      
      this.logger.log(`Server response status: ${response.status}`, 'debug');
      this.logger.log(`Server response data: ${JSON.stringify(response.data, null, 2)}`, 'debug');
      
      if (response.data && response.data.length > 0) {
        const serverId = response.data[0].serverId || response.data[0].id;
        this.logger.log(`Using server ID: ${serverId}`, 'success');
        return serverId;
      }
      
      this.logger.log('No servers found in response', 'warn');
      return null;
    } catch (error) {
      this.logger.log(`Server fetch failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`Server fetch HTTP Status: ${error.response.status}`, 'error');
        this.logger.log(`Server fetch Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      console.log(chalk.yellow(`Warning: Could not fetch servers: ${error.message}`));
      return null;
    }
  }

  async getGitHubIntegration() {
    this.logger.log('Fetching available GitHub integrations', 'info');
    
    try {
      const requestUrl = `${this.dokployUrl}/api/github.githubProviders`;
      this.logger.log(`Making request to: ${requestUrl}`, 'debug');
      
      const response = await axios.get(requestUrl, {
        headers: {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        }
      });
      
      this.logger.log(`GitHub integration response status: ${response.status}`, 'debug');
      this.logger.log(`GitHub integration response data: ${JSON.stringify(response.data, null, 2)}`, 'debug');
      
      if (response.data && response.data.length > 0) {
        const githubId = response.data[0].githubId || response.data[0].id;
        this.logger.log(`Using GitHub integration ID: ${githubId}`, 'success');
        return githubId;
      }
      
      this.logger.log('No GitHub integrations found in response', 'warn');
      return null;
    } catch (error) {
      this.logger.log(`GitHub integration fetch failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`GitHub integration HTTP Status: ${error.response.status}`, 'error');
        this.logger.log(`GitHub integration Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      console.log(chalk.yellow(`Warning: Could not fetch GitHub integrations: ${error.message}`));
      return null;
    }
  }

  async createProject(folderName) {
    const spinner = ora('Creating Dokploy project...').start();
    this.logger.log('Starting Dokploy project creation', 'info');
    
    try {
      const requestUrl = `${this.dokployUrl}/api/project.create`;
      const requestData = {
        name: folderName,
        description: `Auto-generated project for ${folderName}`
      };
      const requestHeaders = {
        'x-api-key': this.apiToken,
        'Content-Type': 'application/json'
      };
      
      this.logger.log(`Making request to: ${requestUrl}`, 'debug');
      this.logger.log(`Request data: ${JSON.stringify(requestData, null, 2)}`, 'debug');
      this.logger.log(`Request headers: ${JSON.stringify({ ...requestHeaders, 'x-api-key': this.apiToken.substring(0, 10) + '...' }, null, 2)}`, 'debug');
      
      const projectResponse = await axios.post(requestUrl, requestData, { headers: requestHeaders });
      
      this.logger.log(`Response status: ${projectResponse.status}`, 'debug');
      this.logger.log(`Response data: ${JSON.stringify(projectResponse.data, null, 2)}`, 'debug');

      const projectId = projectResponse.data.projectId;
      this.logger.log(`Project created with ID: ${projectId}`, 'success');
      spinner.succeed(`Dokploy project created: ${folderName}`);

      // Get default server for applications
      spinner.text = 'Getting server information...';
      this.serverId = await this.getDefaultServer();
      if (this.serverId) {
        console.log(chalk.gray(`Using server: ${this.serverId}`));
      }

      // Get GitHub integration for repository configuration
      spinner.text = 'Getting GitHub integration...';
      this.githubId = await this.getGitHubIntegration();
      if (this.githubId) {
        console.log(chalk.gray(`Using GitHub integration: ${this.githubId}`));
      } else {
        console.log(chalk.yellow('No GitHub integration found - repository configuration will be skipped'));
        console.log(chalk.yellow('Set up GitHub integration in Dokploy dashboard for automatic repository configuration'));
      }

      return projectId;
      
    } catch (error) {
      this.logger.log(`Dokploy project creation failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`HTTP Status: ${error.response.status}`, 'error');
        this.logger.log(`Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`, 'debug');
        this.logger.log(`Response Data: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      if (error.request) {
        this.logger.log('Request made but no response received', 'error');
        this.logger.log(`Request details: ${JSON.stringify({
          method: error.config?.method,
          url: error.config?.url,
          headers: error.config?.headers ? { ...error.config.headers, 'x-api-key': '***' } : undefined
        }, null, 2)}`, 'debug');
      }
      spinner.fail(`Failed to create Dokploy project: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async createSingleApplication(projectId, folderName, remoteUrl) {
    const spinner = ora('Creating application...').start();
    
    try {
      const applicationData = {
        name: 'app',
        projectId: projectId,
        appName: folderName,
        description: 'Main application'
      };
      
      // Add serverId if available
      if (this.serverId) {
        applicationData.serverId = this.serverId;
      }
      
      this.logger.log('Creating single application with data:', 'debug');
      this.logger.log(JSON.stringify(applicationData, null, 2), 'debug');
      
      const appResponse = await axios.post(`${this.dokployUrl}/api/application.create`, applicationData, {
        headers: {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        }
      });

      const applicationId = appResponse.data.applicationId;
      this.logger.log(`Application created with ID: ${applicationId}`, 'success');
      
      // Configure GitHub repository
      if (remoteUrl && applicationId) {
        spinner.text = 'Configuring GitHub repository...';
        await this.configureGitHubRepository(applicationId, '.', remoteUrl);
      }

      // Create domain for single application: projectname.domain
      const host = `${folderName}.${this.domain}`;
      spinner.text = 'Creating domain...';
      await this.createDomain(applicationId, host, folderName);

      // Configure environment variables (look in root directory)
      spinner.text = 'Configuring environment variables...';
      const currentDir = process.cwd();
      const envFile = this.detectEnvironmentFile(currentDir);
      if (envFile) {
        const envContent = this.readEnvironmentFile(envFile.path);
        if (envContent) {
          await this.saveEnvironment(applicationId, 'app', envContent, '.');
          console.log(chalk.green(`✓ Environment variables configured from ${envFile.file}`));
        }
      } else {
        this.logger.log('No environment files found in root directory', 'debug');
      }

      // Deploy the application
      spinner.text = 'Deploying application...';
      await this.deployApplication(applicationId, 'app');

      spinner.succeed('Application "app" created, configured, and deployed successfully');
      console.log(chalk.green('✅ Deployment setup complete!'));
      console.log(chalk.cyan('Application configured with:'));
      console.log(chalk.gray(`- Repository: ${remoteUrl}`));
      console.log(chalk.gray('- Build path: . (root directory)'));
      console.log(chalk.gray('- Branch: main'));
      console.log(chalk.gray(`- Domain: https://${host}`));
      console.log(chalk.gray('- Port: 3000'));
      console.log(chalk.gray('- SSL: Let\'s Encrypt'));
      console.log(chalk.cyan(`🌐 Your application will be available at: https://${host}`));
      
    } catch (error) {
      this.logger.log(`Application creation failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      spinner.fail(`Failed to create application: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async createMonorepoApplications(projectId, monorepoFolders, remoteUrl, folderName) {
    const spinner = ora('Creating applications for monorepo...').start();
    
    try {
      const createdApps = [];
      
      for (const folder of monorepoFolders) {
        spinner.text = `Creating application: ${folder.name}...`;
        
        const applicationData = {
          name: folder.name,
          projectId: projectId,
          appName: folder.name,
          description: `Application for ${folder.name}`
        };
        
        // Add serverId if available
        if (this.serverId) {
          applicationData.serverId = this.serverId;
        }
        
        this.logger.log(`Creating monorepo application: ${folder.name}`, 'debug');
        this.logger.log(JSON.stringify(applicationData, null, 2), 'debug');
        
        const appResponse = await axios.post(`${this.dokployUrl}/api/application.create`, applicationData, {
          headers: {
            'x-api-key': this.apiToken,
            'Content-Type': 'application/json'
          }
        });
        
        const applicationId = appResponse.data.applicationId;
        this.logger.log(`Application ${folder.name} created with ID: ${applicationId}`, 'success');
        
        // Configure GitHub repository with build path for this specific folder
        if (remoteUrl && applicationId) {
          spinner.text = `Configuring repository for ${folder.name}...`;
          await this.configureGitHubRepository(applicationId, folder.path, remoteUrl);
        }

        // Create domain for monorepo application: projectname-appname.domain
        const host = `${folderName}-${folder.name}.${this.domain}`;
        spinner.text = `Creating domain for ${folder.name}...`;
        await this.createDomain(applicationId, host, folderName, folder.name);

        // Configure environment variables (look in app subfolder)
        spinner.text = `Configuring environment variables for ${folder.name}...`;
        const currentDir = process.cwd();
        const appPath = path.join(currentDir, folder.path);
        const envFile = this.detectEnvironmentFile(appPath);
        if (envFile) {
          const envContent = this.readEnvironmentFile(envFile.path);
          if (envContent) {
            await this.saveEnvironment(applicationId, folder.name, envContent, folder.path);
            console.log(chalk.green(`✓ Environment variables configured for ${folder.name} from ${envFile.file}`));
          }
        } else {
          // Fallback: check root directory for shared environment variables
          const rootEnvFile = this.detectEnvironmentFile(currentDir);
          if (rootEnvFile) {
            const envContent = this.readEnvironmentFile(rootEnvFile.path);
            if (envContent) {
              await this.saveEnvironment(applicationId, folder.name, envContent, folder.path);
              console.log(chalk.yellow(`✓ Environment variables configured for ${folder.name} from root ${rootEnvFile.file}`));
            }
          } else {
            this.logger.log(`No environment files found for ${folder.name}`, 'debug');
          }
        }

        // Deploy the application
        spinner.text = `Deploying ${folder.name}...`;
        await this.deployApplication(applicationId, folder.name);
        
        createdApps.push({ 
          name: folder.name, 
          path: folder.path, 
          applicationId: applicationId,
          host: host
        });
      }

      spinner.succeed(`Created, configured, and deployed ${createdApps.length} applications for monorepo`);
      console.log(chalk.green('✅ Deployment setup complete!'));
      console.log(chalk.cyan('Created applications:'));
      createdApps.forEach(app => {
        console.log(chalk.gray(`  - ${app.name} → ${app.path}/`));
        console.log(chalk.gray(`    🌐 https://${app.host}`));
      });
      console.log(chalk.cyan('All applications configured with:'));
      console.log(chalk.gray(`- Repository: ${remoteUrl}`));
      console.log(chalk.gray('- Branch: main'));
      console.log(chalk.gray('- Port: 3000'));
      console.log(chalk.gray('- SSL: Let\'s Encrypt'));
      console.log(chalk.gray('- Individual build paths and domains set for each application'));
      console.log(chalk.cyan('🚀 Your applications are being deployed and will be available at the URLs above!'));
      
    } catch (error) {
      this.logger.log(`Monorepo applications creation failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      spinner.fail(`Failed to create applications: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async configureGitHubRepository(applicationId, buildPath, remoteUrl) {
    this.logger.log(`Configuring GitHub repository for application ${applicationId}`, 'info');
    this.logger.log(`Build path: ${buildPath}`, 'debug');
    this.logger.log(`Repository URL: ${remoteUrl}`, 'debug');
    
    // Skip if no GitHub integration is available
    if (!this.githubId) {
      this.logger.log('No GitHub integration available, skipping GitHub repository configuration', 'debug');
      return;
    }
    
    try {
      // Extract owner and repository name from the GitHub URL
      const { owner, repository } = GitUtils.parseGitHubUrl(remoteUrl);
      this.logger.log(`Parsed - Owner: ${owner}, Repository: ${repository}`, 'debug');
      
      const githubConfig = {
        applicationId: applicationId,
        repository: repository,
        owner: owner,
        branch: 'main',
        buildPath: buildPath,
        githubId: this.githubId
      };
      
      this.logger.log(`GitHub configuration: ${JSON.stringify(githubConfig, null, 2)}`, 'debug');
      
      const response = await axios.post(`${this.dokployUrl}/api/application.saveGithubProvider`, githubConfig, {
        headers: {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        }
      });
      
      this.logger.log(`GitHub repository configured successfully`, 'success');
      this.logger.log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'debug');
      
    } catch (error) {
      this.logger.log(`GitHub configuration failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`GitHub config HTTP Status: ${error.response.status}`, 'error');
        this.logger.log(`GitHub config Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      
      // Don't fail the entire process if GitHub config fails
      if (error.response?.data?.issues?.some(issue => issue.path?.includes('githubId'))) {
        console.log(chalk.yellow(`Note: GitHub repository configuration requires GitHub App integration`));
        console.log(chalk.yellow(`Please configure manually in Dokploy dashboard:`));
        console.log(chalk.gray(`- Go to your application settings`));
        console.log(chalk.gray(`- Set up GitHub integration (requires GitHub App)`));
        console.log(chalk.gray(`- Repository: ${remoteUrl}`));
        console.log(chalk.gray(`- Build path: ${buildPath}`));
        console.log(chalk.gray(`- Branch: main`));
      } else {
        console.log(chalk.yellow(`Warning: Could not configure GitHub repository automatically`));
        console.log(chalk.yellow(`Please configure manually in Dokploy dashboard:`));
        console.log(chalk.gray(`- Repository: ${remoteUrl}`));
        console.log(chalk.gray(`- Build path: ${buildPath}`));
        console.log(chalk.gray(`- Branch: main`));
      }
    }
  }

  async createDomain(applicationId, host, projectName, applicationName = null) {
    this.logger.log(`Creating domain for application ${applicationId}`, 'info');
    this.logger.log(`Host: ${host}`, 'debug');
    
    try {
      const domainConfig = {
        host: host,
        path: "/",
        port: 3000,
        https: true,
        applicationId: applicationId,
        certificateType: "letsencrypt",
        domainType: "application"
      };
      
      this.logger.log(`Domain configuration: ${JSON.stringify(domainConfig, null, 2)}`, 'debug');
      
      const response = await axios.post(`${this.dokployUrl}/api/domain.create`, domainConfig, {
        headers: {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        }
      });
      
      this.logger.log(`Domain created successfully`, 'success');
      this.logger.log(`Domain response: ${JSON.stringify(response.data, null, 2)}`, 'debug');
      
      return response.data;
      
    } catch (error) {
      this.logger.log(`Domain creation failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`Domain HTTP Status: ${error.response.status}`, 'error');
        this.logger.log(`Domain Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      
      console.log(chalk.yellow(`Warning: Could not create domain automatically`));
      console.log(chalk.yellow(`Please create domain manually in Dokploy dashboard:`));
      console.log(chalk.gray(`- Host: ${host}`));
      console.log(chalk.gray(`- Port: 3000`));
      console.log(chalk.gray(`- HTTPS: enabled`));
      console.log(chalk.gray(`- Certificate: Let's Encrypt`));
      
      return null;
    }
  }

  async deployApplication(applicationId, applicationName) {
    this.logger.log(`Deploying application ${applicationId}`, 'info');
    
    try {
      const deployConfig = {
        applicationId: applicationId
      };
      
      this.logger.log(`Deploy configuration: ${JSON.stringify(deployConfig, null, 2)}`, 'debug');
      
      const response = await axios.post(`${this.dokployUrl}/api/application.deploy`, deployConfig, {
        headers: {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        }
      });
      
      this.logger.log(`Application deployment initiated successfully`, 'success');
      this.logger.log(`Deploy response: ${JSON.stringify(response.data, null, 2)}`, 'debug');
      
      return response.data;
      
    } catch (error) {
      this.logger.log(`Application deployment failed: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`Deploy HTTP Status: ${error.response.status}`, 'error');
        this.logger.log(`Deploy Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      
      console.log(chalk.yellow(`Warning: Could not deploy application automatically`));
      console.log(chalk.yellow(`Please deploy manually in Dokploy dashboard`));
      
      return null;
    }
  }

  detectEnvironmentFile(basePath) {
    this.logger.log(`Detecting environment files in: ${basePath}`, 'debug');
    
    // Priority order: .env, .env.local, .env.example
    const envFiles = ['.env', '.env.local', '.env.example'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(basePath, envFile);
      if (fs.existsSync(envPath)) {
        this.logger.log(`Found environment file: ${envFile}`, 'success');
        return { file: envFile, path: envPath };
      }
    }
    
    this.logger.log('No environment files found', 'debug');
    return null;
  }

  readEnvironmentFile(envFilePath) {
    this.logger.log(`Reading environment file: ${envFilePath}`, 'debug');
    
    try {
      const content = fs.readFileSync(envFilePath, 'utf8');
      this.logger.log(`Environment file content length: ${content.length} characters`, 'debug');
      
      // Filter out comments and empty lines for cleaner logs
      const lines = content.split('\n').filter(line => 
        line.trim() && !line.trim().startsWith('#')
      );
      this.logger.log(`Found ${lines.length} environment variables`, 'debug');
      
      return content;
    } catch (error) {
      this.logger.log(`Failed to read environment file: ${error.message}`, 'error');
      return null;
    }
  }

  async saveEnvironment(applicationId, applicationName, envContent, buildPath = '.') {
    this.logger.log(`Configuring environment variables for application ${applicationId}`, 'info');
    this.logger.log(`Application: ${applicationName}`, 'debug');
    this.logger.log(`Build path: ${buildPath}`, 'debug');
    
    try {
      const envConfig = {
        applicationId: applicationId,
        env: envContent,
        buildArgs: "" // Empty for now, could be extended later
      };
      
      this.logger.log(`Environment configuration prepared for ${applicationName}`, 'debug');
      
      const response = await axios.post(`${this.dokployUrl}/api/application.saveEnvironment`, envConfig, {
        headers: {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        }
      });
      
      this.logger.log(`Environment variables configured successfully for ${applicationName}`, 'success');
      this.logger.log(`Environment response: ${JSON.stringify(response.data, null, 2)}`, 'debug');
      
      return response.data;
      
    } catch (error) {
      this.logger.log(`Environment configuration failed for ${applicationName}: ${error.message}`, 'error');
      if (error.response) {
        this.logger.log(`Environment HTTP Status: ${error.response.status}`, 'error');
        this.logger.log(`Environment Response: ${JSON.stringify(error.response.data, null, 2)}`, 'debug');
      }
      
      console.log(chalk.yellow(`Warning: Could not configure environment variables for ${applicationName}`));
      console.log(chalk.yellow(`Please configure manually in Dokploy dashboard`));
      
      return null;
    }
  }
}

module.exports = DokployManager;