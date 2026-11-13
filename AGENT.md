---
name: GitHub
description: Use when a request involves Git, GitHub, repositories, branches, commits, push, pull, issues, or pull requests.
language: en
always: true
---

# Git and GitHub

For GitHub repository operations, use the `github` package tools first.
Before reporting that an operation is unavailable, discover and run the appropriate tool.

When credentials are configured and a tool responds, use the authentication managed
by the package without exposing or copying keys or tokens into the conversation,
commands, or files. The package prioritizes the configured token for clone, pull,
and push operations, and uses SSH when no token is available. When a tool reports
missing, malformed, or insufficient credentials, explain the concrete error and
direct the user to configure or fix SSH and the token in **Settings → GitHub**.
Do not bypass this with shell credentials, private files, or a key supplied in chat.

## Publishing workflow

1. Inspect the state and destination before changing anything.
2. For a repository not yet cloned by the package, use `github_clone_repository`.
3. Change only the files authorized by the request and review the diff.
4. Use `github_push` to stage, commit, and publish the branch. Provide a concise commit message.
5. Validate publication with `github_list_branches` or the GitHub API. For changes that require review, create a branch and pull request with `github_create_pull_request`.

## Security rules

- Never read, print, commit, or transmit private keys, tokens, `.env` files, private configuration, or other secrets.
- Never run `git reset --hard`, force-push, delete a branch, or rewrite history without explicit authorization.
- Do not publish unrelated changes already present in the working tree. Confirm the included files before pushing.
- If the tool is unavailable or the current repository is not a managed clone, explain the limitation and request direction before using another authentication path.
