<div align="center">

# 🤖 MCPbuddy

### *AI orchestrator for multiple MCP servers*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Chat interface with AI that automatically decides which MCP servers and tools to use**

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

MCPbuddy connects to multiple **MCP (Model Context Protocol) servers**. When you ask a question, an **LLM intelligently decides** which servers and tools to query, then synthesizes all responses into one answer.

**Think**: ChatGPT interface + your MCP servers + AI orchestration

---

## ✨ Key Features

### 🎭 AI Orchestration
Ask anything → LLM picks the right servers/tools → Executes in parallel → One coherent answer

### 💬 Modern Chat
- ⚡ ChatGPT-style typing animation
- 💾 Persistent conversation history
- 🏷️ Auto-titles from first message

### 🔌 Multi-Server
- Connect multiple MCP servers
- Works with Snowflake, custom APIs, any MCP-compatible endpoint
- Multiple auth methods: Bearer, API Key, OAuth, Basic

### 🤖 LLM Support
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

### 3. Chat!

**Without LLM**: Select one server, get raw responses  
**With LLM**: 
- One server = AI-enhanced responses
- Multiple servers = 🎭 **Orchestration mode** (AI picks servers automatically)

---

## 🎭 How Orchestration Works

```
Your Question
    ↓
🧠 LLM analyzes → Decides which servers/tools
    ↓
⚡ Executes in parallel
    ↓
🎨 LLM combines results
    ↓
💬 Single answer
```

**Example**: *"Tell me about X and Y"* → AI queries relevant servers → Synthesized response

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
- Need **LLM enabled** + **multiple servers enabled**

---

## 🔐 Security

- ✅ No hardcoded credentials
- ✅ Local storage only
- ✅ Git-ignores secrets (`*.env`, `*credentials*`, `*-local.json`)

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
