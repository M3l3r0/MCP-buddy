# 🤝 Contributing Guide

Thank you for your interest in contributing to MCPbuddy! 🎉

## 📋 Code of Conduct

This project and all its participants are governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior.

## 🚀 How to Contribute?

### 🐛 Report Bugs

If you find a bug, please create an issue with:

- **Descriptive title**
- **Steps to reproduce** the problem
- **Expected behavior** vs **actual behavior**
- **Screenshots** (if applicable)
- **System information** (OS, Node.js version, browser)

### 💡 Suggest Features

To suggest new features:

- Verify that a similar issue doesn't already exist
- Clearly describe the proposed functionality
- Explain why it would be useful for the project
- If possible, include mockups or examples

### 🔧 Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. **Make your changes** following the style guides
4. **Ensure** the code works:
   ```bash
   npm run dev
   ```
5. **Commit** your changes:
   ```bash
   git commit -m "feat: add new feature X"
   ```
6. **Push** to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```
7. **Open a Pull Request** to `main`

## 📝 Style Guides

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Format changes (don't affect code)
- `refactor:` - Code refactoring
- `test:` - Add or modify tests
- `chore:` - Build, configuration changes, etc.

Examples:
```
feat: add support for Ollama
fix: fix SSE response parsing
docs: update README with new instructions
```

### TypeScript/JavaScript Code

- Use **TypeScript** when possible
- Follow **ESLint** conventions
- Document complex functions with JSDoc
- Descriptive variable and function names
- Keep functions small and focused

### React Components

- One component per file
- Use **functional components** with hooks
- Type props with TypeScript
- Extract complex logic to custom hooks

## 🧪 Testing

Before submitting a PR, make sure:

- [ ] Code compiles without errors
- [ ] Application works correctly
- [ ] No regressions introduced
- [ ] Code follows style guides

## 📞 Questions?

If you have questions, you can:

- Open a [GitHub Issue](https://github.com/M3l3r0/MCP-buddy/issues)
- Join our [Discord](#) (if applicable)
- Send an email to [your-email@example.com]

## 🎉 Thank You!

Every contribution, no matter how small, is valuable. Thank you for helping improve MCPbuddy! 🙏
