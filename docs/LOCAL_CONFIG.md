# 📋 Local Configuration - MCPbuddy

This document explains how to use local configurations in MCPbuddy for development without exposing your credentials.

## 🎯 How Does It Work?

The application loads configurations in this order:

1. **First**: Tries to load `public/config.local.json` (local file, not uploaded to GitHub)
2. **Second**: If it doesn't exist, loads from browser's `localStorage`
3. **Third**: If it doesn't exist either, starts without configuration

## 🔐 For Developers (Local Configuration)

### Step 1: Create your local file

Copy the example file:

```bash
cp config.local.json.example public/config.local.json
```

### Step 2: Edit with your credentials

Edit `public/config.local.json` with your real data:

```json
{
  "servers": [
    {
      "id": "my-mcp-server",
      "name": "My MCP Server",
      "url": "https://your-server.com/api/mcp",
      "auth": {
        "method": "bearer",
        "bearerToken": "your-real-token-here"
      },
      "enabled": true
    }
  ],
  "llmConfigs": [
    {
      "id": "my-llm",
      "name": "My LLM",
      "provider": "snowflake",
      "enabled": true,
      "config": {
        "model": "claude-3-5-sonnet",
        "apiKey": "your-real-api-key",
        "temperature": 0.7,
        "maxTokens": 2000
      }
    }
  ]
}
```

### Step 3: Start the application

```bash
npm run dev
```

The application will automatically load your configurations from `public/config.local.json`.

**✅ Advantages:**
- No need to reconfigure every time you restart the app
- Your credentials are in a local file
- The file is NOT uploaded to GitHub (it's in `.gitignore`)
- You can make commits without worrying about your data

## 👥 For End Users (New Users)

If you're a new user who cloned the repository:

1. **You DON'T need** to create `config.local.json`
2. Simply run `npm run dev`
3. Configure your servers and LLMs through the UI:
   - Click on "⚙️ Servers" → Add your server
   - Click on "🤖 LLM Config" → Configure your LLM
4. Everything will be automatically saved in your browser's `localStorage`

## 🔄 Configuration Priority

```
┌─────────────────────────────────┐
│  1. public/config.local.json    │  ← Highest priority
│     (Developers only)            │
├─────────────────────────────────┤
│  2. localStorage                 │  ← Saved configuration
│     (All users)                  │
├─────────────────────────────────┤
│  3. No configuration             │  ← First time
│     (Configure from UI)          │
└─────────────────────────────────┘
```

## 📝 File Structure

### MCP Servers

```json
{
  "servers": [
    {
      "id": "unique-id",           // Unique server ID
      "name": "Display Name",      // Visible name
      "url": "https://...",        // MCP endpoint URL
      "auth": {
        "method": "bearer",        // Methods: bearer, oauth, api-key, basic, custom
        "bearerToken": "..."       // Token for bearer auth
      },
      "enabled": true              // If it's active
    }
  ]
}
```

### LLM Configuration

```json
{
  "llmConfigs": [
    {
      "id": "unique-id",
      "name": "Display Name",
      "provider": "snowflake",     // Options: snowflake, openai, anthropic, other, custom
      "enabled": true,
      "config": {
        "model": "claude-3-5-sonnet",
        "apiKey": "...",
        "endpoint": "https://...",  // Optional, auto-detected for some providers
        "temperature": 0.7,
        "maxTokens": 2000
      }
    }
  ]
}
```

## 🛡️ Security

### ✅ Best Practices

- ✅ `public/config.local.json` is in `.gitignore`
- ✅ Never commit this file
- ✅ Don't share this file with anyone
- ✅ Use tokens with expiration dates

### ⚠️ Warnings

- ⚠️ The file is accessible at `http://localhost:3000/config.local.json` during development
- ⚠️ Don't use this method in production (only for local development)
- ⚠️ Always check it's not staged: `git status`

## 🔍 Verify It's Not Uploaded to GitHub

```bash
# Check if the file is in Git
git status

# Should appear in "Untracked files" or not appear at all
# If it appears in "Changes to be committed", something is wrong

# Verify .gitignore
grep "config.local.json" .gitignore
# Should show lines that include config.local.json
```

## 🐛 Troubleshooting

### File not loading

**Problem**: The app doesn't load `config.local.json`

**Solutions**:
1. Verify the file is in `public/config.local.json` (not in root)
2. Verify the JSON is valid (use a JSON validator)
3. Check the browser console for logs
4. Clear localStorage: `localStorage.clear()` in console

### File appears in Git

**Problem**: `git status` shows `config.local.json`

**Solution**:
```bash
# Verify it's in .gitignore
cat .gitignore | grep config.local.json

# If it's not there, add it manually
echo "public/config.local.json" >> .gitignore

# Remove from staging
git rm --cached public/config.local.json
```

## 📚 More Information

- See complete examples: [CONFIG_EXAMPLE.md](CONFIG_EXAMPLE.md)
- Security: [SECURITY.md](SECURITY.md)
- GitHub guide: [GITHUB_CHECKLIST.md](GITHUB_CHECKLIST.md)
- 📖 [Back to README](../README.md)
