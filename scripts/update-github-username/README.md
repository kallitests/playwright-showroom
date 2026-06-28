# update_github_username.py — Bulk GitHub Remote Username Updater

Replaces an old GitHub username with a new one in the `origin` remote URL of every Git repository found in a parent folder. Supports both HTTPS and SSH remotes, including multi-account SSH aliases.

## Use cases

- Renamed your GitHub account and need to update all local repos at once
- Migrating repos from a personal account to an organisation account
- Switching from a personal SSH key to a dedicated per-account key alias

## Usage

```bash
# Explicit parent folder
python update_github_username.py /path/to/parent old_username new_username

# Current directory as parent
python update_github_username.py old_username new_username

# With SSH host alias (multi-account setup)
python update_github_username.py old_username new_username --host github-myalias
```

## What it does

1. Scans all direct subfolders of the parent directory for `.git` folders
2. Reads each repo's `origin` remote URL
3. Replaces `old_username` with `new_username` in the URL
4. For SSH remotes: optionally replaces `github.com` with a custom SSH alias (`--host`)
5. Runs a final verification pass and reports any repos still using the old username

## Example output

```
3 repo(s) found in '/Users/me/kallitests'.

[OK] SmokeSentinel     : git@github.com:old/SmokeSentinel.git  →  git@github-alias:new/SmokeSentinel.git
[OK] playwright-showroom : https://github.com/old/playwright-showroom.git  →  https://github.com/new/playwright-showroom.git
[IGNORED] other-repo   : username 'old' not found in URL

--- Final verification ---
[OK] SmokeSentinel      : git@github-alias:new/SmokeSentinel.git
[OK] playwright-showroom : https://github.com/new/playwright-showroom.git

All repositories are up to date with the new username.
```

## Requirements

Standard library only — no external dependencies.
