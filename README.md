# GitHub

GitHub repository automation for ThinkIac. This Lógos package provides managed authentication, repository and branch operations, authenticated Git workflows, issues, and pull requests through runtime tools.

## Responsible installation

Before adding this package to a workspace, ask your AI assistant to review the code and the permissions required by its GitHub token and SSH key. Install it only in a workspace you trust.

## How it works

The **Settings → GitHub** screen generates an SSH public key, stores a Personal Access Token, and configures the author name and email used for commits. API calls and Git operations prefer the configured token; SSH is the fallback when no token is available.

Secrets, managed clones, and generated authentication helpers stay under `.private/`. The package writes its settings file with mode `0600` and never returns private credentials through its tools.

## Key features

- Create, edit, inspect, and explicitly delete repositories.
- List and create remote or local branches.
- Clone, fast-forward pull, commit, and push through managed repositories.
- List, create, and comment on issues and pull requests.
- Configure commit identity without exposing credentials to shell commands or chat.
- Prefer HTTPS token authentication, with managed SSH as a fallback.

## Runtime tools

| Area | Tools |
| --- | --- |
| Credentials | `github_generate_ssh_key` |
| Repositories | `github_list_repositories`, `github_create_repository`, `github_edit_repository`, `github_delete_repository` |
| Branches | `github_list_branches`, `github_create_branch`, `github_list_local_branches`, `github_create_local_branch` |
| Git | `github_clone_repository`, `github_pull`, `github_push`, `github_set_git_identity` |
| Issues | `github_list_issues`, `github_create_issue`, `github_comment_issue` |
| Pull requests | `github_list_pull_requests`, `github_create_pull_request`, `github_comment_pull_request` |

Managed `pull` and `push` operations work only with clones created by `github_clone_repository` under `.private/repos/`. Pull is fast-forward only and stops when a manual merge would be required. Push stages tracked and untracked files, creates a commit when needed, and publishes the selected or current branch.

## Security

- Keep `.private/`, `.env*`, keys, tokens, local clones, and generated credentials out of version control.
- Grant the token only the repository and organization permissions required for the intended operations.
- Repository deletion requires the exact `owner/repository` value as explicit confirmation.
- The host must provide `git` and `ssh` for managed Git operations.

## Development

```bash
node --check packages/github/index.js
node --check packages/github/lib/config.js
node --check packages/github/lib/git.js
node --check packages/github/lib/github-api.js
```
