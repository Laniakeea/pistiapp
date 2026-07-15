'use strict';

// Pisti — points keeper. Single-page app; all state lives client-side
// (localStorage) and is mirrored best-effort to the server so a game
// survives reloads even if the network at the table is flaky.

// The app is mounted under /pisti behind Caddy without prefix stripping.
const BASE = new URL('.', location.href).pathname.replace(/\/$/, '');
const api = (p) => `${BASE}${p}`;
const $ = (id) => document.getElementById(id);

// ---- i18n ---------------------------------------------------------------
// Turkish is the default; EN available via the toggle on the setup screen.

const I18N = {
  tr: {
    tagline: 'masa oyunları için puan defteri',
    updateReady: '✨ Yeni sürüm hazır',
    updateBtn: 'Güncelle',
    installTitle: 'Uygulama olarak oyna',
    installBtn: 'Yükle',
    installHintAndroid: 'Pisti’yi ana ekranına ekle',
    installHintIos: 'Paylaş ⬆︎ sonra “Ana Ekrana Ekle”',
    resumeTitle: 'Devam eden oyun var',
    resumeBtn: 'Devam et',
    discardBtn: 'Sil',
    pickGame: 'Oyun seç',
    customButtons: 'Özel bonus tuşları',
    labelPh: 'Etiket',
    ptsPh: '+puan',
    players: 'Oyuncular',
    playerN: (n) => `Oyuncu ${n}`,
    rules: 'Kurallar',
    playTo: 'Hedef puan',
    noLimit: 'sınırsız',
    lowestWins: 'En düşük puan kazanır',
    startBtn: 'Oyunu başlat ▸',
    finishedGames: 'Biten oyunlar',
    footer: 'oyun geceleri için 🂡',
    roundLabel: 'EL',
    commitRound: 'Eli yaz ✓',
    finishBtn: '🏁 Bitir',
    finishSure: 'Emin misin? 🏁',
    stamp: (n) => `${n}. el ✓`,
    resumeDesc: (g, r, p) => `${g} · ${r}. el · ${p} oyuncu`,
    calcRound: (r) => `${r}. el`,
    winnerSub: (g, pts, n) => `${g} oyununu ${pts} puanla kazandı · ${n} el`,
    scoreSheet: (g) => `${g} — puan kağıdı`,
    histWon: (w, g) => `<span class="hw">${w}</span> kazandı · ${g}`,
    histMeta: (n, d) => `${n} el · ${d}`,
    rematch: 'Rövanş 🔁',
    newGame: 'Yeni oyun',
    locale: 'tr-TR',
  },
  en: {
    tagline: 'points keeper for table games',
    updateReady: '✨ A new version is ready',
    updateBtn: 'Update',
    installTitle: 'Play as an app',
    installBtn: 'Install',
    installHintAndroid: 'Add Pisti to your home screen',
    installHintIos: 'Tap Share ⬆︎ then “Add to Home Screen”',
    resumeTitle: 'Game in progress',
    resumeBtn: 'Resume',
    discardBtn: 'Discard',
    pickGame: 'Pick a game',
    customButtons: 'Custom bonus buttons',
    labelPh: 'Label',
    ptsPh: '+pts',
    players: 'Players',
    playerN: (n) => `Player ${n}`,
    rules: 'Rules',
    playTo: 'Play to (points)',
    noLimit: 'no limit',
    lowestWins: 'Lowest score wins',
    startBtn: 'Deal me in ▸',
    finishedGames: 'Finished games',
    footer: 'made for game night 🂡',
    roundLabel: 'ROUND',
    commitRound: 'Score round ✓',
    finishBtn: '🏁 Finish',
    finishSure: 'Sure? 🏁',
    stamp: (n) => `Round ${n} ✓`,
    resumeDesc: (g, r, p) => `${g} · round ${r} · ${p} players`,
    calcRound: (r) => `round ${r}`,
    winnerSub: (g, pts, n) => `wins ${g} with ${pts} points · ${n} round${n === 1 ? '' : 's'}`,
    scoreSheet: (g) => `${g} — score sheet`,
    histWon: (w, g) => `<span class="hw">${w}</span> won ${g}`,
    histMeta: (n, d) => `${n} rounds · ${d}`,
    rematch: 'Rematch 🔁',
    newGame: 'New game',
    locale: 'en-US',
  },
};

const LANG = localStorage.getItem('pisti-lang') || 'tr';
const T = I18N[LANG] || I18N.tr;

function applyI18n() {
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
  for (const el of document.querySelectorAll('[data-tp]')) el.placeholder = T[el.dataset.tp];
  $('lang-tr').classList.toggle('on', LANG === 'tr');
  $('lang-en').classList.toggle('on', LANG === 'en');
}

function setLang(lang) {
  if (lang === LANG) return;
  localStorage.setItem('pisti-lang', lang);
  location.reload();
}
$('lang-tr').onclick = () => setLang('tr');
$('lang-en').onclick = () => setLang('en');

// ---- game presets -----------------------------------------------------------
// Each preset: default target score, win direction, and the calculator's
// quick buttons (label + point value) for that game.

const PRESETS = [
  {
    id: 'pisti', name: 'Pişti', icon: '🃏', target: 151, lowestWins: false,
    quick: [
      { l: 'Pişti', v: 10 },
      { l: 'Çift Pişti', v: 20 },
      { l: 'Kartlar', v: 3 },
    ],
  },
  {
    id: 'okey', name: '101 Okey', icon: '🀄', target: null, lowestWins: true,
    quick: [
      { l: 'Bitti', v: -101 },
      { l: 'Ceza', v: 101 },
      { l: 'Çifte', v: -202 },
    ],
  },
  {
    id: 'yaniv', name: 'Yaniv', icon: '🎴', target: 200, lowestWins: true,
    quick: [
      { l: 'Yaniv', v: 0 },
      { l: 'Asaf', v: 30 },
    ],
  },
  {
    id: 'rummy', name: 'Rummy', icon: '🂡', target: 500, lowestWins: false,
    quick: [
      { l: 'Rummy', v: 50 },
      { l: 'Gin', v: 25 },
    ],
  },
  {
    id: 'dice', name: 'Dice', tn: 'Zar', icon: '🎲', target: null, lowestWins: false,
    quick: [
      { l: 'Bonus', v: 25 },
      { l: 'Big win', tl: 'Büyük', v: 50 },
      { l: 'Jackpot', v: 100 },
    ],
  },
  {
    id: 'free', name: 'Custom', tn: 'Özel', icon: '✏️', target: null, lowestWins: false,
    quick: [
      { l: 'Bonus', v: 10 },
      { l: 'Double', tl: 'Çift', v: 20 },
      { l: 'Penalty', tl: 'Ceza', v: -10 },
    ],
  },
];

const COLORS = ['#e05555', '#4d9de0', '#3fa66a', '#e0a94d', '#9b6dd6', '#38b6b6', '#d66d9e', '#96a53d'];
const MIN_P = 2, MAX_P = 8;

// ---- persistent state -------------------------------------------------------

const LS_CURRENT = 'pisti-current';
const LS_HISTORY = 'pisti-history';
const LS_SETUP = 'pisti-setup';

let state = null;       // the active game, or null
let revealShown = null; // state object currently on the reveal screen

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function storeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* full/blocked */ }
}

// ---- server sync (best effort, never blocks the UI) --------------------------

let syncTimer = null;
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 800);
}
async function syncNow() {
  if (!state) return;
  try {
    if (!state.sid) {
      const r = await fetch(api('/api/games'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      if (r.ok) {
        const { id } = await r.json();
        state.sid = id;
        storeJSON(LS_CURRENT, state);
      }
    } else {
      await fetch(api(`/api/games/${state.sid}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
    }
  } catch { /* offline is fine */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(); });

function save() {
  if (state) storeJSON(LS_CURRENT, state);
  else localStorage.removeItem(LS_CURRENT);
  scheduleSync();
}

// ---- screens ----------------------------------------------------------------

function show(name) {
  for (const s of ['screen-setup', 'screen-table', 'screen-reveal']) {
    $(s).hidden = s !== `screen-${name}`;
  }
  if (name === 'table') requestAnimationFrame(layoutSeats);
}

// ====================== SETUP ==================================================

const setup = Object.assign(
  { preset: 'pisti', nPlayers: 4, names: [], customQuick: null },
  loadJSON(LS_SETUP, {})
);

function currentPreset() { return PRESETS.find((p) => p.id === setup.preset) || PRESETS[0]; }
const presetName = (p) => (LANG === 'tr' && p.tn ? p.tn : p.name);
const qLabel = (q) => (LANG === 'tr' && q.tl ? q.tl : q.l);

function renderPresets() {
  const grid = $('preset-grid');
  grid.innerHTML = '';
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.className = 'preset' + (p.id === setup.preset ? ' on' : '');
    b.innerHTML = `<span class="pi">${p.icon}</span><span class="pn">${presetName(p)}</span>` +
      `<span class="pq">${p.quick.map(qLabel).join(' · ')}</span>`;
    b.onclick = () => {
      setup.preset = p.id;
      $('target-input').value = p.target ?? '';
      $('lowest-wins').checked = p.lowestWins;
      renderPresets();
      saveSetup();
    };
    grid.appendChild(b);
  }
  $('custom-editor').hidden = setup.preset !== 'free';
  if (setup.preset === 'free') renderCustomEditor();
}

function renderCustomEditor() {
  const rows = $('custom-rows');
  const cur = setup.customQuick ||
    PRESETS.find((p) => p.id === 'free').quick.map((q) => ({ l: qLabel(q), v: q.v }));
  rows.innerHTML = '';
  cur.forEach((q, i) => {
    const row = document.createElement('div');
    row.className = 'crow';
    const lab = document.createElement('input');
    lab.placeholder = T.labelPh;
    lab.maxLength = 14;
    lab.value = q.l;
    const val = document.createElement('input');
    val.type = 'number';
    val.inputMode = 'numeric';
    val.placeholder = T.ptsPh;
    val.value = q.v;
    const upd = () => {
      const list = (setup.customQuick ||= cur.map((c) => ({ ...c })));
      list[i] = { l: lab.value || `B${i + 1}`, v: parseInt(val.value, 10) || 0 };
      saveSetup();
    };
    lab.oninput = upd;
    val.oninput = upd;
    row.append(lab, val);
    rows.appendChild(row);
  });
}

function renderPlayers() {
  $('pcount-label').textContent = `· ${setup.nPlayers}`;
  const dots = $('pdots');
  dots.innerHTML = '';
  for (let i = MIN_P; i <= MAX_P; i++) {
    const d = document.createElement('span');
    d.className = 'pdot' + (i <= setup.nPlayers ? ' on' : '');
    dots.appendChild(d);
  }
  const wrap = $('player-names');
  wrap.innerHTML = '';
  for (let i = 0; i < setup.nPlayers; i++) {
    const row = document.createElement('div');
    row.className = 'pname-row';
    const chip = document.createElement('span');
    chip.className = 'pname-chip';
    chip.style.background = COLORS[i];
    chip.textContent = (setup.names[i] || `P${i + 1}`).trim().charAt(0).toUpperCase() || (i + 1);
    const inp = document.createElement('input');
    inp.placeholder = T.playerN(i + 1);
    inp.maxLength = 16;
    inp.value = setup.names[i] || '';
    inp.oninput = () => {
      setup.names[i] = inp.value;
      chip.textContent = (inp.value.trim() || `P${i + 1}`).charAt(0).toUpperCase();
      saveSetup();
    };
    row.append(chip, inp);
    wrap.appendChild(row);
  }
}

function saveSetup() { storeJSON(LS_SETUP, setup); }

$('pminus').onclick = () => { if (setup.nPlayers > MIN_P) { setup.nPlayers--; renderPlayers(); saveSetup(); } };
$('pplus').onclick = () => { if (setup.nPlayers < MAX_P) { setup.nPlayers++; renderPlayers(); saveSetup(); } };

$('start-btn').onclick = () => {
  const p = currentPreset();
  const quick = setup.preset === 'free' && setup.customQuick
    ? setup.customQuick.filter((q) => q.l)
    : p.quick.map((q) => ({ l: qLabel(q), v: q.v }));
  const targetRaw = parseInt($('target-input').value, 10);
  state = {
    v: 1,
    sid: null,
    game: p.id,
    gameName: presetName(p),
    icon: p.icon,
    quick,
    lowestWins: $('lowest-wins').checked,
    target: Number.isFinite(targetRaw) && targetRaw > 0 ? targetRaw : null,
    players: Array.from({ length: setup.nPlayers }, (_, i) => ({
      name: (setup.names[i] || '').trim() || T.playerN(i + 1),
      color: COLORS[i],
    })),
    rounds: [],
    entries: Array(setup.nPlayers).fill(null),
    status: 'playing',
    startedAt: Date.now(),
    finishedAt: null,
  };
  save();
  renderTable();
  show('table');
};

function renderResume() {
  const banner = $('resume-banner');
  if (state && state.status === 'playing') {
    banner.hidden = false;
    $('resume-desc').textContent =
      T.resumeDesc(state.gameName, state.rounds.length + 1, state.players.length);
  } else {
    banner.hidden = true;
  }
}
$('resume-btn').onclick = () => { renderTable(); show('table'); };
$('discard-btn').onclick = () => {
  state = null;
  save();
  renderResume();
};

// history of finished games
function renderHistory() {
  const hist = loadJSON(LS_HISTORY, []);
  $('history-wrap').hidden = hist.length === 0;
  const list = $('history-list');
  list.innerHTML = '';
  for (const h of hist) {
    const item = document.createElement('button');
    item.className = 'history-item';
    const when = new Date(h.finishedAt).toLocaleDateString(T.locale, { month: 'short', day: 'numeric' });
    item.innerHTML = `<span>${h.icon} ${T.histWon(esc(h.winner), esc(h.gameName))}</span>` +
      `<span class="hd">${T.histMeta(h.rounds, when)}</span>`;
    item.onclick = () => { showReveal(h.state, { quiet: true }); };
    list.appendChild(item);
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ====================== TABLE ==================================================

function totals(st) {
  const t = st.players.map(() => 0);
  for (const r of st.rounds) r.forEach((v, i) => { t[i] += v || 0; });
  return t;
}

function renderTable() {
  if (!state) return;
  $('pad-game').textContent = `${state.icon} ${state.gameName}`;
  $('pad-round-num').textContent = state.rounds.length + 1;

  // progress dots: one per player, filled when their score for this round is in
  const prog = $('pad-progress');
  prog.innerHTML = '';
  state.entries.forEach((e) => {
    const d = document.createElement('span');
    d.className = 'pp-dot' + (e !== null ? ' done' : '');
    prog.appendChild(d);
  });

  $('commit-round').hidden = !state.entries.every((e) => e !== null);

  renderSeats();
}

function renderSeats() {
  const wrap = $('seats');
  wrap.innerHTML = '';
  state.players.forEach((p, i) => {
    const seat = document.createElement('button');
    seat.className = 'seat' + (state.entries[i] !== null ? ' entered' : ' pending');
    seat.style.setProperty('--pc', p.color);
    seat.innerHTML =
      `<span class="seat-avatar">${esc(p.name.charAt(0).toUpperCase())}` +
      `<span class="seat-card">${state.entries[i] !== null ? '✓' : ''}</span></span>` +
      `<span class="seat-name">${esc(p.name)}</span>`;
    seat.onclick = () => openCalc(i);
    wrap.appendChild(seat);
  });
  layoutSeats();
}

// Position the seats around the felt ellipse. Player 1 sits at the bottom
// (that's where the phone owner usually is) and the rest go clockwise.
function layoutSeats() {
  if (!state || $('screen-table').hidden) return;
  const area = $('table-area').getBoundingClientRect();
  if (!area.width) return;
  const seats = $('seats').children;
  const n = seats.length;
  const cx = area.width * 0.5;
  const cy = area.height * 0.47;
  const rx = area.width * 0.40;
  const ry = area.height * 0.36;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (2 * Math.PI * i) / n;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    seats[i].style.left = `${x}px`;
    seats[i].style.top = `${y}px`;
  }
}
window.addEventListener('resize', layoutSeats);

// round commit
$('commit-round').onclick = () => {
  if (!state || !state.entries.every((e) => e !== null)) return;
  const n = state.rounds.length + 1;
  state.rounds.push(state.entries);
  state.entries = Array(state.players.length).fill(null);
  save();
  stamp(T.stamp(n));
  renderTable();

  // target reached? game over (after the stamp has a beat to land)
  if (state.target) {
    const reached = totals(state).some((t) => t >= state.target);
    if (reached) setTimeout(finishGame, 950);
  }
};

function stamp(text) {
  const el = $('round-stamp');
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('go');
  void el.offsetWidth; // restart the animation
  el.classList.add('go');
  setTimeout(() => { el.hidden = true; }, 950);
}

// peek: hold to lift the paper and glance at running totals
{
  const btn = $('peek-btn');
  const sheet = $('peek-sheet');
  const showPeek = (e) => {
    e.preventDefault();
    if (!state) return;
    const t = totals(state);
    sheet.innerHTML = state.players
      .map((p, i) => ({ p, t: t[i] }))
      .map(({ p, t }) => `<div class="pk-row"><span>${esc(p.name)}</span><b>${t}</b></div>`)
      .join('');
    sheet.hidden = false;
  };
  const hidePeek = () => { sheet.hidden = true; };
  btn.addEventListener('pointerdown', showPeek);
  btn.addEventListener('pointerup', hidePeek);
  btn.addEventListener('pointercancel', hidePeek);
  btn.addEventListener('pointerleave', hidePeek);
}

$('home-btn').onclick = () => { renderResume(); renderHistory(); show('setup'); };

// finish: double-tap guard instead of a dialog
{
  let armed = 0;
  $('finish-btn').onclick = () => {
    if (Date.now() - armed < 2500) {
      $('finish-btn').textContent = T.finishBtn;
      finishGame();
    } else {
      armed = Date.now();
      $('finish-btn').textContent = T.finishSure;
      setTimeout(() => { $('finish-btn').textContent = T.finishBtn; }, 2500);
    }
  };
}

// ====================== CALCULATOR =============================================

const calc = { player: -1, terms: [], typed: '', neg: false };

function calcTyped() {
  const v = parseInt(calc.typed || '0', 10);
  return calc.neg ? -v : v;
}
function calcTotal() {
  return calc.terms.reduce((s, t) => s + t.v, 0) + calcTyped();
}
function foldTyped() {
  if (calc.typed) {
    calc.terms.push({ v: calcTyped() });
    calc.typed = '';
    calc.neg = false;
  }
}

function renderCalcHead() {
  const p = state.players[calc.player];
  $('calc-player').innerHTML =
    `<span class="cp-dot" style="background:${p.color}"></span>${esc(p.name)} — ${T.calcRound(state.rounds.length + 1)}`;
}

function openCalc(playerIdx) {
  calc.player = playerIdx;
  calc.terms = [];
  calc.typed = '';
  calc.neg = false;
  renderCalcHead();

  const qr = $('quick-row');
  qr.innerHTML = '';
  for (const q of state.quick) {
    const b = document.createElement('button');
    b.className = 'quick';
    b.innerHTML = `${esc(q.l)}<small>${q.v >= 0 ? '+' : ''}${q.v}</small>`;
    b.onclick = () => {
      foldTyped();
      calc.terms.push({ label: q.l, v: q.v });
      renderCalc();
    };
    qr.appendChild(b);
  }

  renderCalc();
  $('calc-overlay').hidden = false;
}

function renderCalc() {
  $('lcd-total').textContent = calcTotal();
  const parts = calc.terms.map((t) => (t.label ? `${t.label}(${t.v})` : `${t.v}`));
  if (calc.typed) parts.push((calc.neg ? '-' : '') + calc.typed);
  const tape = $('lcd-tape');
  tape.textContent = parts.join(' + ');
  tape.scrollLeft = tape.scrollWidth; // keep the newest entry visible
}

// Rename the player right from the calculator header. The change applies to
// the running game and is remembered for the next one.
$('calc-rename').onclick = () => {
  const p = state.players[calc.player];
  const head = $('calc-player');
  head.innerHTML = `<span class="cp-dot" style="background:${p.color}"></span>`;
  const inp = document.createElement('input');
  inp.className = 'rename-input';
  inp.maxLength = 16;
  inp.value = p.name;
  head.appendChild(inp);
  inp.focus();
  inp.select();
  const commit = () => {
    const name = inp.value.trim();
    if (name && name !== p.name) {
      p.name = name;
      setup.names[calc.player] = name;
      saveSetup();
      save();
      renderSeats();
    }
    renderCalcHead();
  };
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
};

function closeCalc() { $('calc-overlay').hidden = true; }
$('calc-close').onclick = closeCalc;
$('calc-overlay').addEventListener('click', (e) => { if (e.target === $('calc-overlay')) closeCalc(); });

document.querySelector('.keypad').addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (!key) return;
  if (key.dataset.d !== undefined) {
    if (calc.typed.length < 5) calc.typed += key.dataset.d;
  } else {
    switch (key.dataset.op) {
      case 'clear':
        calc.terms = []; calc.typed = ''; calc.neg = false;
        break;
      case 'back':
        if (calc.typed) {
          calc.typed = calc.typed.slice(0, -1);
          if (!calc.typed) calc.neg = false;
        } else {
          calc.terms.pop();
        }
        break;
      case 'plus':
        foldTyped();
        break;
      case 'neg':
        calc.neg = !calc.neg;
        break;
      case 'ok': {
        const v = calcTotal();
        state.entries[calc.player] = v;
        save();
        closeCalc();
        renderTable();
        return;
      }
    }
  }
  renderCalc();
});

// ====================== REVEAL =================================================

function finishGame() {
  if (!state || state.status !== 'playing') return;
  // If the current round is partially entered, keep what was entered.
  if (state.entries.some((e) => e !== null)) {
    state.rounds.push(state.entries.map((e) => e));
  }
  state.entries = Array(state.players.length).fill(null);
  state.status = 'done';
  state.finishedAt = Date.now();
  save();

  // archive to history (newest first, cap 20)
  const t = totals(state);
  const w = winnerIndex(state, t);
  const hist = loadJSON(LS_HISTORY, []);
  hist.unshift({
    gameName: state.gameName, icon: state.icon,
    winner: state.players[w].name, rounds: state.rounds.length,
    finishedAt: state.finishedAt, state,
  });
  storeJSON(LS_HISTORY, hist.slice(0, 20));

  const finished = state;
  state = null; // current game slot is free again
  save();
  showReveal(finished, { quiet: false });
}

function winnerIndex(st, t) {
  let w = 0;
  for (let i = 1; i < t.length; i++) {
    if (st.lowestWins ? t[i] < t[w] : t[i] > t[w]) w = i;
  }
  return w;
}

function showReveal(st, { quiet }) {
  revealShown = st;
  const t = totals(st);
  const w = winnerIndex(st, t);

  $('winner-name').textContent = st.players[w].name;
  $('winner-sub').textContent = T.winnerSub(st.gameName, t[w], st.rounds.length);
  $('rp-title').textContent = `${st.icon} ${T.scoreSheet(st.gameName)}`;

  // ranking for medals
  const order = t.map((v, i) => i).sort((a, b) => (st.lowestWins ? t[a] - t[b] : t[b] - t[a]));
  const medal = {};
  ['🥇', '🥈', '🥉'].forEach((m, r) => { if (order[r] !== undefined) medal[order[r]] = m; });

  const table = $('score-table');
  const head = `<thead><tr><th>#</th>${st.players.map((p) =>
    `<th><span class="th-dot" style="background:${p.color}"></span>${esc(p.name)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${st.rounds.map((r, ri) =>
    `<tr style="animation-delay:${0.9 + ri * 0.12}s"><td class="rlabel">${ri + 1}</td>${r.map((v) =>
      `<td>${v === null ? '—' : v}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const foot = `<tfoot><tr><td class="rlabel">Σ</td>${t.map((v, i) =>
    `<td class="${i === w ? 'win' : ''}">${v}<span class="medal">${medal[i] || ''}</span></td>`).join('')}</tr></tfoot>`;
  table.innerHTML = head + body + foot;

  show('reveal');
  if (!quiet) confettiBurst();
}

$('rematch-btn').onclick = () => {
  if (!revealShown) return;
  const src = revealShown;
  state = {
    ...src,
    sid: null,
    rounds: [],
    entries: Array(src.players.length).fill(null),
    status: 'playing',
    startedAt: Date.now(),
    finishedAt: null,
  };
  save();
  renderTable();
  show('table');
};
$('new-game-btn').onclick = () => {
  renderResume();
  renderHistory();
  show('setup');
};

// ---- confetti -----------------------------------------------------------------

function confettiBurst() {
  const canvas = $('confetti');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth || window.innerWidth;
  const H = canvas.clientHeight || window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#ffd763', '#e05555', '#4d9de0', '#3fa66a', '#f3ead9', '#9b6dd6', '#e8973c'];
  const pieces = Array.from({ length: 170 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.5,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 1.6,
    vy: 2 + Math.random() * 3.2,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    c: colors[(Math.random() * colors.length) | 0],
    sway: Math.random() * 2 * Math.PI,
  }));

  const t0 = performance.now();
  function frame(now) {
    const elapsed = now - t0;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of pieces) {
      p.x += p.vx + Math.sin(p.sway + now / 300) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y < H + 30) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      // fade everything out towards the end
      ctx.globalAlpha = Math.max(0, Math.min(1, (6000 - elapsed) / 1200));
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.sin(p.rot)));
      ctx.restore();
    }
    if (alive && elapsed < 6000) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}

// ====================== INSTALL PROMPT =========================================
// Offer "add to home screen" once: Chromium fires beforeinstallprompt and we
// show a real Install button; iOS Safari never fires it, so show instructions.

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
}

function initInstall() {
  const banner = $('install-banner');
  if (isStandalone() || localStorage.getItem('pisti-install-dismissed')) return;

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    $('install-btn').hidden = false;
    $('install-hint').textContent = T.installHintAndroid;
    banner.hidden = false;
  });

  // iOS Safari: no install API — point at the Share sheet instead.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) {
    $('install-btn').hidden = true;
    $('install-hint').textContent = T.installHintIos;
    banner.hidden = false;
  }

  $('install-btn').onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === 'accepted') banner.hidden = true;
  };
  $('install-dismiss').onclick = () => {
    banner.hidden = true;
    localStorage.setItem('pisti-install-dismissed', '1');
  };
  window.addEventListener('appinstalled', () => { banner.hidden = true; });
}

// ====================== APP UPDATES ============================================
// Reliable updates: register the SW, check for a new version at launch, on
// every re-focus, and periodically. When one is installed and waiting, show
// the update bar; accepting activates it and reloads once.

async function initUpdates() {
  if (!('serviceWorker' in navigator)) return;
  let hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The very first takeover (controller null -> SW claiming the page) is not
    // an update — note it and move on. Every later swap is a real update.
    if (!hadController) {
      hadController = true;
      return;
    }
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  let reg;
  try {
    reg = await navigator.serviceWorker.register(api('/sw.js'));
  } catch (e) {
    console.warn('SW register failed', e);
    return;
  }

  const offerUpdate = (waiting) => {
    if (!waiting) return;
    $('update-bar').hidden = false;
    $('update-btn').onclick = () => {
      $('update-bar').hidden = true;
      waiting.postMessage({ type: 'SKIP_WAITING' });
    };
  };

  if (reg.waiting) offerUpdate(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    });
  });

  const check = () => reg.update().catch(() => {});
  check();
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check();
  });
}

// ====================== BOOT ===================================================

function boot() {
  applyI18n();
  state = loadJSON(LS_CURRENT, null);

  // restore setup UI
  const p = currentPreset();
  $('target-input').value = p.target ?? '';
  $('lowest-wins').checked = p.lowestWins;
  renderPresets();
  renderPlayers();
  renderResume();
  renderHistory();

  if (state && state.status === 'playing') {
    renderTable();
    show('table');
  } else {
    if (state && state.status !== 'playing') { state = null; save(); }
    show('setup');
  }

  initInstall();
  initUpdates();
}

boot();
