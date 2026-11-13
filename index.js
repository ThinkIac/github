import { readConfig, saveConfig } from './lib/config.js'
import { githubRequest, repositoryPath } from './lib/github-api.js'
import { cloneRepository, createBranch as createLocalBranch, localBranches, pullRepository, pushRepository, publicSshKey, setGitIdentity } from './lib/git.js'

const GITHUB_CREDENTIALS_SURFACE = Object.freeze({
  version: 1, kind: 'github-credentials', eyebrow: 'Integration credentials', title: 'GitHub',
  description: 'Configure the SSH key, API token, and identity used for commits.',
  extra: { kind: 'github-credentials', actions: { save: 'github.credentials.save' } },
  actions: { 'github.credentials.save': { intent: 'write' } },
})

function encoded(value) { return encodeURIComponent(String(value || '')) }

/** @register_router settings @method GET */
export async function getSettings() {
  const config = await readConfig()
  return { configured: Boolean(config.token), tokenConfigured: Boolean(config.token), name: config.name, email: config.email, publicKey: await publicSshKey() }
}

/** @register_router settings @method PUT */
export async function updateSettings(req) {
  const body = req?.body || {}
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  if (name.length > 200 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { status: 400, error: 'Provide a valid name and email.' }
  const current = await readConfig()
  const config = await saveConfig({ name, email, token: body.clearToken ? '' : (body.token || current.token) })
  return { configured: Boolean(config.token), tokenConfigured: Boolean(config.token), name: config.name, email: config.email, publicKey: await publicSshKey() }
}

/** @register_router system/view @method GET */
export async function systemView(req) {
  if (req?.query?.tab && req.query.tab !== 'github-credentials') return { status: 404, mensagem: 'GitHub tab not found.' }
  const config = await readConfig()
  return {
    status: 200,
    surface: GITHUB_CREDENTIALS_SURFACE,
    state: { configured: Boolean(config.token), tokenConfigured: Boolean(config.token), name: config.name, email: config.email, publicKey: await publicSshKey() },
  }
}

/** @register_router system/action @method POST */
export async function systemAction(req) {
  if (req?.query?.tab && req.query.tab !== 'github-credentials') return { status: 404, mensagem: 'GitHub tab not found.' }
  if (req?.body?.action !== 'github.credentials.save') return { status: 404, mensagem: 'Integration action not allowed.' }
  const result = await updateSettings({ body: req.body.values || {} })
  if (result.status >= 400) return { ...result, mensagem: result.error || 'Unable to save settings.' }
  return { status: 200, state: result, notice: 'GitHub settings saved.' }
}

/** @register_tool github_generate_ssh_key
 * @description Generates or returns the Ed25519 SSH public key to register in the GitHub user settings. The private key remains in the package private directory.
 */
export async function generateSshKey() { return { publicKey: await publicSshKey(), format: 'OpenSSH Ed25519' } }

/** @register_tool github_list_repositories
 * @description Lists repositories accessible to the configured GitHub account.
 * @param {number?} perPage - Items per page (maximum 100)
 * @param {number?} page - List page
 */
export async function listRepositories({ perPage = 30, page = 1 } = {}) {
  const result = await githubRequest(`/user/repos?per_page=${Math.min(100, Math.max(1, Number(perPage) || 30))}&page=${Math.max(1, Number(page) || 1)}&sort=updated`)
  return { repositories: result.map(repo => ({ id: repo.id, name: repo.name, fullName: repo.full_name, description: repo.description, private: repo.private, url: repo.html_url, cloneSshUrl: repo.ssh_url, defaultBranch: repo.default_branch })) }
}

/** @register_tool github_create_repository
 * @description Creates a repository in the authenticated GitHub account.
 * @param {string} name - New repository name
 * @param {string?} description - Description
 * @param {boolean?} private - Create as private (default: true)
 * @param {boolean?} autoInit - Create with an initial README
 * @param {string?} owner - Destination organization; omit to create under the authenticated account
 */
export async function createRepository({ name, description = '', private: isPrivate = true, autoInit = false, owner } = {}) {
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name || '')) throw new Error('Invalid repository name.')
  const targetOwner = String(owner || '').trim()
  if (targetOwner && !/^[A-Za-z0-9-]{1,39}$/.test(targetOwner)) throw new Error('Invalid destination organization.')
  const path = targetOwner ? `/orgs/${encoded(targetOwner)}/repos` : '/user/repos'
  const repo = await githubRequest(path, { method: 'POST', body: { name, description, private: Boolean(isPrivate), auto_init: Boolean(autoInit) } })
  return { id: repo.id, name: repo.name, fullName: repo.full_name, url: repo.html_url, cloneSshUrl: repo.ssh_url, defaultBranch: repo.default_branch }
}

/** @register_tool github_edit_repository
 * @description Changes a repository name, description, visibility, or basic settings.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string?} name - New name
 * @param {string?} description - New description
 * @param {boolean?} private - Private visibility
 * @param {boolean?} archived - Archive or unarchive
 */
export async function editRepository({ owner, repo, name, description, private: isPrivate, archived } = {}) {
  const body = Object.fromEntries(Object.entries({ name, description, private: isPrivate, archived }).filter(([, value]) => value !== undefined))
  if (!Object.keys(body).length) throw new Error('Provide at least one property to update.')
  const result = await githubRequest(repositoryPath(owner, repo), { method: 'PATCH', body })
  return { id: result.id, name: result.name, fullName: result.full_name, description: result.description, private: result.private, archived: result.archived, url: result.html_url }
}

/** @register_tool github_delete_repository
 * @description Permanently deletes a GitHub repository. Requires explicit confirmation with the full repository name.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string} confirm - Must exactly match "owner/repo" to confirm permanent deletion
 */
export async function deleteRepository({ owner, repo, confirm } = {}) {
  const fullName = `${String(owner || '').trim()}/${String(repo || '').trim()}`
  if (!/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(fullName)) throw new Error('Invalid repository.')
  if (confirm !== fullName) throw new Error(`Confirmation required: provide exactly "${fullName}".`)
  await githubRequest(repositoryPath(owner, repo), { method: 'DELETE' })
  return { deleted: true, fullName }
}

/** @register_tool github_list_branches
 * @description Lists remote branches for a GitHub repository.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 */
export async function listBranches({ owner, repo } = {}) {
  const result = await githubRequest(`${repositoryPath(owner, repo)}/branches?per_page=100`)
  return { branches: result.map(item => ({ name: item.name, protected: item.protected, commit: item.commit.sha })) }
}

/** @register_tool github_create_branch
 * @description Creates a GitHub branch from an existing SHA reference.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string} branch - New branch name
 * @param {string} from - Source SHA or branch name
 */
export async function createRemoteBranch({ owner, repo, branch, from = 'main' } = {}) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,100}$/.test(branch || '') || branch.includes('..') || branch.endsWith('/')) throw new Error('Invalid branch name.')
  const base = await githubRequest(`${repositoryPath(owner, repo)}/commits/${encoded(from)}`)
  const result = await githubRequest(`${repositoryPath(owner, repo)}/git/refs`, { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: base.sha } })
  return { branch: result.ref.replace('refs/heads/', ''), sha: result.object.sha }
}

/** @register_tool github_clone_repository
 * @description Clones a repository into the package private directory, preferring the configured token and using SSH when no token is available, preparing push and pull operations.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string?} branch - Initial branch
 */
export async function cloneGithubRepository({ owner, repo, branch } = {}) { return { repo, ...(await cloneRepository({ owner, repo, defaultBranch: branch })) } }

/** @register_tool github_list_local_branches
 * @description Lists local branches for a repository previously cloned by ThinkIac.
 * @param {string} repo - Local repository name
 */
export async function listLocalBranches({ repo } = {}) { return localBranches(repo) }

/** @register_tool github_create_local_branch
 * @description Creates and selects a branch in the local clone.
 * @param {string} repo - Local repository name
 * @param {string} branch - Branch name
 * @param {string?} from - Source branch or reference (default: HEAD)
 */
export async function createLocalBranchTool({ repo, branch, from = 'HEAD' } = {}) { return { repo, ...(await createLocalBranch(repo, branch, from)) } }

/** @register_tool github_pull
 * @description Fast-forwards the local clone from the remote branch.
 * @param {string} repo - Local repository name
 * @param {string?} branch - Remote branch; omit to use the current branch
 */
export async function pull({ repo, branch } = {}) { return { repo, ...(await pullRepository(repo, branch)) } }

/** @register_tool github_push
 * @description Sends local changes to GitHub. Stages changes, creates a commit when needed, and publishes with the configured token or SSH when no token is available.
 * @param {string} repo - Local repository name
 * @param {string?} branch - Destination branch; omit to use the current branch
 * @param {string?} message - Commit message when changes exist
 */
export async function push({ repo, branch, message } = {}) { return { repo, ...(await pushRepository(repo, branch, message)) } }

/** @register_tool github_set_git_identity
 * @description Sets the name and email used to author clone commits and stores them in GitHub settings.
 * @param {string} repo - Local repository name
 * @param {string} name - Commit author name
 * @param {string} email - Commit author email
 */
export async function setIdentity({ repo, name, email } = {}) { return setGitIdentity(repo, name, email) }

/** @register_tool github_list_issues
 * @description Lists open or closed issues; pull requests are not included.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string?} state - all, open, or closed
 */
export async function listIssues({ owner, repo, state = 'open' } = {}) {
  const result = await githubRequest(`${repositoryPath(owner, repo)}/issues?state=${encodeURIComponent(['open', 'closed', 'all'].includes(state) ? state : 'open')}&per_page=100`)
  return { issues: result.filter(item => !item.pull_request).map(item => ({ number: item.number, title: item.title, state: item.state, url: item.html_url, body: item.body, user: item.user?.login })) }
}

/** @register_tool github_create_issue
 * @description Creates an issue in a repository.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string} title - Title
 * @param {string?} body - Description
 */
export async function createIssue({ owner, repo, title, body = '' } = {}) {
  const result = await githubRequest(`${repositoryPath(owner, repo)}/issues`, { method: 'POST', body: { title, body } })
  return { number: result.number, title: result.title, url: result.html_url, state: result.state }
}

/** @register_tool github_comment_issue
 * @description Adds a comment to an issue.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {number} issueNumber - Issue number
 * @param {string} body - Comment
 */
export async function commentIssue({ owner, repo, issueNumber, body } = {}) {
  const result = await githubRequest(`${repositoryPath(owner, repo)}/issues/${Number(issueNumber)}/comments`, { method: 'POST', body: { body } })
  return { id: result.id, url: result.html_url, createdAt: result.created_at }
}

/** @register_tool github_list_pull_requests
 * @description Lists repository pull requests.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string?} state - all, open, or closed
 */
export async function listPullRequests({ owner, repo, state = 'open' } = {}) {
  const result = await githubRequest(`${repositoryPath(owner, repo)}/pulls?state=${encodeURIComponent(['open', 'closed', 'all'].includes(state) ? state : 'open')}&per_page=100`)
  return { pullRequests: result.map(item => ({ number: item.number, title: item.title, state: item.state, url: item.html_url, head: item.head.ref, base: item.base.ref, body: item.body })) }
}

/** @register_tool github_create_pull_request
 * @description Creates a pull request from the head branch to the base branch.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {string} title - Title
 * @param {string} head - Source branch
 * @param {string} base - Destination branch
 * @param {string?} body - Description
 */
export async function createPullRequest({ owner, repo, title, head, base, body = '' } = {}) {
  const result = await githubRequest(`${repositoryPath(owner, repo)}/pulls`, { method: 'POST', body: { title, head, base, body } })
  return { number: result.number, title: result.title, url: result.html_url, state: result.state }
}

/** @register_tool github_comment_pull_request
 * @description Comments on a pull request through the GitHub issue comments API.
 * @param {string} owner - Owner
 * @param {string} repo - Repository
 * @param {number} pullNumber - Pull request number
 * @param {string} body - Comment
 */
export async function commentPullRequest({ owner, repo, pullNumber, body } = {}) {
  const result = await githubRequest(`${repositoryPath(owner, repo)}/issues/${Number(pullNumber)}/comments`, { method: 'POST', body: { body } })
  return { id: result.id, url: result.html_url, createdAt: result.created_at }
}
