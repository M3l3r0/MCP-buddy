# 🛠️ Utility Scripts

This directory contains useful scripts for project development and maintenance.

## 🔒 check-secrets.sh

Security script that verifies you're not committing sensitive data.

### Usage

```bash
# Run before committing
./scripts/check-secrets.sh
```

### What It Checks

- ✅ API keys and tokens
- ✅ JWT tokens
- ✅ Long base64 strings (possible tokens)
- ✅ Hardcoded specific URLs
- ✅ .env files in staging

### Usage Example

```bash
# Add files to stage
git add .

# Verify security
./scripts/check-secrets.sh

# If it passes, commit
git commit -m "feat: new feature"
```

### Configure as Pre-commit Hook (Optional)

To run automatically before each commit:

```bash
# Copy the script to hooks directory
cp scripts/check-secrets.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 📝 Notes

- These scripts are helper tools, they don't replace good security practices
- Always manually review your changes before committing
- If the script detects a false positive, review and correct manually
