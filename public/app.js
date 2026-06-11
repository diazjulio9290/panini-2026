/* ============================================================================
   app.js — the whole frontend app (no framework, no build step).
   Talks to the Express backend (server.js) which stores data in Neon Postgres.
   ========================================================================== */

const state = {
  collection: {},     // { "ARG04": 1, "BRA05": 3 }  (missing code => treat as 0)
  displayName: 'My',
  owner: false,
  loaded: false,
  teamQuery: '',      // live search text for filtering the team cards
  teamSort: 'default', // 'default' | 'closest' | 'missing'
};

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');

// ---------- tiny helpers ----------
function qty(code) {
  return state.collection[code] || 0;
}
const STICKER_BY_CODE = Object.fromEntries(ALL_STICKERS.map((s) => [s.code, s]));
function sectionOfCode(code) {
  const s = STICKER_BY_CODE[code];
  return s ? SECTION_BY_ID[s.sectionId] : null;
}
function isSectionComplete(sec) {
  return !!sec && sec.stickers.every((s) => qty(s.code) >= 1);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, kind = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = 'toast'), 2200);
}

// ---------- stats ----------
function computeStats() {
  let collected = 0, missing = 0, dupSpares = 0, dupCodes = 0;
  for (const st of ALL_STICKERS) {
    const q = qty(st.code);
    if (q >= 1) collected++; else missing++;
    if (q > 1) { dupCodes++; dupSpares += q - 1; }
  }
  let completedTeams = 0;
  for (const s of SECTIONS) {
    if (s.kind === 'team' && s.stickers.every((st) => qty(st.code) >= 1)) completedTeams++;
  }
  const pct = Math.round((collected / TOTAL_STICKERS) * 1000) / 10;
  return { collected, missing, dupSpares, dupCodes, completedTeams, pct };
}
function sectionStats(section) {
  let have = 0, missing = 0, dupSpares = 0;
  for (const st of section.stickers) {
    const q = qty(st.code);
    if (q >= 1) have++; else missing++;
    if (q > 1) dupSpares += q - 1;
  }
  const total = section.stickers.length;
  return { have, missing, dupSpares, total, done: have === total };
}

// ---------- API ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
  return data;
}
async function loadState() {
  const data = await api('/api/state');
  state.collection = data.collection || {};
  state.displayName = data.displayName || 'My';
  state.owner = !!data.owner;
  state.loaded = true;
}

// Owner-only: change one sticker. Optimistic update + rollback on failure.
async function setQty(code, newQ) {
  newQ = Math.max(0, newQ);
  const prev = qty(code);
  if (newQ === prev) return;
  const sec = sectionOfCode(code);
  const wasComplete = isSectionComplete(sec);
  if (newQ === 0) delete state.collection[code]; else state.collection[code] = newQ;
  updateAfterQtyChange(code);
  if (sec && !wasComplete && newQ > prev && isSectionComplete(sec)) celebrate(sec);
  try {
    await api('/api/sticker', { method: 'PUT', body: JSON.stringify({ code, quantity: newQ }) });
  } catch (e) {
    if (prev === 0) delete state.collection[code]; else state.collection[code] = prev;
    updateAfterQtyChange(code);
    toast(e.message, 'err');
  }
}

// Update only what changed: if the sticker's tile is on screen (team grid page),
// swap that one tile + refresh the grid header. Otherwise re-render the page.
// This keeps taps instant and flicker-free on phones.
function updateAfterQtyChange(code) {
  const stk = STICKER_BY_CODE[code];
  const tile = stk && document.querySelector(`.sticker[data-code="${code}"]`);
  if (tile) {
    tile.outerHTML = stickerTile(stk);
    const head = document.getElementById('gridHead');
    if (head) head.innerHTML = gridHeadHtml(SECTION_BY_ID[stk.sectionId]);
  } else {
    rerenderCurrent();
  }
}

// 🎉 Confetti burst + toast when a team/section is completed.
function celebrate(section) {
  toast(`🏆 ${section.name} COMPLETE!`, 'ok');
  const colors = ['#ff2e7e', '#a435ff', '#2f7bff', '#00d6c4', '#b6ff3d', '#ffd45e'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    const size = 6 + Math.random() * 8;
    p.style.left = Math.random() * 100 + 'vw';
    p.style.width = size + 'px';
    p.style.height = size * 0.45 + 'px';
    p.style.background = colors[i % colors.length];
    p.style.animation = `confetti-fall ${1.8 + Math.random() * 1.6}s linear forwards`;
    p.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4200);
  }
}

// ---------- routing ----------
const ROUTES = ['dashboard', 'catalog', 'missing', 'duplicates', 'data'];
function currentRoute() {
  const h = (location.hash || '#/dashboard').replace(/^#\//, '');
  const [name, arg] = h.split('/');
  return { name: name || 'dashboard', arg: arg || '' };
}
function go(path) { location.hash = '#/' + path; }

function renderTabs() {
  const tabs = $('#tabs');
  const { name } = currentRoute();
  const items = [
    ['dashboard', '🏠 Dashboard'],
    ['catalog', '📒 Album'],
    ['missing', '🔎 Missing'],
    ['duplicates', '🔁 Duplicates'],
    ['data', '⚙️ Import / Export'],
  ];
  tabs.innerHTML = items
    .map(([id, label]) => `<div class="tab ${name === id ? 'active' : ''}" data-go="${id}">${label}</div>`)
    .join('');
}

function rerenderCurrent() {
  renderTabs();
  router();
}

function router() {
  if (!state.loaded) return;
  const { name, arg } = currentRoute();
  if (name === 'team') return renderGrid(arg);
  switch (name) {
    case 'dashboard': return renderDashboard();
    case 'catalog': return renderCatalog();
    case 'missing': return renderMissing();
    case 'duplicates': return renderDuplicates();
    case 'data': return renderData();
    default: return renderDashboard();
  }
}

// ---------- shared bits ----------
function publicBanner() {
  if (state.owner) return '';
  return `<div class="public-banner">📣 You're viewing <b>${esc(state.displayName)}'s</b> public album.
    Grab their <b>Missing</b> and <b>Duplicates</b> lists below to set up a trade!</div>`;
}
function progress(pct, cls = '') {
  return `<div class="progress ${cls}"><span style="width:${Math.min(100, pct)}%"></span></div>`;
}

// ---- team search / filter ----
function teamSearchBar() {
  const q = esc(state.teamQuery || '');
  return `
    <div class="team-search">
      <input id="teamSearch" type="text" autocomplete="off" spellcheck="false"
             placeholder="🔍 Search a team — e.g. Brazil, BRA, Japan…" value="${q}" />
      <button class="ts-clear ${q ? '' : 'hidden'}" id="teamSearchClear" aria-label="Clear search" title="Clear">✕</button>
    </div>`;
}

// Sort options for the team grid. 'closest' puts nearly-finished teams first
// (the fun ones to hunt), completed teams last.
function sortedTeams(teams) {
  if (state.teamSort === 'closest') {
    const key = (s) => { const st = sectionStats(s); return st.done ? 1000 : st.missing; };
    return [...teams].sort((a, b) => key(a) - key(b));
  }
  if (state.teamSort === 'missing') {
    return [...teams].sort((a, b) => sectionStats(b).missing - sectionStats(a).missing);
  }
  return teams;
}

// Wrap a list of team cards in a searchable, sortable grid + "no results" message.
function teamsBlock(teams, headLabel) {
  const sorts = [
    ['default', 'A–Z'],
    ['closest', '🔥 Closest to done'],
    ['missing', '🧩 Most missing'],
  ];
  const chips = sorts.map(([id, label]) =>
    `<button class="sort-chip ${state.teamSort === id ? 'active' : ''}" data-sort="${id}">${label}</button>`).join('');
  return `
    <div class="section-head">${headLabel}</div>
    ${teamSearchBar()}
    <div class="sort-row"><span class="sort-label">Sort:</span>${chips}</div>
    <div class="card-grid" id="teamGrid">${sortedTeams(teams).map(sectionCard).join('')}</div>
    <div class="empty hidden" id="teamSearchEmpty">
      <div class="big">🔍</div><b>No teams match that</b>
      <div>Try a different name or 3-letter code.</div>
    </div>`;
}

// Show/hide team cards based on the current query (no re-render, keeps focus).
function applyTeamFilter() {
  const q = (state.teamQuery || '').trim().toLowerCase();
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  let shown = 0;
  grid.querySelectorAll('.team-card').forEach((card) => {
    const hay = card.getAttribute('data-search') || '';
    const match = !q || hay.indexOf(q) !== -1;
    card.classList.toggle('hidden', !match);
    if (match) shown++;
  });
  const empty = document.getElementById('teamSearchEmpty');
  if (empty) empty.classList.toggle('hidden', shown > 0);
  const clear = document.getElementById('teamSearchClear');
  if (clear) clear.classList.toggle('hidden', !q);
}

// "🔥 Almost there" — the 3 in-progress sections closest to completion.
// Gives the collector a clear next target. Hidden until there's progress.
function huntBanner() {
  const close = SECTIONS
    .map((s) => ({ s, st: sectionStats(s) }))
    .filter((x) => x.st.have > 0 && !x.st.done)
    .sort((a, b) => a.st.missing - b.st.missing)
    .slice(0, 3);
  if (!close.length) return '';
  return `<div class="hunt"><span class="hunt-title">🔥 Almost there:</span>${close.map((x) =>
    `<button class="hunt-chip" data-team="${x.s.id}">${esc(x.s.short || x.s.name)} — ${x.st.missing} left</button>`).join('')}</div>`;
}

// Real flag image for teams (renders everywhere); emoji for special sections.
function flagSrc(iso) { return `https://flagcdn.com/w80/${iso}.png`; }
function iconFor(section, inline = false) {
  if (section.iso) {
    return `<img class="flag-img${inline ? ' inline' : ''}" src="${flagSrc(section.iso)}" alt="${esc(section.name)} flag" loading="lazy" />`;
  }
  return inline ? `<span class="emoji-inline">${section.emoji}</span>` : section.emoji;
}

// ---------- Dashboard ----------
function renderDashboard() {
  const s = computeStats();
  const ownerName = state.owner ? 'Your' : esc(state.displayName) + "'s";

  const stats = `
    <div class="stat-grid">
      <div class="stat green"><div class="label">Collected</div><div class="value">${s.collected}<small> / ${TOTAL_STICKERS}</small></div></div>
      <div class="stat"><div class="label">Completion</div><div class="value">${s.pct}<small>%</small></div></div>
      <div class="stat red"><div class="label">Missing</div><div class="value">${s.missing}</div></div>
      <div class="stat blue"><div class="label">Duplicates</div><div class="value">${s.dupSpares}</div></div>
      <div class="stat gold"><div class="label">Teams done</div><div class="value">${s.completedTeams}<small> / 48</small></div></div>
    </div>`;

  const overall = `
    <div class="overall">
      <div class="top"><b>${ownerName} album progress</b><span>${s.collected} of ${TOTAL_STICKERS} stickers</span></div>
      ${progress(s.pct)}
    </div>`;

  // group: special sections first, then teams
  const specials = SECTIONS.filter((x) => x.kind === 'special');
  const teams = SECTIONS.filter((x) => x.kind === 'team');

  const cardsHtml = (arr) => `<div class="card-grid">${arr.map(sectionCard).join('')}</div>`;

  const hero = `
    <div class="hero">
      <span class="ball">⚽</span>
      <div class="kicker">Panini Sticker Album</div>
      <h1>FIFA World Cup <span class="grad">26</span></h1>
      <div class="host"><span class="flags"><img src="${flagSrc('us')}" alt="USA"/><img src="${flagSrc('mx')}" alt="Mexico"/><img src="${flagSrc('ca')}" alt="Canada"/></span> United States · Mexico · Canada · 48 teams · ${TOTAL_STICKERS} stickers</div>
    </div>`;

  view.innerHTML = `
    ${publicBanner()}
    ${hero}
    <div class="page-title">📊 ${state.owner ? 'Your dashboard' : esc(state.displayName) + "'s dashboard"} <span class="sub">tap any card to open the stickers</span></div>
    ${stats}
    ${overall}
    ${huntBanner()}
    <div class="section-head">Special sections</div>
    ${cardsHtml(specials)}
    ${teamsBlock(teams, 'National teams (48)')}
  `;
  applyTeamFilter();
}

function sectionCard(section) {
  const st = sectionStats(section);
  const pct = Math.round((st.have / st.total) * 100);
  const classes = ['team-card'];
  if (section.special) classes.push('special');
  if (st.done) classes.push('done');

  const ph = section.kind === 'team' && !section.confirmed
    ? `<span class="badge ph">Placeholder</span>` : '';

  const foot = [];
  if (st.done) foot.push(`<span class="badge done">🏆 Complete</span>`);
  else foot.push(`<span class="badge need">${st.missing} missing</span>`);
  if (st.dupSpares > 0) foot.push(`<span class="badge dup">${st.dupSpares} to trade</span>`);

  return `
    <div class="${classes.join(' ')}" data-team="${section.id}" data-search="${esc((section.name + ' ' + section.id).toLowerCase())}">
      ${ph}
      <div class="tc-top">
        <span class="tc-emoji">${iconFor(section)}</span>
        <div>
          <div class="tc-name">${esc(section.name)}</div>
          <div class="tc-id">${section.id}</div>
        </div>
      </div>
      <div class="tc-count"><b>${st.have}</b> / ${st.total} collected</div>
      ${progress(pct, st.done ? 'thin green' : 'thin')}
      <div class="tc-foot">${foot.join('')}</div>
    </div>`;
}

// ---------- Album (catalog list of sections) ----------
function renderCatalog() {
  const specials = SECTIONS.filter((x) => x.kind === 'special');
  const teams = SECTIONS.filter((x) => x.kind === 'team');
  const cardsHtml = (arr) => `<div class="card-grid">${arr.map(sectionCard).join('')}</div>`;
  view.innerHTML = `
    ${publicBanner()}
    <div class="page-title">📒 The Album <span class="sub">${TOTAL_STICKERS} stickers • ${teams.length} teams</span></div>
    <div class="section-head">Special sections</div>
    ${cardsHtml(specials)}
    ${teamsBlock(teams, 'National teams')}
  `;
  applyTeamFilter();
}

// ---------- Sticker grid for one section ----------
function gridHeadHtml(section) {
  const st = sectionStats(section);
  return `
    <div class="overall" style="margin-bottom:14px">
      <div class="top"><b>${st.have} / ${st.total} collected</b>
        <span>${st.missing} missing${st.dupSpares ? ' • ' + st.dupSpares + ' to trade' : ''}</span></div>
      ${progress(Math.round((st.have / st.total) * 100), st.done ? 'green' : '')}
    </div>`;
}

function renderGrid(sectionId) {
  const section = SECTION_BY_ID[sectionId];
  if (!section) { go('dashboard'); return; }
  const ph = section.kind === 'team' && !section.confirmed
    ? `<span class="badge ph" style="position:static">Placeholder team</span>` : '';

  const tiles = section.stickers.map((stk) => stickerTile(stk)).join('');

  view.innerHTML = `
    <div class="grid-toolbar">
      <button class="btn ghost small" data-go="dashboard">← Back</button>
      <div class="page-title" style="margin:0">${iconFor(section, true)} ${esc(section.name)} ${ph}</div>
    </div>
    <div id="gridHead">${gridHeadHtml(section)}</div>
    ${state.owner ? '' : '<div class="public-banner" style="margin-bottom:14px">👁 Read-only view. Only the owner can change quantities.</div>'}
    <div class="sticker-grid">${tiles}</div>
  `;
}

function stickerTile(stk) {
  const q = qty(stk.code);
  let cls = 'sticker', status = 'Need', statusCls = 'need';
  if (q === 1) { cls += ' have'; status = 'Have'; statusCls = 'have'; }
  else if (q > 1) { cls += ' dup'; status = 'Duplicate'; statusCls = 'dup'; }
  else { cls += ' need'; }
  if (stk.special) cls += stk.special === 'silver' ? ' special-silver' : ' special';

  const dupBadge = q > 1 ? `<span class="dup-badge">x${q}</span>` : '';

  // Owner sees +/- steppers and can click the tile to +1. Public sees read-only.
  let controls;
  if (state.owner) {
    cls += ' clickable';
    controls = `
      <div class="stepper">
        <button class="step-btn minus" data-dec="${stk.code}" aria-label="minus">−</button>
        <span class="step-num">${q}</span>
        <button class="step-btn plus" data-inc="${stk.code}" aria-label="plus">+</button>
      </div>`;
  } else {
    controls = `<div class="qty">Qty: ${q}</div>`;
  }

  return `
    <div class="${cls}" data-code="${stk.code}" ${state.owner ? `data-tile="${stk.code}"` : ''}>
      ${dupBadge}
      <div class="code">${stk.code}</div>
      <div class="type">${stk.type}</div>
      <div class="status ${statusCls}">${status}</div>
      ${controls}
    </div>`;
}

// ---------- Missing page ----------
function renderMissing() {
  const groups = SECTIONS.map((s) => {
    const codes = s.stickers.filter((st) => qty(st.code) === 0).map((st) => st.code);
    return { s, codes };
  }).filter((g) => g.codes.length);

  const totalMissing = groups.reduce((a, g) => a + g.codes.length, 0);

  let body;
  if (!totalMissing) {
    body = `<div class="empty"><div class="big">🎉</div><b>Nothing missing!</b><div>Every sticker is collected. Album complete.</div></div>`;
  } else {
    body = groups.map((g) => `
      <div class="list-group">
        <h4>${iconFor(g.s, true)} ${esc(g.s.name)} <span class="count">(${g.codes.length})</span></h4>
        <div class="chips">${g.codes.map((c) => `<span class="chip need">${c}</span>`).join('')}</div>
      </div>`).join('');
  }

  view.innerHTML = `
    ${publicBanner()}
    <div class="page-title">🔎 Missing stickers <span class="sub">${totalMissing} needed</span>
      <span class="spacer" style="flex:1"></span>
      <button class="btn primary small" id="copyMissing" ${totalMissing ? '' : 'disabled'}>📋 Copy Missing List</button>
    </div>
    ${body}
  `;
}

// ---------- Duplicates page ----------
function renderDuplicates() {
  const groups = SECTIONS.map((s) => {
    const items = s.stickers
      .map((st) => ({ code: st.code, spare: Math.max(0, qty(st.code) - 1) }))
      .filter((it) => it.spare > 0);
    return { s, items };
  }).filter((g) => g.items.length);

  const totalSpares = groups.reduce((a, g) => a + g.items.reduce((b, it) => b + it.spare, 0), 0);

  let body;
  if (!totalSpares) {
    body = `<div class="empty"><div class="big">📭</div><b>No duplicates yet</b><div>When you have more than one of a sticker, the spares show here for trading.</div></div>`;
  } else {
    body = groups.map((g) => `
      <div class="list-group">
        <h4>${iconFor(g.s, true)} ${esc(g.s.name)} <span class="count">(${g.items.reduce((a, it) => a + it.spare, 0)} spare)</span></h4>
        <div class="chips">${g.items.map((it) => `<span class="chip dup">${it.code}<span class="x">x${it.spare}</span></span>`).join('')}</div>
      </div>`).join('');
  }

  view.innerHTML = `
    ${publicBanner()}
    <div class="page-title">🔁 Duplicates for trade <span class="sub">${totalSpares} spare sticker${totalSpares === 1 ? '' : 's'}</span>
      <span class="spacer" style="flex:1"></span>
      <button class="btn primary small" id="copyDuplicates" ${totalSpares ? '' : 'disabled'}>📋 Copy Duplicates List</button>
    </div>
    ${body}
  `;
}

// ---------- copy list text ----------
function buildMissingText() {
  const codes = ALL_STICKERS.filter((st) => qty(st.code) === 0).map((st) => st.code);
  return 'NEED:\n' + (codes.length ? codes.join(', ') : '(nothing — album complete!)');
}
function buildDuplicatesText() {
  const parts = [];
  for (const st of ALL_STICKERS) {
    const spare = qty(st.code) - 1;
    if (spare > 0) parts.push(spare > 1 ? `${st.code} x${spare}` : st.code);
  }
  return 'HAVE FOR TRADE:\n' + (parts.length ? parts.join(', ') : '(no duplicates yet)');
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast('Copied to clipboard ✓', 'ok');
  } catch {
    toast('Could not copy automatically', 'err');
  }
}

// ---------- Import / Export / Reset / Settings ----------
function renderData() {
  const ownerOnly = state.owner ? '' : 'disabled';
  const lockNote = state.owner ? '' :
    `<div class="public-banner" style="margin-bottom:16px">🔒 Editing tools (import, reset, display name) are owner-only. Log in to use them. Anyone can <b>export</b> a copy.</div>`;

  view.innerHTML = `
    <div class="page-title">⚙️ Import / Export</div>
    ${lockNote}

    <div class="panel">
      <h3>⬇️ Export collection</h3>
      <p>Save a backup of the collection as a JSON file. Good before big changes, or to move data.</p>
      <div class="row"><button class="btn primary" id="exportBtn">Download JSON backup</button></div>
    </div>

    <div class="panel">
      <h3>⬆️ Import collection</h3>
      <p>Load a JSON backup. This <b>replaces</b> the current collection in the database.</p>
      <div class="row">
        <input type="file" id="importFile" accept="application/json,.json" ${ownerOnly} />
        <button class="btn" id="importBtn" ${ownerOnly}>Import from file</button>
      </div>
    </div>

    <div class="panel">
      <h3>🏷️ Public display name</h3>
      <p>The name shown to visitors on your public page (currently <b>${esc(state.displayName)}</b>).</p>
      <div class="row">
        <input type="text" id="nameInput" value="${esc(state.displayName)}" maxlength="60" ${ownerOnly} />
        <button class="btn" id="saveName" ${ownerOnly}>Save name</button>
      </div>
    </div>

    <div class="panel">
      <h3>🗑️ Reset collection</h3>
      <p>Set every sticker back to 0. This cannot be undone — export a backup first.</p>
      <div class="row"><button class="btn danger" id="resetBtn" ${ownerOnly}>Reset everything to 0</button></div>
    </div>
  `;
}

function exportCollection() {
  const data = JSON.stringify(state.collection, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'panini-2026-collection.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup downloaded ✓', 'ok');
}

async function importCollection(file) {
  if (!file) { toast('Choose a JSON file first', 'err'); return; }
  try {
    const text = await file.text();
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('File is not a collection object.');
    await api('/api/import', { method: 'POST', body: JSON.stringify({ collection: obj }) });
    await loadState();
    rerenderCurrent();
    toast('Imported ✓', 'ok');
  } catch (e) {
    toast('Import failed: ' + e.message, 'err');
  }
}

// ---------- 📦 Pack Mode (owner): rapid-fire entry when opening real packs ----------
let packAdded = 0;
function openPack() {
  packAdded = 0;
  $('#packLog').innerHTML = '';
  $('#packCount').textContent = '';
  $('#packInput').value = '';
  $('#packModal').classList.add('show');
  setTimeout(() => $('#packInput').focus(), 50);
}
function closePack() {
  $('#packModal').classList.remove('show');
  rerenderCurrent(); // refresh stats behind the modal
}
function packSubmit() {
  const raw = $('#packInput').value;
  const codes = raw.toUpperCase().split(/[\s,;]+/).filter(Boolean);
  if (!codes.length) return;
  for (const c of codes) packAddOne(c);
  $('#packInput').value = '';
}
function packAddOne(code) {
  const log = $('#packLog');
  const stk = STICKER_BY_CODE[code];
  if (!stk) {
    log.insertAdjacentHTML('afterbegin',
      `<div class="pl-row bad">✕ <b>${esc(code)}</b> — not a valid code</div>`);
    return;
  }
  const newQ = qty(code) + 1;
  setQty(code, newQ);
  packAdded++;
  const sec = SECTION_BY_ID[stk.sectionId];
  const label = newQ === 1 ? 'NEW — added to album! ✨' : `duplicate ×${newQ} — for trading`;
  log.insertAdjacentHTML('afterbegin',
    `<div class="pl-row ${newQ === 1 ? 'new' : 'dup'}"><b>${code}</b> <span>${esc(sec ? sec.name : '')}</span> — ${label}</div>`);
  $('#packCount').textContent = `${packAdded} sticker${packAdded === 1 ? '' : 's'} added`;
}

// ---------- auth ----------
function openLogin() { $('#loginModal').classList.add('show'); $('#pw').value = ''; setTimeout(() => $('#pw').focus(), 50); }
function closeLogin() { $('#loginModal').classList.remove('show'); }
async function doLogin() {
  const password = $('#pw').value;
  if (!password) { toast('Enter your password', 'err'); return; }
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
    closeLogin();
    await loadState();
    updateOwnerUI();
    rerenderCurrent();
    toast('Logged in — you can edit now ✓', 'ok');
  } catch (e) {
    toast(e.message, 'err');
  }
}
async function doLogout() {
  try { await api('/api/logout', { method: 'POST' }); } catch { /* ignore */ }
  await loadState();
  updateOwnerUI();
  rerenderCurrent();
  toast('Logged out', 'ok');
}
function updateOwnerUI() {
  const pill = $('#ownerPill');
  const btn = $('#authBtn');
  const fab = $('#packFab');
  if (fab) fab.classList.toggle('hidden', !state.owner);
  $('#brandName').textContent = state.owner ? 'World Cup 2026' : esc(state.displayName) + "'s 2026";
  if (state.owner) {
    pill.textContent = '✏️ Owner';
    pill.className = 'owner-pill on';
    btn.textContent = 'Log out';
  } else {
    pill.textContent = '👁 Viewing';
    pill.className = 'owner-pill';
    btn.textContent = 'Owner login';
  }
}

// ---------- global event handling (delegation) ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-team],[data-inc],[data-dec],[data-tile],[data-sort]');
  // top bar buttons
  if (e.target.id === 'authBtn') { state.owner ? doLogout() : openLogin(); return; }
  if (e.target.id === 'packFab') return openPack();
  if (e.target.id === 'packDone') return closePack();
  if (e.target === $('#packModal')) return closePack();
  if (e.target.id === 'loginGo') return doLogin();
  if (e.target.id === 'loginCancel') return closeLogin();
  if (e.target.id === 'copyMissing') return copyText(buildMissingText());
  if (e.target.id === 'copyDuplicates') return copyText(buildDuplicatesText());
  if (e.target.id === 'exportBtn') return exportCollection();
  if (e.target.id === 'importBtn') return importCollection($('#importFile').files[0]);
  if (e.target.id === 'saveName') return saveName();
  if (e.target.id === 'resetBtn') return doReset();
  if (e.target.id === 'teamSearchClear') {
    state.teamQuery = '';
    const inp = $('#teamSearch');
    if (inp) { inp.value = ''; inp.focus(); }
    applyTeamFilter();
    return;
  }
  if (e.target === $('#loginModal')) return closeLogin();

  if (!t) return;
  if (t.dataset.sort) { state.teamSort = t.dataset.sort; rerenderCurrent(); return; }
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.team) return go('team/' + t.dataset.team);
  if (t.dataset.inc) return setQty(t.dataset.inc, qty(t.dataset.inc) + 1);
  if (t.dataset.dec) return setQty(t.dataset.dec, qty(t.dataset.dec) - 1);
  if (t.dataset.tile) return setQty(t.dataset.tile, qty(t.dataset.tile) + 1); // tap tile = +1
});

// live team search (typing filters cards without re-rendering, so focus stays)
document.addEventListener('input', (e) => {
  if (e.target.id === 'teamSearch') {
    state.teamQuery = e.target.value;
    applyTeamFilter();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && $('#loginModal').classList.contains('show')) doLogin();
  if (e.key === 'Enter' && e.target.id === 'packInput') { e.preventDefault(); packSubmit(); }
  if (e.key === 'Escape') {
    if ($('#packModal').classList.contains('show')) { closePack(); return; }
    if ($('#loginModal').classList.contains('show')) { closeLogin(); return; }
    if (e.target.id === 'teamSearch' && state.teamQuery) {
      state.teamQuery = ''; e.target.value = ''; applyTeamFilter();
    }
  }
});

async function saveName() {
  const name = $('#nameInput').value.trim();
  if (!name) { toast('Enter a name', 'err'); return; }
  try {
    const r = await api('/api/settings', { method: 'POST', body: JSON.stringify({ displayName: name }) });
    state.displayName = r.displayName;
    updateOwnerUI();
    toast('Name saved ✓', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

async function doReset() {
  if (!confirm('Reset EVERY sticker back to 0? This cannot be undone.\n\nTip: export a backup first.')) return;
  if (!confirm('Are you absolutely sure? All your counts will be erased.')) return;
  try {
    await api('/api/reset', { method: 'POST' });
    state.collection = {};
    rerenderCurrent();
    toast('Collection reset', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

// ---------- boot ----------
window.addEventListener('hashchange', router);

(async function init() {
  renderTabs();
  view.innerHTML = `<div class="empty"><div class="big">⚽</div>Loading your album…</div>`;
  try {
    await loadState();
    updateOwnerUI();
    if (!location.hash) location.hash = '#/dashboard';
    renderTabs();
    router();
  } catch (e) {
    view.innerHTML = `<div class="empty"><div class="big">⚠️</div><b>Could not load data</b>
      <div>${esc(e.message)}</div>
      <div style="margin-top:10px;color:var(--faint)">Check that the server is running and DATABASE_URL is set.</div></div>`;
  }
})();
