# 🔒 Security Policy

## Reporting Security Issues

If you discover a security vulnerability, please email us at [tu-email@ejemplo.com] instead of using the issue tracker.

## Security Best Practices

### 🔐 Credentials Management

**DO:**
- ✅ Store all credentials in browser localStorage
- ✅ Use HTTPS endpoints only in production
- ✅ Rotate your API keys and tokens regularly
- ✅ Use environment variables for server-side configs
- ✅ Review what data is being logged

**DON'T:**
- ❌ Never commit `.env` files
- ❌ Never commit files with credentials, API keys, or tokens
- ❌ Never share your localStorage data publicly
- ❌ Never post your actual credentials in issues or PRs
- ❌ Never use production credentials in development

### 🛡️ Data Privacy

This application:
- Stores configuration locally in your browser's localStorage
- Does not send data to any third-party analytics
- Acts as a proxy to avoid exposing credentials to the browser
- Does not persist conversations on the server (only in-memory)
- Does not track users

### 🔍 Before Committing

Run this checklist:

```bash
# Check for hardcoded secrets
git diff | grep -i "token\|key\|password\|secret\|bearer"

# Check for specific patterns
git diff | grep -E "[A-Za-z0-9]{20,}"

# Review files to be committed
git status
```

### 🚨 If You Accidentally Commit Secrets

1. **Immediately rotate** the exposed credentials
2. Remove the secret from Git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (⚠️ coordinate with team first):
   ```bash
   git push origin --force --all
   ```
4. Notify your security team if applicable

### 📋 Security Checklist for Contributors

- [ ] No hardcoded credentials in code
- [ ] No API keys or tokens in commits
- [ ] No sensitive URLs or endpoints
- [ ] `.gitignore` is up to date
- [ ] Environment variables used where appropriate
- [ ] Secrets are documented in example files only
- [ ] HTTPS used for all production endpoints
- [ ] Dependencies are up to date
- [ ] No sensitive data in error messages or logs

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Known Limitations

- Credentials stored in localStorage can be accessed via browser DevTools
- The application runs on localhost by default (not exposed to network)
- CORS is handled server-side to prevent credential exposure

## Security Updates

We take security seriously. When security issues are discovered:
1. A patch will be released as soon as possible
2. Users will be notified via GitHub releases
3. The CHANGELOG will document the security fix

## License

This security policy is part of the MCPbuddy project and is licensed under MIT.

