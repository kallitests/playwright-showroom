# git_commit_push_ai.py — AI-Powered Secure Git Commit & Push

AI variant of `git_commit_push.py`: instead of typing the commit message manually, a Claude or Ollama model reads the staged diff and proposes a [Conventional Commits](https://www.conventionalcommits.org) message. You can accept, edit, or regenerate it before the push runs.

## What it does

Same hardened pre-flight checks as `git_commit_push.py`, plus:

| Step | Description |
|---|---|
| **Diff analysis** | Reads the staged diff with `git diff --cached` |
| **AI message generation** | Sends the diff to Claude (Anthropic) or Ollama (local) via LangChain |
| **Interactive review** | Accept / edit / regenerate the proposed message |
| **Fallback** | If no AI provider is available, falls back to manual input — never blocks |

## AI providers

| Provider | When to use | Setup |
|---|---|---|
| **Ollama** (default) | Local testing — free, no token cost | `ollama pull llama3.2 && ollama serve` |
| **Anthropic / Claude** | Production — higher quality | `export ANTHROPIC_API_KEY="sk-ant-..."` |

## Usage

```bash
python git_commit_push_ai.py                            # Ollama by default
python git_commit_push_ai.py --llm-provider anthropic   # Claude (production)
python git_commit_push_ai.py --no-ai                    # force manual message
python git_commit_push_ai.py --path /path/to/repo       # explicit repo path
```

## Requirements

```bash
# For Ollama (local)
pip install langchain-ollama langchain-core

# For Anthropic / Claude
pip install langchain-anthropic langchain-core
```
