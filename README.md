<div align="center">

# 🤖 MCPbuddy

### *Your local MCP Server manager with AI orchestration*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Manage multiple MCP servers locally • Select manually or let AI orchestrate automatically**

</div>

---

## 🚀 Quick Start

```bash
git clone https://github.com/M3l3r0/MCP-buddy.git
cd MCP-buddy
npm install
npm run dev
```

**Open**: http://localhost:3000

---

## 🎯 What is it?

**MCPbuddy is a local MCP Server manager** that runs entirely on your machine. Manage all your MCP (Model Context Protocol) servers in one place:

- 🎯 **Manual mode**: Select which server to use
- 🎭 **AI Orchestration**: Let an LLM automatically decide which servers and tools to query

**Think**: Local server manager + ChatGPT interface + Optional AI orchestration

---

## ✨ Key Features

### 🏠 100% Local
Everything runs on your machine. Your data stays with you.

### 🎯 Two Modes
- **Manual**: Pick a server from your list
- **AI Orchestration**: LLM automatically selects from your enabled servers

### 🔌 MCP Server Management
- Add/edit/remove servers through UI
- Multiple auth methods: Bearer, API Key, OAuth, Basic
- Works with Snowflake, custom APIs, any MCP endpoint

### 💬 Modern Chat Interface
- ⚡ ChatGPT-style typing animation
- 💾 Persistent conversations
- 🏷️ Auto-titles from first message
- 📊 Real-time logs of all operations

### 🤖 LLM Support (Optional)
Snowflake Cortex • OpenAI • Anthropic • Ollama • Custom APIs

---

## ⚙️ Setup

### 1. Add Servers

**UI**: `⚙️ Servers` → `+ Add Server`

```
Name: My Server
URL: https://your-mcp-endpoint.com/...
Auth: Bearer Token
Token: your-token-here
```

### 2. Configure LLM (Optional)

**UI**: `🤖 LLM Config` → `+ Add LLM Config`

```
Provider: Snowflake / OpenAI / Anthropic / Ollama
Model: llama3-70b / gpt-4 / claude-3-5-sonnet
API Key: your-key
```

### 3. Choose Your Mode

**🎯 Manual Mode** (no LLM needed):
- Select a server from sidebar
- Chat directly with that server

**🎭 AI Orchestration** (LLM required):
- Enable multiple servers (toggle them ON)
- AI automatically picks from enabled servers only

---

## 🎭 How Orchestration Works

```
Your Question
    ↓
🧠 LLM analyzes enabled servers → Decides which to use
    ↓
⚡ Executes chosen tools in parallel
    ↓
🎨 LLM combines all results
    ↓
💬 Single, coherent answer
```

**Note**: Only enabled servers (toggled ON) are available to the orchestrator.

**Example**: *"Tell me about X and Y"* → AI picks relevant enabled servers → Synthesized response

---

## 📊 What You See

- 💬 **Chat messages** with smooth typing animation
- 📈 **Real-time logs** of every server call
- ⏱️ **Performance metrics** (MCP time, LLM time, total)
- 🔍 **Expandable details** in each message

---

## 🛠️ Stack

React • TypeScript • Node.js • Express • Tailwind • Vite

---

## 🐛 Troubleshooting

**Server not responding?**
- Check URL and token validity
- Verify MCP server is running

**AI not working?**
- Toggle `AI: ON` (green button)
- Check LLM API key

**No orchestration?**
- Need **LLM enabled** + **multiple servers toggled ON** (enabled)

---

## 🔐 Security

- ✅ **Runs 100% locally** on your machine
- ✅ **No external tracking** - your data stays with you
- ✅ **No hardcoded credentials** - you configure your own
- ✅ **Browser storage only** - nothing sent to our servers (we don't have any!)
- ✅ Git-ignores all secrets

**Never commit API keys or tokens!**

---

## 📚 Docs

- [Configuration Examples](docs/CONFIG_EXAMPLE.md)
- [Quick Start Guide](docs/QUICKSTART.md)
- [Security Policy](docs/SECURITY.md)
- [Changelog](CHANGELOG.md)

**External**:
[MCP Protocol](https://modelcontextprotocol.io/) • [Snowflake Cortex](https://docs.snowflake.com/en/user-guide/snowflake-cortex) • [OpenAI](https://platform.openai.com/docs)

---

## 📄 License

MIT - see [LICENSE](LICENSE)

---

<div align="center">

**Made with ❤️ by [@M3l3r0](https://github.com/M3l3r0)**

### ⭐ Star if useful!

[🐛 Report Bug](https://github.com/M3l3r0/MCP-buddy/issues) • [✨ Request Feature](https://github.com/M3l3r0/MCP-buddy/issues)

</div>
