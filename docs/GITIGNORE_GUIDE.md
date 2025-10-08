# .gitignore Guide

## Overview

This document explains the comprehensive `.gitignore` file structure for the Vision Inspection System project.

---

## What's Ignored

### 1. Python/Backend Files

**Virtual Environments:**
- `venv/`, `env/`, `.venv/` - Python virtual environments
- `__pycache__/` - Compiled Python bytecode

**Build Artifacts:**
- `*.pyc`, `*.pyo`, `*.pyd` - Compiled Python files
- `dist/`, `build/`, `*.egg-info/` - Distribution packages

**Testing:**
- `.pytest_cache/`, `.coverage` - Test and coverage data

### 2. Node.js/Frontend Files

**Dependencies:**
- `node_modules/` - NPM packages (can be regenerated)

**Build Output:**
- `.next/`, `out/`, `build/` - Next.js build artifacts

**Next.js:**
- `next-env.d.ts` - Auto-generated TypeScript definitions

### 3. Database Files

**SQLite:**
- `*.db`, `*.sqlite`, `*.sqlite3` - Database files
- `*.db-shm`, `*.db-wal` - SQLite temporary files

**Why:** Database files can be large and contain user data. Use backups instead.

### 4. Storage/Uploads

**Directories Ignored:**
- `backend/storage/master_images/*` - Uploaded master images
- `backend/storage/image_history/*` - Captured images
- `backend/storage/backups/*` - Backup files
- `backend/storage/exports/*` - Exported data

**Note:** `.gitkeep` files are preserved to maintain directory structure.

### 5. Logs

**All Log Files:**
- `*.log` - All log files
- `backend/logs/*.log` - Backend logs
- `npm-debug.log*` - NPM debug logs

**Why:** Log files can grow large and contain sensitive information.

### 6. IDE/Editor Files

**VSCode:**
- `.vscode/*` (except specific settings)

**JetBrains:**
- `.idea/`, `*.iml` - PyCharm, WebStorm, IntelliJ

**Others:**
- `.cursor/` - Cursor IDE
- `*.sublime-*` - Sublime Text
- `*.swp` - Vim

### 7. OS-Specific Files

**macOS:**
- `.DS_Store` - Finder metadata
- `.AppleDouble`, `.LSOverride`

**Windows:**
- `Thumbs.db` - Thumbnail cache
- `Desktop.ini` - Folder settings

**Linux:**
- `.directory`, `.Trash-*`

### 8. Security/Secrets

**Environment Files:**
- `.env`, `.env.local`, `.env.*.local`

**Keys/Certificates:**
- `*.pem`, `*.key`, `*.cert`, `*.crt`

**Tokens:**
- `token_*.txt` (except documentation examples)

**Why:** NEVER commit secrets to git!

### 9. Temporary/Cache Files

**Temporary:**
- `tmp/`, `temp/`, `*.tmp`
- `*.bak`, `*.backup`, `*.old`

**Cache:**
- `.cache/`, `cache/`

---

## What's NOT Ignored (Kept in Git)

### Keep These Files:

1. **Configuration Templates:**
   - `config.yaml` (if no secrets)
   - `.env.example`
   - `config.example.yaml`

2. **Documentation:**
   - All `*.md` files
   - `README.md`
   - `docs/` directory

3. **Source Code:**
   - All `.py`, `.ts`, `.tsx`, `.js`, `.jsx` files
   - Component files
   - Utility files

4. **Configuration:**
   - `package.json`, `tsconfig.json`
   - `requirements.txt`
   - `next.config.mjs`

5. **Tests:**
   - Test files (`*.test.ts`, `*.spec.py`)
   - Test fixtures

6. **Directory Structure:**
   - `.gitkeep` files

---

## Setting Up a New Clone

When cloning the repository, you'll need to:

### 1. Create Required Directories

```bash
# These are created automatically by .gitkeep files
# But verify they exist:
mkdir -p backend/storage/master_images
mkdir -p backend/storage/image_history
mkdir -p backend/storage/backups
mkdir -p backend/storage/exports
mkdir -p backend/logs
```

### 2. Install Dependencies

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Frontend
cd ..
npm install
```

### 3. Create Environment File

```bash
# Copy example and configure
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Initialize Database

```bash
# Backend will auto-create database on first run
cd backend
python app.py
```

---

## Git Commands

### Check What's Ignored

```bash
# See all ignored files
git status --ignored

# Check if a specific file is ignored
git check-ignore -v path/to/file
```

### Force Add an Ignored File (Rare Cases)

```bash
# If you need to add an ignored file
git add -f path/to/file
```

### Clean Ignored Files

```bash
# Remove all ignored files (be careful!)
git clean -fdX

# Dry run to see what would be deleted
git clean -ndX
```

---

## Common Issues

### Issue: Database File Appears in Git Status

**Solution:** Make sure your database is in the ignored location:
```bash
# Should be ignored:
backend/database/vision.db

# If using a different location, update .gitignore
```

### Issue: .env File Accidentally Committed

**Solution:** Remove from git history:
```bash
# Remove file from git but keep local copy
git rm --cached .env

# Add to .gitignore if not already there
echo ".env" >> .gitignore

# Commit the change
git commit -m "Remove .env from git"
```

**⚠️ IMPORTANT:** If secrets were committed, consider them compromised and rotate them!

### Issue: Large Files in Git

**Solution:** Use `.gitignore` for large generated files:
```bash
# Add to .gitignore
echo "path/to/large/file" >> .gitignore

# Remove from git but keep local
git rm --cached path/to/large/file

# Commit
git commit -m "Remove large file from git"
```

### Issue: node_modules Committed by Mistake

**Solution:**
```bash
# Should already be in .gitignore
# If accidentally committed:
git rm -r --cached node_modules
git commit -m "Remove node_modules from git"
```

---

## Best Practices

### 1. Never Commit Secrets
- Use environment variables
- Use `.env.local` for local secrets
- Keep `.env.example` as template (no real values)

### 2. Don't Commit Generated Files
- Build artifacts (`.next/`, `dist/`)
- Compiled files (`*.pyc`, `*.js.map`)
- Dependencies (`node_modules/`, `venv/`)

### 3. Don't Commit User Data
- Database files
- Uploaded images
- User-generated content
- Logs

### 4. Keep Templates
- Configuration examples
- Documentation
- Sample data (if not sensitive)

### 5. Use .gitkeep for Empty Directories
- Preserves directory structure
- Allows ignoring directory contents

---

## Lock Files

The current `.gitignore` does NOT ignore lock files:
- `package-lock.json`
- `yarn.lock`
- `pnpm-lock.yaml`

**Why:** Lock files ensure consistent dependency versions across team members.

**If you want to ignore them (not recommended):**
```bash
# Add to .gitignore
echo "package-lock.json" >> .gitignore
```

---

## Custom Additions

To add custom patterns to `.gitignore`:

```bash
# Add to the end of .gitignore
echo "# Custom ignores" >> .gitignore
echo "my-custom-file.txt" >> .gitignore
```

Or edit `.gitignore` directly and add your patterns in the appropriate section.

---

## Verifying .gitignore Works

### Test Your .gitignore

```bash
# Create a test file that should be ignored
touch backend/logs/test.log

# Check status (should not appear)
git status

# Verify it's ignored
git check-ignore -v backend/logs/test.log
# Output: .gitignore:123:*.log    backend/logs/test.log
```

---

## Summary

The comprehensive `.gitignore` file:
- ✅ Protects secrets and sensitive data
- ✅ Excludes generated/compiled files
- ✅ Ignores dependencies and build artifacts
- ✅ Keeps directory structure with `.gitkeep`
- ✅ Covers multiple IDEs and OSes
- ✅ Maintains clean git history
- ✅ Reduces repository size

**Result:** Clean, secure, and maintainable repository! 🎉

---

## Related Files

- `.gitignore` - Main ignore file
- `.gitkeep` - Directory placeholders
- `.env.example` - Environment template
- `README.md` - Project documentation

---

## Additional Resources

- [Git Documentation - gitignore](https://git-scm.com/docs/gitignore)
- [GitHub's .gitignore Templates](https://github.com/github/gitignore)
- [gitignore.io](https://www.toptal.com/developers/gitignore) - Generate custom .gitignore files

---

**Last Updated:** October 8, 2025  
**Version:** 1.1.0
