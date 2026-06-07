// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = 'https://api.ferrixx.de/v1';
const API_KEY  = 'apk_test_1234567890abcdef'; // Replace with your actual API key
const USERNAME = 'demo'; // Replace with your actual username
// ─────────────────────────────────────────────────────────────────────────────

const USERS_ENDPOINT = `${API_BASE}/${USERNAME}/users`;
const POSTS_ENDPOINT = `${API_BASE}/${USERNAME}/posts`;

let currentUser = null;

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok && !data.error) data.error = `HTTP ${res.status}`;
  return data;
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('loginForm').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
  document.querySelectorAll('.tab').forEach((el, i) =>
    el.classList.toggle('active', (i === 0) === (tab === 'login')));
  hideAlerts();
}

// ── Alert helpers ─────────────────────────────────────────────────────────────
function showError(msg)   { const el = document.getElementById('alertError');   el.textContent = '⚠️ ' + msg; el.style.display = 'block'; document.getElementById('alertSuccess').style.display = 'none'; }
function showSuccess(msg) { const el = document.getElementById('alertSuccess'); el.textContent = '✓ ' + msg;  el.style.display = 'block'; document.getElementById('alertError').style.display = 'none'; }
function hideAlerts()     { ['alertError','alertSuccess'].forEach(id => document.getElementById(id).style.display = 'none'); }

function setLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="spinner"></span>Please wait…' : (label || btn.dataset.label || btn.textContent);
}

// ── Register ──────────────────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  hideAlerts();
  const username = document.getElementById('regUsername').value.trim().toLowerCase();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  setLoading('registerBtn', true, 'Create account');
  try {
    const data = await apiFetch(USERS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    if (data.success) {
      showSuccess('Account created! You can now log in.');
      document.getElementById('registerForm').reset();
      setTimeout(() => switchTab('login'), 1200);
    } else {
      showError(data.error || 'Registration failed.');
    }
  } catch (err) {
    showError('Could not reach the API. Check your internet connection.');
    console.error(err);
  } finally {
    setLoading('registerBtn', false, 'Create account');
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  hideAlerts();
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  setLoading('loginBtn', true, 'Login');
  try {
    // ✔ Correct filter syntax: ?filter_field=email&filter_value=...
    const data = await apiFetch(
      `${USERS_ENDPOINT}?filter_field=email&filter_value=${encodeURIComponent(email)}`
    );
    if (!data.success) {
      showError(data.error || 'Login failed.');
      return;
    }
    // API list response: data.data = {total, limit, offset, data: [...]}
    const records = Array.isArray(data.data) ? data.data : (data.data?.data ?? []);
    if (records.length === 0) {
      showError('No account found with this email address.');
      return;
    }
    const user = records[0];
    // ⚠️ Plain-text comparison — demo only! Use server-side hashing in production.
    if (user.password !== password) {
      showError('Incorrect password.');
      return;
    }
    currentUser = user;
    sessionStorage.setItem('fx_user', JSON.stringify(user));
    showDashboard(user);
  } catch (err) {
    showError(err.message || 'Could not reach the API.');
    console.error(err);
  } finally {
    setLoading('loginBtn', false, 'Login');
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function showDashboard(user) {
  currentUser = user;
  document.getElementById('authCard').style.display  = 'none';
  document.getElementById('appLayout').style.display = 'flex';

  document.getElementById('dashAvatar').textContent = user.username.charAt(0).toUpperCase();
  document.getElementById('dashName').textContent   = user.username;
  document.getElementById('dashEmail').textContent  = user.email;
  document.getElementById('dashId').textContent     = '#' + user.id;
  document.getElementById('dashCreated').textContent =
    new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  loadUptime();
  loadPosts();
}

// ── Server uptime (status endpoint) ──────────────────────────────────────────
async function loadUptime() {
  try {
    const data = await apiFetch(`${API_BASE}/status`);
    if (data.success && data.data) {
      document.getElementById('dashUptime').textContent  = data.data.uptime  || '—';
      document.getElementById('dashServers').textContent =
        `${data.data.servers_online ?? '—'} / ${data.data.servers_total ?? '—'} online`;
      document.getElementById('dashVersion').textContent = data.data.version || '—';
    }
  } catch { /* silent — uptime is decorative */ }
}

// ── Posts ─────────────────────────────────────────────────────────────────────
async function loadPosts() {
  const feed = document.getElementById('postsFeed');
  feed.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted);font-size:.85rem">Loading posts…</div>';
  try {
    const data = await apiFetch(`${POSTS_ENDPOINT}?limit=20`);
    if (!data.success) {
      feed.innerHTML = `<div style="padding:20px;color:var(--red);font-size:.85rem">⚠️ ${escHtml(data.error || 'Could not load posts.')}<br><small style="color:var(--muted)">Make sure the <code>posts</code> collection exists in your CP.</small></div>`;
      return;
    }
    // API list response: data.data = {total, limit, offset, data: [...]}
    const posts = Array.isArray(data.data) ? data.data : (data.data?.data ?? []);
    if (posts.length === 0) {
      feed.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted);font-size:.85rem">No posts yet. Be the first!</div>';
      return;
    }
    feed.innerHTML = posts.map(p => renderPost(p)).join('');
  } catch (err) {
    feed.innerHTML = '<div style="padding:20px;color:var(--red);font-size:.85rem">⚠️ Could not reach the API.</div>';
    console.error(err);
  }
}

function renderPost(p) {
  const mine = currentUser && String(p.user_id) === String(currentUser.id);
  const date = new Date(p.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)" data-post-id="${p.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <div style="font-weight:600;font-size:.92rem">${escHtml(p.title)}</div>
        ${mine ? `<button onclick="deletePost(${p.id})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:.75rem;flex-shrink:0;padding:0" title="Delete my post">✕</button>` : ''}
      </div>
      <div style="color:var(--muted);font-size:.87rem;line-height:1.6;margin-bottom:8px;white-space:pre-wrap">${escHtml(p.content)}</div>
      <div style="font-size:.75rem;color:var(--muted)">User #${p.user_id} · ${date}</div>
    </div>`;
}

async function handleNewPost(e) {
  e.preventDefault();
  const errEl = document.getElementById('postError');
  errEl.style.display = 'none';
  const title   = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  setLoading('postBtn', true, 'Post');
  try {
    const data = await apiFetch(POSTS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ title, content, user_id: currentUser.id })
    });
    if (data.success) {
      document.getElementById('newPostForm').reset();
      loadPosts();
    } else {
      errEl.textContent = '⚠️ ' + (data.error || 'Could not create post.');
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = '⚠️ Could not reach the API.';
    errEl.style.display = 'block';
    console.error(err);
  } finally {
    setLoading('postBtn', false, 'Post');
  }
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  try {
    const data = await apiFetch(`${POSTS_ENDPOINT}?id=${id}`, { method: 'DELETE' });
    if (data.success || data.deleted || data.trashed) loadPosts();
  } catch (err) { console.error(err); }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  currentUser = null;
  sessionStorage.removeItem('fx_user');
  document.getElementById('appLayout').style.display = 'none';
  document.getElementById('authCard').style.display  = 'block';
  document.getElementById('loginForm').reset();
}

// ── Utility ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ── Resume session on page load ───────────────────────────────────────────────
const stored = sessionStorage.getItem('fx_user');
if (stored) { try { showDashboard(JSON.parse(stored)); } catch { sessionStorage.clear(); } }
