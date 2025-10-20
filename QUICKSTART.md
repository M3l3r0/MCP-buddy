# 🚀 Quick Start Guide

## For You (Developer with local configuration)

### Start the application

```bash
npm run dev
```

✅ **The app will automatically load your configuration from** `public/config.local.json`  
✅ **No need to reconfigure every time**  
✅ **Your credentials are safe and NOT uploaded to GitHub**

### Stop the application

```bash
# If running in foreground
Ctrl + C

# If running in background
pkill -f "node.*server/index.js"
pkill -f vite
```

## For Other Users (From GitHub)

### 1. Clone and setup

```bash
# Clone the repository
git clone https://github.com/M3l3r0/MCP-buddy.git
cd MCP-buddy

# Install dependencies
npm install
```

### 2. Start

```bash
npm run dev
```

### 3. Configure (First time)

1. Open http://localhost:3000
2. Click on "⚙️ Servers" → Add your MCP server
3. Click on "🤖 LLM Config" → Configure your LLM
4. Done! Everything is automatically saved in localStorage

## Important Files

| File | Description | Uploaded to GitHub |
|------|-------------|-------------------|
| `public/config.local.json` | **YOUR configuration with real data** | ❌ NO |
| `config.local.json.example` | Template example | ✅ YES |
| `LOCAL_CONFIG.md` | System documentation | ✅ YES |
| `CONFIG_EXAMPLE.md` | Configuration examples | ✅ YES |

## Security Check

Before pushing to GitHub:

```bash
# Verify your data is NOT staged
git status | grep config.local.json

# Should only show: config.local.json.example
# Should NOT show: public/config.local.json
```

## Update Your Local Configuration

If you change your credentials, simply edit:

```bash
nano public/config.local.json
# or
code public/config.local.json
```

And restart the application.

## More Information

- 📋 [LOCAL_CONFIG.md](LOCAL_CONFIG.md) - Complete local configuration guide
- 📄 [CONFIG_EXAMPLE.md](CONFIG_EXAMPLE.md) - Examples of all configurations
- 🔒 [SECURITY.md](SECURITY.md) - Security policies
- ✅ [GITHUB_CHECKLIST.md](GITHUB_CHECKLIST.md) - Checklist before uploading to GitHub
