# git_commit_push.py — Secure Git Commit & Push

Hardens the `git add → commit → push` workflow with pre-flight checks, sensitive file detection, and clear error diagnosis.

## What it checks

| Phase | Check |
|---|---|
| **Pre-flight** | Git installed · valid repo · `origin` configured · branch not detached |
| **Branch safety** | Warns and requires confirmation on `main`, `master`, `production`, `release` |
| **File analysis** | Lists all modified / added / deleted / untracked files before staging |
| **Conflict guard** | Blocks commit if unresolved merge conflicts are detected |
| **Secret detection** | Flags `.env`, `.pem`, `.key`, `secrets.*`, SSH private keys |
| **Commit message** | Rejects empty or too-short messages |
| **Summary** | Full recap of what will run before touching anything |
| **Confirmation** | Explicit `y/n` prompt before `add → commit → push` |
| **Push error diagnosis** | Handles: no upstream · rejected push · auth denied · network timeout |
| **Post-push** | Prints commit hash and direct GitHub link |

## Usage

```bash
python git_commit_push.py                        # current directory
python git_commit_push.py --path /path/to/repo   # explicit repo path
```

## Requirements

Standard library only — no external dependencies.
