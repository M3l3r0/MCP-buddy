# ✅ GitHub Upload Checklist

Use this checklist before your first push to GitHub to ensure you don't upload sensitive data.

## 🔒 Security

- [x] Tokens and API keys removed from code
- [x] Specific URLs replaced with generic placeholders
- [x] `.gitignore` updated with security patterns
- [x] `.env.example` file created (without real data)
- [x] `CONFIG_EXAMPLE.md` created with examples without credentials
- [x] `SECURITY.md` documented
- [ ] **TODO: Run verification script**: `./scripts/check-secrets.sh`
- [ ] **TODO: Manually review all staged files**

## 📝 Documentation

- [x] `README.md` updated with clear instructions
- [x] Security section added to README
- [x] Configuration examples documented
- [x] Utility scripts documented
- [ ] **TODO: Customize author information in `package.json`**
- [ ] **TODO: Update repository URLs in `package.json` and `README.md`**

## 🛠️ Repository Setup

Before the first push:

### 1. Verify Git

```bash
# Check status
git status

# See what will be committed
git diff --cached
```

### 2. Run Security Check

```bash
# Run verification script
./scripts/check-secrets.sh

# If everything is OK, continue
```

### 3. Manually Search for Sensitive Data

```bash
# Search for JWT tokens
git grep -i "eyJ"

# Search for sensitive keywords
git grep -iE "password|secret|token|api[_-]?key" -- '*.js' '*.ts' '*.tsx' '*.json'

# Search for specific URLs
git grep -E "https?://[^/]+\.snowflakecomputing\.com" | grep -v "your-account"
```

### 4. Customize the Project

Edit these files with your information:

- [x] `package.json` - Changed to M3l3r0
- [x] `package.json` - Updated with Ignacio Melero info
- [x] `README.md` - Changed to M3l3r0
- [x] `README.md` - Updated the Author section
- [ ] `SECURITY.md` - Change `your-email@example.com` to your real email

### 5. Create the Repository on GitHub

1. Go to https://github.com/new
2. Name: `MCP-buddy`
3. Description: "MCPbuddy - Your intelligent companion for MCP servers powered by AI"
4. Choose: Public or Private
5. **DO NOT initialize with README, .gitignore, or license** (you already have them locally)

### 6. Connect and Upload

```bash
# Add remote (use your URL)
git remote add origin https://github.com/M3l3r0/MCP-buddy.git

# See what will be uploaded
git log --oneline

# First upload
git branch -M main
git push -u origin main
```

## 🔍 Post-Push Verification

After pushing, verify on GitHub:

1. [ ] No `.env` files are visible
2. [ ] No tokens or API keys visible in code
3. [ ] Example files (`CONFIG_EXAMPLE.md`) don't have real data
4. [ ] README displays correctly
5. [ ] Project URLs are correct

## 🚨 If You Accidentally Uploaded Sensitive Data

### Option 1: Recent Push (< 1 minute)

```bash
# Revert last commit locally
git reset --soft HEAD~1

# Clean sensitive data
# ... edit files ...

# Commit again
git add .
git commit -m "fix: remove sensitive data"

# Force push (only if nobody else has pulled)
git push --force origin main
```

### Option 2: Old Commit

1. **IMMEDIATELY ROTATE** all exposed credentials
2. Clean history with `git filter-branch` or BFG Repo-Cleaner
3. Force push after cleaning

## ✨ Optional Extras

### Configure GitHub Actions

Workflows are already in `.github/workflows/`:
- `security-check.yml` - Automatic security verification on PRs

### Enable Branch Protection

In GitHub > Settings > Branches:
- Require PR review before merge
- Require status checks to pass
- Don't allow force push to main

### Add Build Badge

```markdown
![Security Check](https://github.com/M3l3r0/MCP-buddy/workflows/Security%20Check/badge.svg)
```

## 📚 Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Git Filter-Branch](https://git-scm.com/docs/git-filter-branch)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

## ✅ Final Checklist

Before making your repository public:

- [ ] I've run `./scripts/check-secrets.sh` without errors
- [ ] I've manually reviewed all files
- [ ] There are no credentials in the code
- [ ] I've customized package.json and README
- [ ] I've rotated any credentials that were in previous commits
- [ ] I've documented how to configure the app without exposing data
- [ ] I'm ready to push

```bash
# Last check
./scripts/check-secrets.sh && git push origin main
```

🎉 Ready for GitHub!
