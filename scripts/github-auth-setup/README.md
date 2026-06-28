# github_auth_setup.py — GitHub SSH / PAT Authentication Setup

Interactive wizard that fixes GitHub authentication errors — HTTPS token issues and SSH permission denials — including multi-account SSH configurations.

## Errors it fixes

```
# HTTPS error
remote: Invalid username or token. Password authentication is not supported.
fatal: Authentication failed for 'https://github.com/...'

# SSH multi-account error
ERROR: Permission to org/repo.git denied to wrong_user.
fatal: Could not read from remote repository.
```

## Options

| Option | Description |
|---|---|
| **1 — PAT** | Guide through creating a Personal Access Token and configuring a credential helper |
| **2 — SSH (single account)** | Generate an SSH key pair, add to agent, test connection, switch remote to SSH |
| **3 — SSH multi-account** | Create a dedicated key per account, write a `~/.ssh/config` alias with `IdentitiesOnly yes`, test the correct identity, update the Git remote |
| **4 — PAT + SSH** | Run options 1 then 2 in sequence |

## Usage

```bash
python github_auth_setup.py
```

The script is fully interactive — follow the prompts for your chosen option.

## Requirements

Standard library only — no external dependencies.
