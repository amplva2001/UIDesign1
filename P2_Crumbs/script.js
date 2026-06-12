// ── Google Apps Script config ─────────────────────────────────────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhkduo4yhMb6iXZZlvMtaAFBLB1lgaWn8u5slprNJikJKTLM-6Al0fLa2Yyx2GR9Y9/exec';
const SCRIPT_CONFIGURED = true;

// ── Theme toggle ──────────────────────────────────────────────────────────────
const themeBtn  = document.getElementById('theme-btn');
const themeIcon = document.getElementById('theme-icon');

function applyTheme(isDark) {
  document.body.classList.toggle('dark', isDark);
  themeIcon.src = isDark ? 'assets/light mode.png' : 'assets/dark mode.png';
  themeIcon.alt = isDark ? 'switch to light' : 'switch to dark';
}

applyTheme(localStorage.getItem('theme') === 'dark');

themeBtn.addEventListener('click', () => {
  const isDark = !document.body.classList.contains('dark');
  applyTheme(isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// ── Timer ─────────────────────────────────────────────────────────────────────
let secs = 0;
document.getElementById('stat-visited').textContent = 1;

setInterval(() => {
  secs++;
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  document.getElementById('stat-time').textContent = m + ':' + s;
}, 1000);

// ── Cookie facts per domain ───────────────────────────────────────────────────
const FACTS = {
  'google.com':     'Google sets over 20 cookies and tracks you across 86% of the web.',
  'youtube.com':    'YouTube cookies remember every video you watch — even in incognito.',
  'facebook.com':   'Facebook tracks you on sites you have never visited via the Like button.',
  'instagram.com':  'Instagram shares your data with 75+ advertising partners.',
  'twitter.com':    'Twitter cookies persist for up to 2 years after your last visit.',
  'amazon.com':     'Amazon tracks your cursor movements and time spent on each product.',
  'tiktok.com':     'TikTok cookies collect keystroke data, including things you never post.',
  'reddit.com':     'Reddit sells browsing data to train AI models.',
  'naver.com':      'Naver uses cookies to profile users across Korea\'s entire web.',
  'kakao.com':      'KakaoTalk cookies sync across all your devices and platforms.',
  'everynoise.com': 'Every Noise at Once has no tracking — a rare cookie-free corner of the web.',
};

const GENERIC = [
  'This site plants a cookie the moment you land — before you click anything.',
  'Cookies here may outlive the browser tab, the session, even the browser itself.',
  'Third-party cookies on this domain follow you to other sites.',
  'This site likely knows your rough location from your IP before you load.',
  'Your scroll depth, click pattern, and reading speed may be recorded.',
  'Advertisers can bid on showing you ads based on this visit in under 100ms.',
  'Deleting cookies here will not remove the fingerprint your browser left behind.',
  'Returning to this site tells its server exactly how long you were away.',
];

function getFact(domain) {
  for (const [key, fact] of Object.entries(FACTS)) {
    if (domain.includes(key)) return fact;
  }
  return GENERIC[Math.floor(Math.random() * GENERIC.length)];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 80%, 68%)`;
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── Local fallback (used when Airtable is not configured) ─────────────────────
function loadSaved() {
  return JSON.parse(localStorage.getItem('crumbs') || '[]');
}
function saveLocal(data) {
  const all = loadSaved();
  all.push(data);
  localStorage.setItem('crumbs', JSON.stringify(all));
}

// ── Google Sheets: fetch approved crumbs ──────────────────────────────────────
async function fetchApproved() {
  try {
    const res = await fetch(SCRIPT_URL);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(r => ({
      name:      r.name,
      href:      r.url,
      author:    r.author    || 'Anon',
      comment:   r.comment   || '',
      timestamp: r.timestamp || '',
      color:     r.color     || randomColor(),
      x:         Number(r.x) || 60,
      y:         Number(r.y) || 80,
    }));
  } catch {
    return null;
  }
}

// ── Google Sheets: submit a crumb as pending ──────────────────────────────────
async function submitPending(data) {
  await fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({
      name:      data.name,
      url:       data.href,
      author:    data.author,
      comment:   data.comment,
      timestamp: data.timestamp,
      color:     data.color,
      x:         data.x,
      y:         data.y,
    }),
  });
}

// ── Pending review modal ──────────────────────────────────────────────────────
const pendingModal = document.getElementById('pending-modal');
document.getElementById('modal-close').addEventListener('click', () => {
  pendingModal.hidden = true;
});

// ── Render a crumb ────────────────────────────────────────────────────────────
let crumbCount = 0;

function renderCrumb(data) {
  const { name, href, author, comment, timestamp, x, y, color } = data;
  const el = document.createElement('div');
  el.className        = 'crumb';
  el.textContent      = name;
  el.style.left       = x + 'px';
  el.style.top        = y + 'px';
  el.style.background = color;

  const tip = document.getElementById('tooltip');
  el.addEventListener('mouseenter', () => {
    let html = `<b>${name}</b><br>${timestamp} by ${author}`;
    if (comment) html += ` &ldquo;${comment}&rdquo;`;
    tip.innerHTML = html;
    tip.style.display = 'block';
  });
  el.addEventListener('mousemove', e => {
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top  = (e.clientY + 14) + 'px';
  });
  el.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  el.addEventListener('click', () => window.open(href, '_blank'));

  document.getElementById('crumb-area').appendChild(el);
  crumbCount++;
  document.getElementById('stat-crumbs').textContent = crumbCount;
}

// ── Add crumb ─────────────────────────────────────────────────────────────────
async function addCrumb(nameOverride, urlOverride, authorOverride, commentOverride) {
  const urlEl     = document.getElementById('url-input');
  const nameEl    = document.getElementById('name-input');
  const authorEl  = document.getElementById('author-input');
  const commentEl = document.getElementById('comment-input');

  const raw   = urlOverride  || urlEl.value.trim();
  const label = nameOverride || nameEl.value.trim();
  if (!raw) return;

  let domain = raw, href = raw;
  try {
    const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
    domain = u.hostname.replace('www.', '');
    href   = u.href;
  } catch {}

  const area  = document.getElementById('crumb-area');
  const areaW = area.offsetWidth || window.innerWidth;
  const areaH = Math.max(area.offsetHeight, 700);

  const data = {
    name:      label || domain,
    href,
    author:    authorOverride  || authorEl.value.trim() || 'Anon',
    comment:   commentOverride || commentEl.value.trim(),
    timestamp: formatDate(new Date()),
    x:         24 + Math.random() * (areaW - 180),
    y:         24 + Math.random() * (areaH - 60),
    color:     randomColor(),
  };

  try {
    await submitPending(data);
    pendingModal.hidden = false;
  } catch {
    saveLocal(data);
    renderCrumb(data);
  }

  if (!urlOverride)  urlEl.value  = '';
  if (!nameOverride) nameEl.value = '';
  authorEl.value  = '';
  commentEl.value = '';
}

document.getElementById('add-btn').addEventListener('click', () => addCrumb());
document.getElementById('url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCrumb();
});

// ── On load ───────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  const approved = await fetchApproved();

  if (approved && approved.length > 0) {
    approved.forEach(renderCrumb);
  } else {
    const saved = loadSaved();
    if (saved.length > 0) {
      saved.forEach(renderCrumb);
    } else {
      addCrumb('everynoise', 'https://everynoise.com', 'Anon', 'Let your ears be massaged');
    }
  }
});
