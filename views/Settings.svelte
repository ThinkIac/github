<script>
  import { onMount } from 'svelte'

  let theme = 'dark'
  let state = { name: '', email: '', publicKey: '', configured: false }
  let token = ''
  let clearToken = false
  let loading = true
  let saving = false
  let error = ''
  let notice = ''

  function readTheme() { try { theme = localStorage.getItem('agent:theme') === 'light' ? 'light' : 'dark' } catch (_) {} }
  function syncTheme(event) { if (event.key === 'agent:theme') readTheme() }

  async function load() {
    loading = true; error = ''
    try {
      const response = await fetch('/github/settings', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || data.status >= 400) throw new Error(data.error || 'Unable to load settings.')
      state = data
    } catch (cause) { error = cause.message || 'Unable to load settings.' }
    finally { loading = false }
  }

  async function save() {
    saving = true; error = ''; notice = ''
    try {
      const response = await fetch('/github/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: state.name, email: state.email, token: token || undefined, clearToken }),
      })
      const data = await response.json()
      if (!response.ok || data.status >= 400) throw new Error(data.error || 'Unable to save settings.')
      state = data; token = ''; clearToken = false; notice = 'Settings saved.'
    } catch (cause) { error = cause.message || 'Unable to save settings.' }
    finally { saving = false }
  }

  async function copyKey() {
    error = ''; notice = ''
    try { await navigator.clipboard.writeText(state.publicKey); notice = 'SSH public key copied.' }
    catch (_) { error = 'The browser did not allow copying. Select and copy the key manually.' }
  }

  onMount(() => {
    readTheme(); window.addEventListener('storage', syncTheme); load()
    return () => window.removeEventListener('storage', syncTheme)
  })
</script>

<main class="settings" data-theme={theme} aria-busy={loading || saving}>
  <header><p class="eyebrow">Integration credentials</p><h1>GitHub</h1><p class="intro">Configure an SSH key for Git operations and a token for repositories, issues, and pull requests.</p></header>
  {#if loading}<p class="status" role="status">Loading…</p>{/if}
  {#if error}<p class="notice error" role="alert">{error}</p>{/if}
  {#if notice}<p class="notice" role="status">{notice}</p>{/if}
  {#if !loading}
    <section aria-labelledby="ssh-heading">
      <h2 id="ssh-heading">SSH key</h2>
      <p>Add this public key in GitHub under Settings → SSH and GPG keys. The private key remains in the package's private directory.</p>
      <label for="public-key">SSH public key</label>
      <textarea id="public-key" readonly rows="3" bind:value={state.publicKey} aria-label="Generated SSH public key"></textarea>
      <button type="button" on:click={copyKey}>Copy public key</button>
    </section>
    <section aria-labelledby="token-heading">
      <h2 id="token-heading">GitHub token</h2>
      <p>Use a Personal Access Token with the permissions required for the intended repositories, branches, issues, and pull requests.</p>
      <label for="github-token">Access token</label>
      <input id="github-token" type="password" autocomplete="new-password" bind:value={token} placeholder={state.configured ? 'Token configured. Enter a new token to replace it.' : 'Paste the GitHub token'} />
      {#if state.configured}<label class="check"><input type="checkbox" bind:checked={clearToken} /> Remove saved token</label>{/if}
    </section>
    <section aria-labelledby="identity-heading">
      <h2 id="identity-heading">Commit identity</h2>
      <label for="git-name">Name</label><input id="git-name" autocomplete="name" bind:value={state.name} />
      <label for="git-email">Email</label><input id="git-email" type="email" autocomplete="email" bind:value={state.email} />
    </section>
    <footer><button class="primary" type="button" disabled={saving} on:click={save}>{saving ? 'Saving…' : 'Save settings'}</button></footer>
  {/if}
</main>

<style>
  .settings{--tk-bg:#111111;--tk-surface:#181818;--tk-surface-2:#1f1f1f;--tk-border:rgba(255,255,255,.09);--tk-border-hi:rgba(255,255,255,.16);--tk-text:#f5f5f5;--tk-muted:#888888;--tk-accent:#f5f5f5;--tk-on-accent:#111111;--tk-radius-md:8px;min-height:100dvh;background:var(--tk-bg);color:var(--tk-text);font:14px 'Ubuntu',system-ui,sans-serif;padding:24px;box-sizing:border-box}
  .settings[data-theme='light']{--tk-bg:#ffffff;--tk-surface:#f5f5f5;--tk-surface-2:#ececec;--tk-border:rgba(0,0,0,.10);--tk-border-hi:rgba(0,0,0,.18);--tk-text:#1a1a1a;--tk-muted:#666666;--tk-accent:#111111;--tk-on-accent:#ffffff}
  header,section,footer{max-width:760px;margin:0 auto}header{margin-bottom:24px}.eyebrow{color:var(--tk-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}h1{font-size:24px;margin:5px 0}h2{font-size:16px;margin:0 0 8px}p{line-height:1.5}.intro{color:var(--tk-muted);margin:8px 0 0}section{display:grid;gap:10px;border-top:1px solid var(--tk-border);padding:20px 0}section p{color:var(--tk-muted);font-size:13px;margin:0 0 4px}label{font-size:13px;color:var(--tk-muted)}input,textarea{box-sizing:border-box;width:100%;background:var(--tk-surface);border:1px solid var(--tk-border);border-radius:var(--tk-radius-md);color:var(--tk-text);font:inherit;padding:10px}textarea{font-family:monospace;resize:vertical;overflow-wrap:anywhere}button{justify-self:start;background:transparent;border:1px solid var(--tk-border-hi);border-radius:var(--tk-radius-md);color:var(--tk-text);font:inherit;padding:9px 12px;cursor:pointer}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--tk-border-hi);outline-offset:2px}.check{display:flex;align-items:center;gap:8px}.check input{width:auto}.primary{background:var(--tk-accent);color:var(--tk-on-accent);font-weight:600}footer{display:flex;justify-content:flex-end}.notice,.status{max-width:760px;margin:12px auto;padding:10px 12px;border-left:2px solid var(--tk-border-hi)}.error{color:#d66}button:disabled{opacity:.6;cursor:wait}
</style>
