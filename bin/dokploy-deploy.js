#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Command } = require('commander');
const chalk = require('chalk');

const DokployDeployer = require('../src/dokploy-deployer');

const program = new Command();

program
  .name('dokploy-deploy')
  .description('CLI tool for automated Dokploy deployment setup')
  .version('1.0.0')
  .option('-v, --verbose', 'enable verbose logging')
  .action(async (options) => {
    try {
      const deployer = new DokployDeployer({ verbose: options.verbose });
      await deployer.init();
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
      process.exit(1);
    }
  });

program.parse();