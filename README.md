# 🚀 Dokploy Deploy CLI

A powerful Node.js CLI tool that automates the complete deployment setup for [Dokploy](https://dokploy.com). Deploy your applications from local development to live, production-ready environments with custom domains, SSL certificates, and environment variables in just one command.

[![npm version](https://badge.fury.io/js/@joshuarileydev%2Fdokploy-deploy.svg)](https://badge.fury.io/js/@joshuarileydev%2Fdokploy-deploy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔄 **Automatic Repository Management** - Creates GitHub repositories if needed
- 🏗️ **Intelligent Project Detection** - Supports both single applications and monorepos
- 🌐 **Custom Domain Setup** - Automatic domain creation with Let's Encrypt SSL
- 🔧 **Environment Variable Configuration** - Detects and configures `.env`, `.env.local`, and `.env.example` files
- 🚀 **One-Command Deployment** - Complete setup and deployment in a single command
- 📦 **Monorepo Support** - Detects and deploys multiple applications from monorepo structures
- 🔒 **Secure by Default** - HTTPS enabled with automatic SSL certificate management
- 📝 **Comprehensive Logging** - Detailed verbose mode for debugging

## 🛠️ Installation

### Global Installation (Recommended)

```bash
npm install -g @joshuarileydev/dokploy-deploy
```

### Local Installation

```bash
npm install --save-dev @joshuarileydev/dokploy-deploy
```

### Using npx (No Installation Required)

```bash
npx @joshuarileydev/dokploy-deploy
```

## 📋 Prerequisites

1. **Dokploy Instance** - A running Dokploy server with API access
2. **GitHub CLI** - Install from [cli.github.com](https://cli.github.com/)
3. **Git Repository** - Initialize your project with git (or let the CLI do it)
4. **Environment Variables** - Set up your Dokploy credentials

## ⚙️ Configuration

### Required Environment Variables

Create a `.env` file in your project root or set these environment variables:

```bash
# Your Dokploy instance URL
DOKPLOY_URL=https://your-dokploy-instance.com

# Your Dokploy API key (get this from your Dokploy dashboard)
DOKPLOY_API_KEY=your-dokploy-api-token

# Your wildcard domain for applications (required)
DOKPLOY_DOMAIN=your-custom-domain.com
```

### GitHub CLI Setup

Authenticate with GitHub CLI:

```bash
gh auth login
```

## 🚀 Usage

### Basic Usage

Navigate to your project directory and run:

```bash
dokploy-deploy
```

### Verbose Mode (Recommended for debugging)

```bash
dokploy-deploy --verbose
```

### Help

```bash
dokploy-deploy --help
```

## 📁 Project Structure Support

### Single Application

For a standard single application:

```
my-app/
├── package.json
├── .env                    # Environment variables (optional)
├── .env.local             # Local environment variables (optional)
├── .env.example           # Example environment variables (optional)
├── src/
└── ...
```

**Result:** Application deployed at `https://my-app.your-domain.com` (customize with `DOKPLOY_DOMAIN`)

### Monorepo Structure

For monorepo projects, the CLI automatically detects applications in common directories:

```
my-monorepo/
├── package.json
├── .env                   # Shared environment variables (optional)
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── .env           # API-specific environment variables
│   │   └── src/
│   └── web/
│       ├── package.json
│       ├── .env.local     # Web-specific environment variables
│       └── src/
├── packages/              # Also supported
└── libs/                  # Also supported
```

**Result:**
- API: `https://my-monorepo-api.your-domain.com`
- Web: `https://my-monorepo-web.your-domain.com`

### Supported Monorepo Directories

The CLI automatically detects applications in these directories:
- `packages/`
- `apps/`
- `projects/`
- `modules/`
- `libs/`
- `services/`
- `components/`
- `workspaces/`
- `sites/`

## 🌍 Environment Variables

### Detection Priority

The CLI looks for environment files in this order:

1. **`.env`** - Main environment file
2. **`.env.local`** - Local environment overrides
3. **`.env.example`** - Example/template file

### Monorepo Environment Detection

For monorepos, the CLI:

1. **First** - Looks for environment files in each app's directory (`apps/api/.env`)
2. **Fallback** - Uses root directory environment files for shared variables

### Example Environment Files

**.env**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
API_KEY=your-api-key-here
NODE_ENV=production
PORT=3000
JWT_SECRET=your-jwt-secret-here
```

**apps/web/.env.local**
```bash
REACT_APP_API_URL=https://my-app-api.your-domain.com
REACT_APP_TITLE=My Amazing App
REACT_APP_VERSION=1.0.0
```

## 🏗️ What the CLI Does

### Complete Automated Setup

1. **🔍 Repository Detection** - Checks for existing Git repository
2. **📦 GitHub Repository Creation** - Creates repository if none exists
3. **🔎 Project Analysis** - Detects single app vs monorepo structure
4. **🏗️ Dokploy Project Creation** - Sets up project in Dokploy
5. **⚙️ Server Configuration** - Configures server and GitHub integration
6. **🚀 Application Creation** - Creates applications for each detected app
7. **🔗 Repository Configuration** - Links GitHub repository with build paths
8. **🌐 Domain Setup** - Creates custom domains with SSL certificates
9. **🔧 Environment Configuration** - Uploads environment variables
10. **🚀 Deployment** - Initiates application deployments

### Domain Configuration

- **Port:** 3000
- **SSL:** Let's Encrypt (automatic)
- **Protocol:** HTTPS (enforced)
- **Path:** `/` (root)
- **Custom Domain:** Set `DOKPLOY_DOMAIN=your-domain.com` to use your own wildcard domain
- **Required:** You must configure `DOKPLOY_DOMAIN` environment variable for your deployments

## 🎯 Examples

### Deploy a Next.js App

```bash
# In your Next.js project directory
npm install -g @joshuarileydev/dokploy-deploy
dokploy-deploy
```

### Deploy a Monorepo with API and Frontend

```bash
# Project structure:
# my-project/
# ├── apps/
# │   ├── api/     (Node.js/Express API)
# │   └── web/     (React/Next.js frontend)

dokploy-deploy --verbose
```

### Deploy with Custom Environment Variables

```bash
# Create .env file
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/db" > .env
echo "API_KEY=your-secret-key" >> .env

# Deploy
dokploy-deploy
```

### Deploy with Custom Domain

```bash
# Set custom domain
export DOKPLOY_DOMAIN=myapps.example.com

# Deploy (apps will be available at myapp.myapps.example.com)
dokploy-deploy
```

## 📊 Example Output

### Single Application

```
🚀 Dokploy Deploy CLI
Working in: /path/to/my-app
Project name: my-app

✓ Using Dokploy instance: https://dokploy.example.com
✔ GitHub repository created: https://github.com/user/my-app
✔ Single application repository detected
✔ Dokploy project created: my-app
✔ Application "app" created, configured, and deployed successfully

✅ Deployment setup complete!
Application configured with:
- Repository: https://github.com/user/my-app
- Build path: . (root directory)
- Branch: main
- Domain: https://my-app.your-domain.com
- Port: 3000
- SSL: Let's Encrypt

🌐 Your application will be available at: https://my-app.your-domain.com
```

### Monorepo

```
🚀 Dokploy Deploy CLI
Working in: /path/to/my-monorepo
Project name: my-monorepo

🔍 Detailed monorepo detection:
📁 Checking directory structures:
  Checking: apps/
    ✓ Found 2 potential applications:
      - api/ (package.json)
      - web/ (package.json)

🚀 Applications that will be deployed:
  1. api → apps/api/
  2. web → apps/web/

✓ Environment variables configured for api from .env
✓ Environment variables configured for web from .env.local

✅ Deployment setup complete!
Created applications:
  - api → apps/api/
    🌐 https://my-monorepo-api.your-domain.com
  - web → apps/web/
    🌐 https://my-monorepo-web.your-domain.com

🚀 Your applications are being deployed and will be available at the URLs above!
```

## 🔧 Troubleshooting

### Common Issues

**❌ "DOKPLOY_URL environment variable is required"**
```bash
# Solution: Set your Dokploy instance URL
export DOKPLOY_URL=https://your-dokploy-instance.com
```

**❌ "GitHub CLI not authenticated"**
```bash
# Solution: Authenticate with GitHub
gh auth login
```

**❌ "No GitHub integration found"**
```bash
# Solution: Set up GitHub App integration in your Dokploy dashboard
# The CLI will provide instructions for manual configuration
```

**❌ "Not a git repository"**
```bash
# Solution: Initialize git repository
git init
# Or let the CLI do it automatically
```

### Debug Mode

Use verbose mode for detailed logging:

```bash
dokploy-deploy --verbose
```

This shows:
- API requests and responses
- File detection results
- Environment variable parsing
- Detailed error messages

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development

```bash
# Clone the repository
git clone https://github.com/JoshuaRileyDev/dokploy-deploy.git
cd dokploy-deploy

# Install dependencies
npm install

# Test locally
npm link
dokploy-deploy --help
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Dokploy](https://dokploy.com) - The amazing deployment platform
- [GitHub CLI](https://cli.github.com/) - For seamless GitHub integration
- [Commander.js](https://github.com/tj/commander.js/) - For CLI argument parsing
- [Axios](https://axios-http.com/) - For HTTP requests
- [Chalk](https://github.com/chalk/chalk) - For beautiful terminal colors
- [Ora](https://github.com/sindresorhus/ora) - For elegant terminal spinners

## 📞 Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/JoshuaRileyDev/dokploy-deploy/issues)
- 💡 **Feature Requests:** [GitHub Issues](https://github.com/JoshuaRileyDev/dokploy-deploy/issues)
- 📧 **Email:** joshua@joshuariley.dev

---

**Made with ❤️ by [Joshua Riley](https://joshuariley.dev)**