'use strict';

// Pisti — points keeper. Single-page app. Solo games live client-side
// (localStorage-first, mirrored to the server); multiplayer games are
// server-authoritative (6-digit lobby code, long-poll sync via /api/mp).

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
    customButtons: 'Özel tuşlar',
    chLabel: 'Etiket', chPts: 'Puan', chEvery: 'her N', chCombo: '→ puan',
    addButton: '+ Tuş ekle',
    players: 'Oyuncular',
    playerN: (n) => `Oyuncu ${n}`,
    rules: 'Kurallar',
    playTo: 'Hedef puan',
    maxRounds: 'El sayısı',
    noLimit: 'sınırsız',
    lowestWins: 'En düşük puan kazanır',
    startMoney: 'Başlangıç parası',
    startBtn: 'Oyunu başlat ▸',
    createLobby: 'Lobi oluştur ▸',
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
    okBtn: 'Tamam',
    // multiplayer
    mpCreateBtn: '🌐 Lobi kur',
    mpJoinBtn: '🔗 Çok oyunculu oyuna katıl',
    modalCreate: 'Lobi kur',
    modalJoin: 'Bir oyuna katıl',
    cancel: 'Vazgeç',
    theme: 'Tema',
    yourName: 'Adın',
    yourNamePh: 'adını yaz',
    joinCodePh: 'oda kodu',
    joinBtn: 'Katıl',
    joinErrNotFound: 'Oda bulunamadı',
    joinErrStarted: 'Oyun çoktan başladı',
    joinErrFull: 'Oda dolu',
    joinErrNet: 'Bağlanılamadı, tekrar dene',
    lobbyTitle: 'Lobi',
    lobbyCodeLabel: 'Oda kodu',
    lobbyHint: 'Arkadaşların bu kodla katılır',
    lobbyStart: 'Oyunu başlat ▸',
    lobbyNeed: 'En az 2 oyuncu gerekli…',
    lobbyWaiting: 'Kurucunun başlatması bekleniyor…',
    lobbyLeave: 'Ayrıl',
    youTag: 'sen',
    hostTag: 'kurucu',
    mpResumeDesc: (g, code) => `${g} · çok oyunculu · oda ${code}`,
    waitOthers: 'Diğerleri bekleniyor…',
    // monopoly
    bank: 'BANKA',
    turnLabel: 'sıra',
    endTurn: '🎲 Sırayı devret',
    sendMoney: '💸 Para gönder',
    fromBank: '🏦 Bankadan al',
    salary: '💵 Maaş +200',
    buyProp: '🏠 Mülk satın al',
    propsAll: '📜 Mülkler',
    jailIn: '🚔 Hapse gir',
    jailOut: '🕊 Hapisten çık',
    send: 'Gönder',
    take: 'Al',
    amountPh: 'tutar',
    toWho: 'Kime?',
    rentNow: 'kira',
    mortgage: 'İpotek',
    unmortgage: 'İpoteği kaldır',
    sellBtn: 'Sat',
    freeProps: 'Satılık mülkler',
    noProps: 'Henüz kimsenin mülkü yok',
    netWorth: 'Servet',
    moneyCol: 'Para',
    propsCol: 'Mülkler',
    monoWinnerSub: (total) => `${total} servetle kazandı`,
    monoSheet: 'Monopoly — hesap defteri',
    utilRent: 'zar × 4 / 10',
    logTurn: (n) => `Sıra: ${n}`,
    // trades
    tradeTile: 'Takas',
    tradePartner: 'Kiminle takas?',
    gives: (n) => `${n} veriyor`,
    sendOffer: 'Teklifi gönder 🤝',
    tradeIncoming: '🤝 Takas teklifi!',
    tradeWaiting: '🤝 Cevap bekleniyor…',
    accept: '✅ Kabul et',
    counterBtn: '✏️ Karşı teklif',
    reject: '❌ Reddet',
    nothing: '—',
    // bankruptcy & property management
    bankruptTile: 'İflas',
    bankruptTitle: 'İflas — geri dönüşü yok!',
    toMarket: '🏪 Mülkler piyasaya dönsün',
    toCreditor: '🤝 Her şeyi bir oyuncuya bırak',
    chooseCreditor: 'Kime kalsın?',
    eliminated: 'oyun dışı',
    disownBtn: 'Bırak ₺0',
    insufficient: 'Yetersiz bakiye!',
    jailTileIn: 'Hapse gir',
    jailTileOut: (n) => `Hapisten çık (${n} el)`,
    priceLbl: 'fiyat',
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
    customButtons: 'Custom buttons',
    chLabel: 'Label', chPts: 'Pts', chEvery: 'every N', chCombo: '→ pts',
    addButton: '+ Add button',
    players: 'Players',
    playerN: (n) => `Player ${n}`,
    rules: 'Rules',
    playTo: 'Play to (points)',
    maxRounds: 'Rounds',
    noLimit: 'no limit',
    lowestWins: 'Lowest score wins',
    startMoney: 'Starting money',
    startBtn: 'Deal me in ▸',
    createLobby: 'Create lobby ▸',
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
    okBtn: 'OK',
    mpCreateBtn: '🌐 Create lobby',
    mpJoinBtn: '🔗 Join a multiplayer game',
    modalCreate: 'Create lobby',
    modalJoin: 'Join a game',
    cancel: 'Cancel',
    theme: 'Theme',
    yourName: 'Your name',
    yourNamePh: 'your name',
    joinCodePh: 'room code',
    joinBtn: 'Join',
    joinErrNotFound: 'Room not found',
    joinErrStarted: 'Game already started',
    joinErrFull: 'Room is full',
    joinErrNet: 'Could not connect, try again',
    lobbyTitle: 'Lobby',
    lobbyCodeLabel: 'Room code',
    lobbyHint: 'Friends join with this code',
    lobbyStart: 'Start game ▸',
    lobbyNeed: 'Need at least 2 players…',
    lobbyWaiting: 'Waiting for the host…',
    lobbyLeave: 'Leave',
    youTag: 'you',
    hostTag: 'host',
    mpResumeDesc: (g, code) => `${g} · multiplayer · room ${code}`,
    waitOthers: 'Waiting for the others…',
    bank: 'BANK',
    turnLabel: 'turn',
    endTurn: '🎲 End turn',
    sendMoney: '💸 Send money',
    fromBank: '🏦 Take from bank',
    salary: '💵 Salary +200',
    buyProp: '🏠 Buy property',
    propsAll: '📜 Properties',
    jailIn: '🚔 Go to jail',
    jailOut: '🕊 Leave jail',
    send: 'Send',
    take: 'Take',
    amountPh: 'amount',
    toWho: 'To whom?',
    rentNow: 'rent',
    mortgage: 'Mortgage',
    unmortgage: 'Unmortgage',
    sellBtn: 'Sell',
    freeProps: 'Properties for sale',
    noProps: 'Nobody owns anything yet',
    netWorth: 'Net worth',
    moneyCol: 'Cash',
    propsCol: 'Property',
    monoWinnerSub: (total) => `wins with a net worth of ${total}`,
    monoSheet: 'Monopoly — ledger',
    utilRent: 'dice × 4 / 10',
    logTurn: (n) => `Turn: ${n}`,
    tradeTile: 'Trade',
    tradePartner: 'Trade with whom?',
    gives: (n) => `${n} gives`,
    sendOffer: 'Send offer 🤝',
    tradeIncoming: '🤝 Trade offer!',
    tradeWaiting: '🤝 Waiting for reply…',
    accept: '✅ Accept',
    counterBtn: '✏️ Counter offer',
    reject: '❌ Reject',
    nothing: '—',
    bankruptTile: 'Bankruptcy',
    bankruptTitle: 'Bankruptcy — no way back!',
    toMarket: '🏪 Properties return to market',
    toCreditor: '🤝 Hand everything to a player',
    chooseCreditor: 'Who gets it all?',
    eliminated: 'eliminated',
    disownBtn: 'Give up ₺0',
    insufficient: 'Insufficient funds!',
    jailTileIn: 'Go to jail',
    jailTileOut: (n) => `Leave jail (${n} left)`,
    priceLbl: 'price',
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

// ---- themes -------------------------------------------------------------
// Four table looks, applied via body[data-theme] + CSS custom properties.

const THEMES = ['yesil', 'mavi', 'bordo', 'gece'];
let THEME = localStorage.getItem('pisti-theme') || 'yesil';
if (!THEMES.includes(THEME)) THEME = 'yesil';

function renderThemeRow() {
  const row = $('theme-row');
  row.innerHTML = '';
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.className = 'theme-swatch t-' + t + (t === THEME ? ' on' : '');
    b.setAttribute('aria-label', t);
    b.onclick = () => {
      THEME = t;
      localStorage.setItem('pisti-theme', t);
      document.body.dataset.theme = t;
      renderThemeRow();
    };
    row.appendChild(b);
  }
}

// ---- game presets -----------------------------------------------------------
// items: the 1-tap entry buttons. {l, v} adds v per tap; an optional combo
// {n, cp} means every n taps of this item score cp instead of n×v
// (e.g. "three 3s = 270": {v: 90, n: 3, cp: 270} or simply v: 90).

const PRESETS = [
  {
    id: 'pisti', name: 'Pişti', icon: '🃏', target: 151, lowestWins: false,
    items: [
      { l: 'Pişti', v: 10 },
      { l: 'Çift Pişti', v: 20 },
      { l: 'Üstünlük', tl2: 'Majority', v: 3 },
      { l: 'As', v: 1 },
      { l: 'Vale', v: 1 },
      { l: '♣ 2', v: 2 },
      { l: '♦ 10', v: 3 },
    ],
  },
  {
    id: 'okey', name: '101 Okey', icon: '🀄', target: null, lowestWins: true,
    items: [
      { l: 'Bitti', v: -101 },
      { l: 'Ceza', v: 101 },
      { l: 'Çifte', v: -202 },
    ],
  },
  {
    id: 'yaniv', name: 'Yaniv', icon: '🎴', target: 200, lowestWins: true,
    items: [
      { l: 'Yaniv', v: 0 },
      { l: 'Asaf', v: 30 },
    ],
  },
  {
    id: 'rummy', name: 'Rummy', icon: '🂡', target: 500, lowestWins: false,
    items: [
      { l: 'Rummy', v: 50 },
      { l: 'Gin', v: 25 },
    ],
  },
  {
    // Card-count punishment game: rank buttons at face value except the
    // honours; the 3s score off a per-count table (1→3, 2→6, 3→90, 4→270).
    id: 'dost', name: 'Dost Kazığı', icon: '🗡️', target: null, lowestWins: true,
    items: [
      { l: 'A', v: 10 },
      { l: '2', v: 2 },
      { l: '3', v: 3, map: [3, 6, 90, 270] },
      { l: '4', v: 4 },
      { l: '5', v: 5 },
      { l: '6', v: 6 },
      { l: '7', v: 7 },
      { l: '8', v: 8 },
      { l: '9', v: 9 },
      { l: '10', v: 10 },
      { l: 'J', v: 25 },
      { l: 'Q', v: 10 },
      { l: 'K', v: 10 },
    ],
  },
  {
    id: 'dice', name: 'Dice', tn: 'Zar', icon: '🎲', target: null, lowestWins: false,
    items: [
      { l: 'Bonus', v: 25 },
      { l: 'Big win', tl: 'Büyük', v: 50 },
      { l: 'Jackpot', v: 100 },
    ],
  },
  {
    id: 'free', name: 'Custom', tn: 'Özel', icon: '✏️', target: null, lowestWins: false,
    items: [
      { l: 'Bonus', v: 10 },
      { l: 'Double', tl: 'Çift', v: 20 },
      { l: 'Penalty', tl: 'Ceza', v: -10 },
    ],
  },
  {
    id: 'monopoly', name: 'Monopoly', icon: '🎩', mode: 'monopoly', items: [],
  },
];

const COLORS = ['#e05555', '#4d9de0', '#3fa66a', '#e0a94d', '#9b6dd6', '#38b6b6', '#d66d9e', '#96a53d'];
const MIN_P = 2, MAX_P = 8;

// ---- Monopoly Türkiye board ---------------------------------------------------
// 22 cities by public vote (Giresun most valuable), classic prices & rents.
// r = rent with [0..4 houses, hotel]. Groups carry house cost + color.

const MGROUPS = {
  brown: { c: '#7a4a21', hc: 50 },
  lblue: { c: '#79c8e0', hc: 50 },
  pink: { c: '#d96a9e', hc: 100 },
  orange: { c: '#e8973c', hc: 100 },
  red: { c: '#c0392b', hc: 150 },
  yellow: { c: '#e0c026', hc: 150 },
  green: { c: '#27824c', hc: 200 },
  dblue: { c: '#2c4e9e', hc: 200 },
  station: { c: '#4a4a52', hc: 0 },
  util: { c: '#8a8a90', hc: 0 },
};

const MPROPS = [
  { id: 'antalya', n: 'Antalya', g: 'brown', p: 60, r: [2, 10, 30, 90, 160, 250] },
  { id: 'bursa', n: 'Bursa', g: 'brown', p: 60, r: [4, 20, 60, 180, 320, 450] },
  { id: 'adana', n: 'Adana', g: 'lblue', p: 100, r: [6, 30, 90, 270, 400, 550] },
  { id: 'kocaeli', n: 'Kocaeli', g: 'lblue', p: 100, r: [6, 30, 90, 270, 400, 550] },
  { id: 'gaziantep', n: 'Gaziantep', g: 'lblue', p: 120, r: [8, 40, 100, 300, 450, 600] },
  { id: 'kastamonu', n: 'Kastamonu', g: 'pink', p: 140, r: [10, 50, 150, 450, 625, 750] },
  { id: 'canakkale', n: 'Çanakkale', g: 'pink', p: 140, r: [10, 50, 150, 450, 625, 750] },
  { id: 'corum', n: 'Çorum', g: 'pink', p: 160, r: [12, 60, 180, 500, 700, 900] },
  { id: 'mersin', n: 'Mersin', g: 'orange', p: 180, r: [14, 70, 200, 550, 750, 950] },
  { id: 'samsun', n: 'Samsun', g: 'orange', p: 180, r: [14, 70, 200, 550, 750, 950] },
  { id: 'erzurum', n: 'Erzurum', g: 'orange', p: 200, r: [16, 80, 220, 600, 800, 1000] },
  { id: 'ordu', n: 'Ordu', g: 'red', p: 220, r: [18, 90, 250, 700, 875, 1050] },
  { id: 'rize', n: 'Rize', g: 'red', p: 220, r: [18, 90, 250, 700, 875, 1050] },
  { id: 'trabzon', n: 'Trabzon', g: 'red', p: 240, r: [20, 100, 300, 750, 925, 1100] },
  { id: 'malatya', n: 'Malatya', g: 'yellow', p: 260, r: [22, 110, 330, 800, 975, 1150] },
  { id: 'elazig', n: 'Elazığ', g: 'yellow', p: 260, r: [22, 110, 330, 800, 975, 1150] },
  { id: 'ankara', n: 'Ankara', g: 'yellow', p: 280, r: [24, 120, 360, 850, 1025, 1200] },
  { id: 'eskisehir', n: 'Eskişehir', g: 'green', p: 300, r: [26, 130, 390, 900, 1100, 1275] },
  { id: 'sivas', n: 'Sivas', g: 'green', p: 300, r: [26, 130, 390, 900, 1100, 1275] },
  { id: 'izmir', n: 'İzmir', g: 'green', p: 320, r: [28, 150, 450, 1000, 1200, 1400] },
  { id: 'istanbul', n: 'İstanbul', g: 'dblue', p: 350, r: [35, 175, 500, 1100, 1300, 1500] },
  { id: 'giresun', n: 'Giresun', g: 'dblue', p: 400, r: [50, 200, 600, 1400, 1700, 2000] },
  { id: 'tramvay', n: 'Tramvay', g: 'station', p: 200 },
  { id: 'havaalani', n: 'Havaalanı', g: 'station', p: 200 },
  { id: 'liman', n: 'Deniz Limanı', g: 'station', p: 200 },
  { id: 'metro', n: 'Metro', g: 'station', p: 200 },
  { id: 'telekom', n: 'Telekom', g: 'util', p: 150 },
  { id: 'dogalgaz', n: 'Doğalgaz', g: 'util', p: 150 },
];
const MPROP = Object.fromEntries(MPROPS.map((p) => [p.id, p]));

const fmtM = (n) => `${Number(n).toLocaleString(T.locale)} ₺`;

// Current rent of a property given the whole props map.
function rentOf(propId, props) {
  const def = MPROP[propId];
  const st = props[propId];
  if (!def || !st || st.mortgaged) return 0;
  if (def.g === 'station') {
    const owned = MPROPS.filter((q) => q.g === 'station' && props[q.id] && props[q.id].owner === st.owner).length;
    return 25 * Math.pow(2, owned - 1);
  }
  if (def.g === 'util') return null; // dice-based; shown as text
  if (st.houses > 0) return def.r[st.houses];
  const groupIds = MPROPS.filter((q) => q.g === def.g).map((q) => q.id);
  const full = groupIds.every((id) => props[id] && props[id].owner === st.owner);
  return full ? def.r[0] * 2 : def.r[0];
}

// ---- persistent state -------------------------------------------------------

const LS_CURRENT = 'pisti-current';
const LS_HISTORY = 'pisti-history';
const LS_SETUP = 'pisti-setup';
const LS_MP = 'pisti-mp';

let state = null;       // the active game (solo or MP mirror), or null
let revealShown = null; // state object currently on the reveal screen
let mpc = null;         // multiplayer credentials {code, playerId, token, version}

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function storeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* full/blocked */ }
}

const itemsOf = (st) => st.items || st.quick || [];
const isMp = () => !!(state && state.mp && mpc);
const myIdx = () => (isMp() ? state.players.findIndex((p) => p.id === mpc.playerId) : -1);
const amHost = () => !isMp() || state.hostId === mpc.playerId;

// ---- solo server sync (best effort, never blocks the UI) ----------------------

let syncTimer = null;
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 800);
}
async function syncNow() {
  if (!state || state.mp) return;
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
  if (!state || !state.mp) scheduleSync();
}

// ---- multiplayer client --------------------------------------------------------

let pollGen = 0; // bumping this stops the current poll loop

async function mpAction(payload) {
  try {
    const r = await fetch(api(`/api/mp/${mpc.code}/action`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: mpc.token, ...payload }),
    });
    return r.ok;
  } catch { return false; }
}

function mpEnter(code, playerId, token, st, version) {
  mpc = { code, playerId, token };
  storeJSON(LS_MP, mpc);
  state = st;
  state.mp = true;
  save();
  mpApply(st, version, true);
  mpPollLoop();
}

function mpLeave() {
  pollGen++;
  mpc = null;
  localStorage.removeItem(LS_MP);
  state = null;
  save();
}

async function mpPollLoop() {
  const gen = ++pollGen;
  let version = 0;
  while (gen === pollGen && mpc) {
    try {
      const ctl = new AbortController();
      const kill = setTimeout(() => ctl.abort(), 35000);
      const r = await fetch(api(`/api/mp/${mpc.code}?since=${version}`), { signal: ctl.signal });
      clearTimeout(kill);
      if (gen !== pollGen) return;
      if (r.status === 404) { mpLeave(); enterSetup(); return; }
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      version = j.version;
      if (j.state) mpApply(j.state, j.version, false);
    } catch {
      if (gen !== pollGen) return;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
}

// Merge a fresh server state and react to transitions.
function mpApply(st, version, first) {
  const prev = state && state.mp ? state : null;
  const prevRounds = prev && prev.status === 'playing' ? prev.rounds.length : null;
  const prevStatus = prev ? prev.status : null;
  st.mp = true;
  state = st;
  storeJSON(LS_CURRENT, state);

  if (st.status === 'lobby') {
    renderLobby();
    show('lobby');
    return;
  }
  if (st.status === 'playing') {
    if ($('screen-table').hidden) show('table');
    renderTable();
    if (prevRounds !== null && st.rounds.length > prevRounds) {
      stamp(T.stamp(st.rounds.length));
    }
    return;
  }
  if (st.status === 'done') {
    pollGen++; // game over: stop polling
    const creds = mpc;
    mpc = null;
    localStorage.removeItem(LS_MP);
    archiveGame(st);
    state = null;
    save();
    showReveal(st, { quiet: prevStatus === null && !first ? true : false });
  }
}

// ---- screens ----------------------------------------------------------------

function show(name) {
  for (const s of ['screen-setup', 'screen-lobby', 'screen-table', 'screen-reveal']) {
    $(s).hidden = s !== `screen-${name}`;
  }
  if (name === 'table') requestAnimationFrame(layoutSeats);
}

function enterSetup() {
  renderResume();
  renderHistory();
  show('setup');
}

// ====================== SETUP ==================================================

const setup = Object.assign(
  { preset: 'pisti', nPlayers: 4, names: [], customItems: null, mp: false, myName: '' },
  loadJSON(LS_SETUP, {})
);
// migrate the pre-combo custom button shape
if (!setup.customItems && setup.customQuick) {
  setup.customItems = setup.customQuick.map((q) => ({ l: q.l, v: q.v, n: 1, cp: 0 }));
}

function currentPreset() { return PRESETS.find((p) => p.id === setup.preset) || PRESETS[0]; }
const presetName = (p) => (LANG === 'tr' && p.tn ? p.tn : p.name);
const iLabel = (q) => (LANG === 'tr' ? (q.tl || q.l) : (q.tl2 || q.l));

function renderPresets() {
  const grid = $('preset-grid');
  grid.innerHTML = '';
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.className = 'preset' + (p.id === setup.preset ? ' on' : '');
    const sub = p.mode === 'monopoly'
      ? '₺ 🏠 🚔'
      : p.items.slice(0, 3).map(iLabel).join(' · ');
    b.innerHTML = `<span class="pi">${p.icon}</span><span class="pn">${presetName(p)}</span>` +
      `<span class="pq">${sub}</span>`;
    b.onclick = () => {
      setup.preset = p.id;
      $('target-input').value = p.target ?? '';
      $('rounds-input').value = '';
      $('lowest-wins').checked = !!p.lowestWins;
      renderPresets();
      saveSetup();
    };
    grid.appendChild(b);
  }
  const isMono = currentPreset().mode === 'monopoly';
  $('custom-editor').hidden = setup.preset !== 'free';
  $('score-rules').hidden = isMono;
  $('mono-rules').hidden = !isMono;
  if (setup.preset === 'free') renderCustomEditor();
}

function customRows() {
  if (!setup.customItems) {
    setup.customItems = PRESETS.find((p) => p.id === 'free').items
      .map((q) => ({ l: iLabel(q), v: q.v, n: 1, cp: 0 }));
  }
  return setup.customItems;
}

function renderCustomEditor() {
  const rows = $('custom-rows');
  const cur = customRows();
  rows.innerHTML = '';
  cur.forEach((q, i) => {
    const row = document.createElement('div');
    row.className = 'crow';
    const mk = (val, ph, num) => {
      const inp = document.createElement('input');
      if (num) { inp.type = 'number'; inp.inputMode = 'numeric'; }
      inp.placeholder = ph;
      inp.value = val === 0 || val === '' ? (val === 0 ? '' : val) : val;
      return inp;
    };
    const lab = mk(q.l, T.chLabel, false); lab.maxLength = 14;
    const val = mk(q.v || '', T.chPts, true);
    const nn = mk(q.n > 1 ? q.n : '', T.chEvery, true);
    const cp = mk(q.cp || '', T.chCombo, true);
    const del = document.createElement('button');
    del.className = 'crow-del';
    del.textContent = '✕';
    del.onclick = () => { cur.splice(i, 1); saveSetup(); renderCustomEditor(); };
    const upd = () => {
      cur[i] = {
        l: lab.value || `B${i + 1}`,
        v: parseInt(val.value, 10) || 0,
        n: Math.max(1, parseInt(nn.value, 10) || 1),
        cp: parseInt(cp.value, 10) || 0,
      };
      saveSetup();
    };
    for (const el of [lab, val, nn, cp]) el.oninput = upd;
    row.append(lab, val, nn, cp, del);
    rows.appendChild(row);
  });
}
$('custom-add').onclick = () => {
  customRows().push({ l: '', v: 0, n: 1, cp: 0 });
  saveSetup();
  renderCustomEditor();
};

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

// Build the game config from the setup form (shared by solo & MP create).
function buildConfig() {
  const p = currentPreset();
  const isMono = p.mode === 'monopoly';
  let items = p.items.map((q) => ({ l: iLabel(q), v: q.v, n: q.n || 1, cp: q.cp || 0, map: q.map || null }));
  if (p.id === 'free') {
    items = customRows().filter((q) => q.l).map((q) => ({ l: q.l, v: q.v, n: q.n || 1, cp: q.cp || 0 }));
  }
  const targetRaw = parseInt($('target-input').value, 10);
  const roundsRaw = parseInt($('rounds-input').value, 10);
  const moneyRaw = parseInt($('money-input').value, 10);
  return {
    mode: isMono ? 'monopoly' : 'score',
    game: p.id,
    gameName: presetName(p),
    icon: p.icon,
    items,
    lowestWins: !isMono && $('lowest-wins').checked,
    target: !isMono && Number.isFinite(targetRaw) && targetRaw > 0 ? targetRaw : null,
    maxRounds: !isMono && Number.isFinite(roundsRaw) && roundsRaw > 0 ? roundsRaw : null,
    startMoney: isMono && Number.isFinite(moneyRaw) && moneyRaw >= 0 ? moneyRaw : 1500,
  };
}

$('start-btn').onclick = () => {
  const c = buildConfig();
  // solo game on this phone
  state = {
    v: 2,
    sid: null,
    ...c,
    players: Array.from({ length: setup.nPlayers }, (_, i) => ({
      name: (setup.names[i] || '').trim() || T.playerN(i + 1),
      color: COLORS[i],
    })),
    rounds: [],
    entries: Array(setup.nPlayers).fill(null),
    status: 'playing',
    monopoly: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
  if (c.mode === 'monopoly') state.monopoly = freshMono(state.players.length, c.startMoney);
  save();
  renderTable();
  show('table');
};

function freshMono(n, startMoney) {
  return {
    money: Array.from({ length: n }, () => startMoney),
    jail: Array.from({ length: n }, () => 0),
    bankrupt: Array.from({ length: n }, () => false),
    props: {},
    trade: null,
    turn: 0,
    log: [],
  };
}

// ---- multiplayer entry: one modal for both "create lobby" and "join" ----

let mpModalMode = 'join';

function openMpModal(mode) {
  mpModalMode = mode;
  $('mp-modal-title').textContent = mode === 'create' ? T.modalCreate : T.modalJoin;
  $('mp-modal-go').textContent = mode === 'create' ? T.createLobby : T.joinBtn;
  $('mp-modal-code-wrap').hidden = mode === 'create';
  $('mp-modal-name').value = setup.myName || '';
  $('mp-modal-code').value = '';
  $('mp-modal-error').hidden = true;
  $('mp-modal').hidden = false;
  $('mp-modal-name').focus();
}
function closeMpModal() { $('mp-modal').hidden = true; }
function mpModalError(msg) {
  const el = $('mp-modal-error');
  el.textContent = msg;
  el.hidden = false;
}
$('mp-create-btn').onclick = () => openMpModal('create');
$('mp-join-btn').onclick = () => openMpModal('join');
$('mp-modal-cancel').onclick = closeMpModal;
$('mp-modal').addEventListener('click', (e) => { if (e.target === $('mp-modal')) closeMpModal(); });

$('mp-modal-go').onclick = async () => {
  const name = $('mp-modal-name').value.trim();
  if (!name) { mpModalError(T.yourNamePh); return; }
  setup.myName = name;
  saveSetup();
  $('mp-modal-go').disabled = true;
  try {
    if (mpModalMode === 'create') {
      const r = await fetch(api('/api/mp/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: buildConfig(), hostName: name }),
      });
      if (!r.ok) throw new Error('create failed');
      const j = await r.json();
      closeMpModal();
      mpEnter(j.code, j.playerId, j.token, j.state, j.version);
    } else {
      const code = $('mp-modal-code').value.trim();
      if (!/^\d{6}$/.test(code)) {
        mpModalError(T.joinErrNotFound);
      } else {
        const r = await fetch(api('/api/mp/join'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, name }),
        });
        if (r.status === 404) mpModalError(T.joinErrNotFound);
        else if (r.status === 409) {
          const j = await r.json().catch(() => ({}));
          mpModalError(j.error === 'full' ? T.joinErrFull : T.joinErrStarted);
        } else if (!r.ok) mpModalError(T.joinErrNet);
        else {
          const j = await r.json();
          closeMpModal();
          mpEnter(j.code, j.playerId, j.token, j.state, j.version);
        }
      }
    }
  } catch {
    mpModalError(T.joinErrNet);
  }
  $('mp-modal-go').disabled = false;
};

function renderResume() {
  const banner = $('resume-banner');
  if (mpc && state && state.mp && state.status !== 'done') {
    banner.hidden = false;
    $('resume-desc').textContent = T.mpResumeDesc(state.gameName, mpc.code);
  } else if (state && !state.mp && state.status === 'playing') {
    banner.hidden = false;
    $('resume-desc').textContent =
      T.resumeDesc(state.gameName, state.rounds.length + 1, state.players.length);
  } else {
    banner.hidden = true;
  }
}
$('resume-btn').onclick = () => {
  if (mpc && state && state.mp) { mpApply(state, 0, true); mpPollLoop(); return; }
  renderTable();
  show('table');
};
$('discard-btn').onclick = () => {
  if (mpc) { mpLeave(); } else { state = null; save(); }
  renderResume();
};

// history of finished games
function archiveGame(st) {
  const t = st.mode === 'monopoly' ? netWorths(st) : totals(st);
  const w = winnerIndex(st, t);
  const hist = loadJSON(LS_HISTORY, []);
  hist.unshift({
    gameName: st.gameName, icon: st.icon,
    winner: st.players[w].name, rounds: st.rounds.length,
    finishedAt: st.finishedAt || Date.now(), state: st,
  });
  storeJSON(LS_HISTORY, hist.slice(0, 20));
}

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

// ====================== LOBBY ==================================================

function renderLobby() {
  $('lobby-game').textContent = `${state.icon} ${state.gameName}`;
  $('lobby-code').textContent = mpc.code;
  const list = $('lobby-players');
  list.innerHTML = '';
  state.players.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'lobby-row';
    const isMe = p.id === mpc.playerId;
    const tags = [];
    if (p.id === state.hostId) tags.push(T.hostTag);
    if (isMe) tags.push(T.youTag);
    row.innerHTML =
      `<span class="pname-chip" style="background:${p.color}">${esc(p.name.charAt(0).toUpperCase())}</span>` +
      `<span class="lobby-name">${esc(p.name)}</span>` +
      `<span class="lobby-tags">${tags.join(' · ')}</span>` +
      (isMe ? '<button class="calc-close lobby-edit">✏️</button>' : '');
    if (isMe) {
      row.querySelector('.lobby-edit').onclick = () => {
        const span = row.querySelector('.lobby-name');
        const inp = document.createElement('input');
        inp.className = 'rename-input';
        inp.maxLength = 16;
        inp.value = p.name;
        span.replaceWith(inp);
        inp.focus();
        inp.select();
        const commit = () => {
          const name = inp.value.trim();
          if (name && name !== p.name) {
            p.name = name;
            setup.myName = name;
            saveSetup();
            mpAction({ type: 'rename', name });
          }
          renderLobby();
        };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
      };
    }
    list.appendChild(row);
  });
  const host = amHost();
  $('lobby-start').hidden = !host;
  $('lobby-waiting').hidden = host;
  if (host) {
    const ok = state.players.length >= 2;
    $('lobby-start').disabled = !ok;
    $('lobby-start').textContent = ok ? T.lobbyStart : T.lobbyNeed;
  }
}
$('lobby-start').onclick = () => mpAction({ type: 'start' });
$('lobby-leave').onclick = () => { mpLeave(); enterSetup(); };

// ====================== TABLE ==================================================

function totals(st) {
  const t = st.players.map(() => 0);
  for (const r of st.rounds) r.forEach((v, i) => { t[i] += v || 0; });
  return t;
}

function renderTable() {
  if (!state) return;
  const mono = state.mode === 'monopoly';
  $('pad').hidden = mono;
  $('mpad').hidden = !mono;
  $('peek-btn').hidden = mono;
  $('mp-code-chip').hidden = !isMp();
  if (isMp()) $('mp-code-chip').textContent = `#${mpc.code}`;
  $('finish-btn').hidden = !amHost();

  if (mono) {
    renderMpad();
  } else {
    $('pad-game').textContent = `${state.icon} ${state.gameName}`;
    $('pad-round-num').textContent = state.maxRounds
      ? `${state.rounds.length + 1}/${state.maxRounds}`
      : state.rounds.length + 1;
    const prog = $('pad-progress');
    prog.innerHTML = '';
    state.entries.forEach((e) => {
      const d = document.createElement('span');
      d.className = 'pp-dot' + (e !== null ? ' done' : '');
      prog.appendChild(d);
    });
    // solo: explicit commit; MP: the server advances automatically
    $('commit-round').hidden = isMp() || !state.entries.every((e) => e !== null);
  }
  renderSeats();
}

function renderMpad() {
  ensureMonoLocal();
  const m = state.monopoly;
  if (!m) return;
  const turnP = state.players[m.turn];
  $('mpad-turn').textContent = turnP ? turnP.name : '';
  $('mpad-turn').style.color = turnP ? turnP.color : '';
  // everyone passes only their own turn in MP; solo (one phone) passes all
  $('mpad-endturn').hidden = isMp() && m.turn !== myIdx();

  // pending trade indicator
  const tbtn = $('mpad-trade');
  if (m.trade) {
    const iDecide = !isMp() || m.trade.decider === myIdx();
    const involved = !isMp() || m.trade.from === myIdx() || m.trade.to === myIdx();
    tbtn.hidden = false;
    tbtn.textContent = iDecide ? T.tradeIncoming : T.tradeWaiting;
    tbtn.classList.toggle('urgent', iDecide);
    tbtn.onclick = () => {
      if (!involved && isMp()) return;
      openMono('trade-review', { actor: isMp() ? myIdx() : m.trade.decider });
    };
  } else {
    tbtn.hidden = true;
  }
  $('mpad-log').innerHTML = m.log.slice(0, 3).map((l) => `<div>${esc(logLine(l))}</div>`).join('');
}

function logLine(l) {
  const nm = (i) => (i === 'bank' ? T.bank : (state.players[i] ? state.players[i].name : '?'));
  const pn = (id) => (MPROP[id] ? MPROP[id].n : id);
  switch (l.op) {
    case 'transfer': return `${nm(l.from)} → ${nm(l.to)}: ${fmtM(l.amount)}`;
    case 'buy': return `${nm(l.player)} 🏠 ${pn(l.propId)} (${fmtM(l.amount)})`;
    case 'sell': return `${nm(l.player)} ✂️ ${pn(l.propId)} (+${fmtM(l.amount)})`;
    case 'house': return `${pn(l.propId)}: ${l.houses >= 5 ? '🏨' : '🏠×' + l.houses}`;
    case 'mortgage': return `${pn(l.propId)}: ${l.on ? '🔒' : '🔓'} ${fmtM(l.amount)}`;
    case 'jail': return `${nm(l.player)} ${l.on ? '🚔' : '🕊'}`;
    case 'turn': return T.logTurn(nm(l.player));
    case 'disown': return `${nm(l.player)} 🗑 ${pn(l.propId)}`;
    case 'bankrupt': return `${nm(l.player)} 💀${l.creditor != null ? ' → ' + nm(l.creditor) : ''}`;
    case 'trade': return `🤝 ${nm(l.player)} → ${nm(l.to)}`;
    case 'tradeDone': return `🤝✅ ${nm(l.player)} ⇄ ${nm(l.to)}`;
    case 'tradeOff': return `🤝❌`;
    default: return '';
  }
}

const jailNum = (v) => (typeof v === 'number' ? Math.max(0, v) : (v ? 3 : 0));
const isDead = (m, i) => !!(m && m.bankrupt && m.bankrupt[i]);

// Older saved games predate numeric jail / bankrupt / trade — coerce in place.
function ensureMonoLocal() {
  const m = state && state.monopoly;
  if (!m) return;
  if (!Array.isArray(m.bankrupt)) m.bankrupt = state.players.map(() => false);
  m.jail = m.jail.map(jailNum);
  if (m.trade === undefined) m.trade = null;
}

function renderSeats() {
  const wrap = $('seats');
  wrap.innerHTML = '';
  const mono = state.mode === 'monopoly';
  const m = state.monopoly;
  const me = myIdx();
  state.players.forEach((p, i) => {
    const seat = document.createElement('button');
    let cls = 'seat';
    if (!mono) cls += state.entries[i] !== null ? ' entered' : ' pending';
    if (mono && m && m.turn === i && !isDead(m, i)) cls += ' turn';
    if (mono && isDead(m, i)) cls += ' dead';
    if (isMp() && i === me) cls += ' me';
    seat.className = cls;
    seat.style.setProperty('--pc', p.color);
    let badge = '';
    if (mono && m) {
      if (isDead(m, i)) badge = '<span class="seat-jail">💀</span>';
      else if (jailNum(m.jail[i]) > 0) badge = `<span class="seat-jail">🚔<b>${jailNum(m.jail[i])}</b></span>`;
    } else if (!mono) {
      badge = `<span class="seat-card">${state.entries[i] !== null ? '✓' : ''}</span>`;
    }
    const sub = mono && m
      ? `<span class="seat-money">${isDead(m, i) ? T.eliminated : fmtM(m.money[i])}</span>`
      : '';
    // simple geometric figure: circle head over a stadium body
    seat.innerHTML =
      `<span class="seat-fig"><span class="fig-head"></span>` +
      `<span class="fig-body">${esc(p.name.charAt(0).toUpperCase())}</span>${badge}</span>` +
      `<span class="seat-name">${esc(p.name)}</span>` + sub;
    seat.onclick = () => onSeatTap(i);
    wrap.appendChild(seat);
  });
  layoutSeats();
}

function onSeatTap(i) {
  if (state.status !== 'playing') return;
  if (state.mode === 'monopoly') {
    ensureMonoLocal();
    if (isDead(state.monopoly, i)) return;
    if (isMp() && myIdx() >= 0 && isDead(state.monopoly, myIdx())) return; // spectating
    if (isMp() && i !== myIdx()) {
      openMono('transfer', { actor: myIdx(), to: i });
    } else {
      openMono('menu', { actor: isMp() ? myIdx() : i });
    }
    return;
  }
  // score mode: in MP you only enter your own score
  if (isMp() && i !== myIdx()) return;
  openEntry(i);
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
  const shift = isMp() ? Math.max(0, myIdx()) : 0; // my seat at the bottom
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (2 * Math.PI * ((i - shift + n) % n)) / n;
    // superellipse (squircle) so seats hug the rounded-rectangle felt
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const x = cx + rx * Math.sign(cosA) * Math.pow(Math.abs(cosA), 0.5);
    const y = cy + ry * Math.sign(sinA) * Math.pow(Math.abs(sinA), 0.5);
    seats[i].style.left = `${x}px`;
    seats[i].style.top = `${y}px`;
  }
}
window.addEventListener('resize', layoutSeats);

// round commit (solo only; the server advances MP rounds)
$('commit-round').onclick = () => {
  if (!state || isMp() || !state.entries.every((e) => e !== null)) return;
  const n = state.rounds.length + 1;
  state.rounds.push(state.entries);
  state.entries = Array(state.players.length).fill(null);
  save();
  stamp(T.stamp(n));
  renderTable();

  const t = totals(state);
  const roundsDone = state.maxRounds && state.rounds.length >= state.maxRounds;
  const targetHit = state.target && t.some((v) => v >= state.target);
  if (roundsDone || targetHit) setTimeout(finishGame, 950);
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
    if (!state || state.mode === 'monopoly') return;
    const t = totals(state);
    sheet.innerHTML = state.players
      .map((p, i) => `<div class="pk-row"><span>${esc(p.name)}</span><b>${t[i]}</b></div>`)
      .join('');
    sheet.hidden = false;
  };
  const hidePeek = () => { sheet.hidden = true; };
  btn.addEventListener('pointerdown', showPeek);
  btn.addEventListener('pointerup', hidePeek);
  btn.addEventListener('pointercancel', hidePeek);
  btn.addEventListener('pointerleave', hidePeek);
}

$('home-btn').onclick = () => {
  if (isMp()) pollGen++; // pause polling; resume banner brings it back
  enterSetup();
};

// finish: double-tap guard instead of a dialog
{
  let armed = 0;
  $('finish-btn').onclick = () => {
    if (Date.now() - armed < 2500) {
      $('finish-btn').textContent = T.finishBtn;
      if (isMp()) mpAction({ type: 'finish' });
      else finishGame();
    } else {
      armed = Date.now();
      $('finish-btn').textContent = T.finishSure;
      setTimeout(() => { $('finish-btn').textContent = T.finishBtn; }, 2500);
    }
  };
}
$('mpad-endturn').onclick = () => monoDo({ op: 'turn' });

// ====================== ENTRY PAD (primary input) ===============================
// One tap per event: tap "Pişti" twice and the sheet knows it's +20. Combo
// items ("every N taps → P points") are computed live.

const entry = { player: -1, taps: [] };

function entryItems() { return itemsOf(state); }

function entryTotal() {
  const counts = {};
  for (const idx of entry.taps) counts[idx] = (counts[idx] || 0) + 1;
  let sum = 0;
  for (const [idx, c] of Object.entries(counts)) {
    const it = entryItems()[idx];
    if (!it) continue;
    if (Array.isArray(it.map) && it.map.length) {
      // exact score per tap count; beyond the table, extend linearly with v
      sum += c <= it.map.length
        ? it.map[c - 1]
        : it.map[it.map.length - 1] + (c - it.map.length) * it.v;
    } else if (it.n > 1 && it.cp) {
      sum += Math.floor(c / it.n) * it.cp + (c % it.n) * it.v;
    } else {
      sum += c * it.v;
    }
  }
  return sum;
}

function openEntry(playerIdx) {
  entry.player = playerIdx;
  entry.taps = [];
  renderEntryHead();
  const grid = $('entry-items');
  grid.innerHTML = '';
  entryItems().forEach((it, idx) => {
    const b = document.createElement('button');
    b.className = 'ecard';
    let comboHint = '';
    if (Array.isArray(it.map) && it.map.length) comboHint = `<small class="ec-combo">${it.map.join('/')}</small>`;
    else if (it.n > 1 && it.cp) comboHint = `<small class="ec-combo">${it.n}× = ${it.cp}</small>`;
    b.innerHTML = `<span class="ec-count" hidden>0</span><span class="ec-label">${esc(it.l)}</span>` +
      `<small class="ec-v">${it.v >= 0 ? '+' : ''}${it.v}</small>${comboHint}`;
    b.onclick = () => {
      entry.taps.push(idx);
      b.classList.remove('pop');
      void b.offsetWidth;
      b.classList.add('pop');
      renderEntry();
    };
    grid.appendChild(b);
  });
  renderEntry();
  $('entry-overlay').hidden = false;
}

function renderEntryHead() {
  const p = state.players[entry.player];
  $('entry-player').innerHTML =
    `<span class="cp-dot" style="background:${p.color}"></span>${esc(p.name)} — ${T.calcRound(state.rounds.length + 1)}`;
}

function renderEntry() {
  $('entry-total').textContent = entryTotal();
  const counts = {};
  for (const idx of entry.taps) counts[idx] = (counts[idx] || 0) + 1;
  const items = entryItems();
  $('entry-tape').textContent = Object.entries(counts)
    .map(([idx, c]) => `${items[idx].l}×${c}`)
    .join(' · ');
  [...$('entry-items').children].forEach((b, idx) => {
    const c = counts[idx] || 0;
    const badge = b.querySelector('.ec-count');
    badge.hidden = c === 0;
    badge.textContent = c;
  });
}

$('entry-clear').onclick = () => { entry.taps = []; renderEntry(); };
$('entry-undo').onclick = () => { entry.taps.pop(); renderEntry(); };
$('entry-ok').onclick = () => { commitEntry(entry.player, entryTotal()); closeEntry(); };
$('entry-close').onclick = closeEntry;
$('entry-overlay').addEventListener('click', (e) => { if (e.target === $('entry-overlay')) closeEntry(); });
function closeEntry() { $('entry-overlay').hidden = true; }

// switch to the calculator for free-form numbers
$('entry-calc').onclick = () => {
  closeEntry();
  openCalc(entry.player, entryTotal());
};

// rename right from the entry sheet; applies to the running game and is
// remembered for the next one
$('entry-rename').onclick = () => {
  const p = state.players[entry.player];
  const head = $('entry-player');
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
      if (isMp()) {
        setup.myName = name;
        mpAction({ type: 'rename', name });
      } else {
        setup.names[entry.player] = name;
      }
      saveSetup();
      save();
      renderSeats();
    }
    renderEntryHead();
  };
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
};

// Commit a player's score for the current round (solo or MP).
function commitEntry(playerIdx, value) {
  if (isMp()) {
    state.entries[playerIdx] = value; // optimistic; server confirms via poll
    renderTable();
    mpAction({ type: 'entry', value });
    return;
  }
  state.entries[playerIdx] = value;
  save();
  renderTable();
}

// ====================== CALCULATOR (secondary) ==================================

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

function openCalc(playerIdx, seed) {
  calc.player = playerIdx;
  calc.terms = seed ? [{ v: seed }] : [];
  calc.typed = '';
  calc.neg = false;
  renderCalcHead();

  const qr = $('quick-row');
  qr.innerHTML = '';
  for (const q of itemsOf(state)) {
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

function closeCalc() { $('calc-overlay').hidden = true; }
$('calc-close').onclick = closeCalc;
$('calc-back').onclick = () => { closeCalc(); openEntry(calc.player); };
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
        commitEntry(calc.player, calcTotal());
        closeCalc();
        return;
      }
    }
  }
  renderCalc();
});

// ====================== MONOPOLY ================================================

// Apply a ledger op locally. Mirrors server/mp.js applyMono minus permission
// checks (the UI only offers legal actions; the server re-checks in MP).
// Keep the two in sync. Returns an error string to show, or null.
function applyMonoLocal(a) {
  ensureMonoLocal();
  const m = state.monopoly;
  const n = state.players.length;
  const amt = Math.floor(Math.abs(a.amount || 0));
  const mlog = (entry) => {
    m.log.unshift({ ...entry, at: Date.now() });
    if (m.log.length > 10) m.log.length = 10;
  };
  const nextTurn = () => {
    for (let k = 1; k <= n; k++) {
      const t = (m.turn + k) % n;
      if (!m.bankrupt[t]) return t;
    }
    return m.turn;
  };
  switch (a.op) {
    case 'transfer': {
      if (!amt) return T.insufficient;
      if (a.from !== 'bank' && m.money[a.from] < amt) return T.insufficient;
      if (a.from !== 'bank') m.money[a.from] -= amt;
      if (a.to !== 'bank') m.money[a.to] += amt;
      mlog({ op: 'transfer', from: a.from, to: a.to, amount: amt });
      return null;
    }
    case 'buy': {
      if (m.props[a.propId]) return null;
      const price = Math.floor(a.price || 0);
      if (m.money[a.player] < price) return T.insufficient;
      m.props[a.propId] = { owner: a.player, houses: 0, mortgaged: false };
      m.money[a.player] -= price;
      mlog({ op: 'buy', player: a.player, propId: a.propId, amount: price });
      return null;
    }
    case 'sell': {
      const p = m.props[a.propId];
      if (!p || p.houses > 0) return null;
      delete m.props[a.propId];
      m.money[p.owner] += Math.floor(a.refund || 0);
      mlog({ op: 'sell', player: p.owner, propId: a.propId, amount: Math.floor(a.refund || 0) });
      return null;
    }
    case 'disown': {
      // back to the market, no cashback
      const p = m.props[a.propId];
      if (!p || p.houses > 0) return null;
      delete m.props[a.propId];
      mlog({ op: 'disown', player: p.owner, propId: a.propId });
      return null;
    }
    case 'house': {
      const p = m.props[a.propId];
      if (!p) return null;
      const delta = a.delta > 0 ? 1 : -1;
      const next = p.houses + delta;
      if (next < 0 || next > 5) return null;
      const cost = Math.floor(a.cost || 0);
      if (delta > 0) {
        if (m.money[p.owner] < cost) return T.insufficient;
        m.money[p.owner] -= cost;
      } else {
        m.money[p.owner] += Math.floor(cost / 2); // demolition refunds 50%
      }
      p.houses = next;
      mlog({ op: 'house', player: p.owner, propId: a.propId, houses: next });
      return null;
    }
    case 'mortgage': {
      const p = m.props[a.propId];
      if (!p || !!p.mortgaged === !!a.on) return null;
      const value = Math.floor(a.value || 0);
      if (!a.on && m.money[p.owner] < value) return T.insufficient;
      p.mortgaged = !!a.on;
      m.money[p.owner] += a.on ? value : -value;
      mlog({ op: 'mortgage', player: p.owner, propId: a.propId, on: !!a.on, amount: value });
      return null;
    }
    case 'jail': {
      m.jail[a.player] = a.on ? 3 : 0;
      mlog({ op: 'jail', player: a.player, on: !!a.on });
      return null;
    }
    case 'turn': {
      if (m.jail[m.turn] > 0) m.jail[m.turn]--; // a pass counts a jail round
      m.turn = nextTurn();
      mlog({ op: 'turn', player: m.turn });
      return null;
    }
    case 'bankrupt': {
      const who = a.player;
      const creditor = Number.isInteger(a.creditor) ? a.creditor : null;
      for (const [id, p] of Object.entries(m.props)) {
        if (p.owner !== who) continue;
        if (creditor !== null) { p.owner = creditor; p.houses = 0; }
        else delete m.props[id];
      }
      if (creditor !== null) m.money[creditor] += m.money[who];
      m.money[who] = 0;
      m.jail[who] = 0;
      m.bankrupt[who] = true;
      if (m.trade && (m.trade.from === who || m.trade.to === who)) m.trade = null;
      if (m.turn === who) m.turn = nextTurn();
      mlog({ op: 'bankrupt', player: who, creditor });
      return null;
    }
    case 'tradeOffer': {
      if (m.trade) return null;
      if (a.give.money > m.money[a.from]) return T.insufficient;
      m.trade = { from: a.from, to: a.to, give: a.give, want: a.want, decider: a.to };
      mlog({ op: 'trade', player: a.from, to: a.to });
      return null;
    }
    case 'tradeCounter': {
      const t = m.trade;
      if (!t) return null;
      t.give = a.give;
      t.want = a.want;
      t.decider = t.decider === t.from ? t.to : t.from;
      mlog({ op: 'trade', player: t.decider === t.from ? t.to : t.from, to: t.decider });
      return null;
    }
    case 'tradeAccept': {
      const t = m.trade;
      if (!t) return null;
      const fromNet = t.want.money - t.give.money;
      const toNet = t.give.money - t.want.money;
      if (m.money[t.from] + fromNet < 0 || m.money[t.to] + toNet < 0) return T.insufficient;
      for (const id of t.give.props) if (m.props[id]) m.props[id].owner = t.to;
      for (const id of t.want.props) if (m.props[id]) m.props[id].owner = t.from;
      m.money[t.from] += fromNet;
      m.money[t.to] += toNet;
      m.trade = null;
      mlog({ op: 'tradeDone', player: t.from, to: t.to });
      return null;
    }
    case 'tradeReject': {
      m.trade = null;
      mlog({ op: 'tradeOff', player: a.player ?? 0 });
      return null;
    }
  }
  return null;
}

function solventLocal() {
  const m = state.monopoly;
  return state.players.filter((_, i) => !m.bankrupt[i]).length;
}

// Run a monopoly op: apply locally (optimistic in MP), sync to the server in
// MP, and end the game when a bankruptcy leaves one player standing.
function monoDo(a) {
  if (!state || state.status !== 'playing' || !state.monopoly) return 'not playing';
  const err = applyMonoLocal(a);
  if (err) { monoToast(err); return err; }
  save();
  renderTable();
  if (mono.open) renderMono();
  if (isMp()) mpAction({ type: 'mono', ...a });
  else if (solventLocal() <= 1 && state.players.length > 1) setTimeout(finishGame, 700);
  return null;
}

function monoToast(msg) {
  const sheet = document.querySelector('.mono-sheet');
  if (!sheet) return;
  let t = sheet.querySelector('.mono-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'mono-toast';
    sheet.appendChild(t);
  }
  t.textContent = msg;
  t.classList.remove('go');
  void t.offsetWidth;
  t.classList.add('go');
}

// ---- monopoly action sheet ----

const mono = { open: false, view: 'menu', actor: 0, to: null, back: null, sel: null, draft: null };

function openMono(view, opts = {}) {
  mono.open = true;
  mono.view = view;
  if (opts.actor !== undefined) mono.actor = opts.actor;
  mono.to = opts.to ?? null;
  mono.back = opts.back ?? null;
  mono.sel = null;
  if (opts.draft !== undefined) mono.draft = opts.draft;
  renderMono();
  $('mono-overlay').hidden = false;
}
function closeMono() {
  mono.open = false;
  $('mono-overlay').hidden = true;
  const t = document.querySelector('.mono-toast'); // don't let it linger on reopen
  if (t) t.remove();
}
$('mono-close').onclick = closeMono;
$('mono-overlay').addEventListener('click', (e) => { if (e.target === $('mono-overlay')) closeMono(); });
$('mono-back').onclick = () => { if (mono.back) openMono(mono.back, { actor: mono.actor }); };

function renderMono() {
  ensureMonoLocal();
  const m = state.monopoly;
  const a = mono.actor;
  const p = state.players[a];
  if (!p) { closeMono(); return; }
  $('mono-title').innerHTML =
    `<span class="cp-dot" style="background:${p.color}"></span>${esc(p.name)} · <b>${fmtM(m.money[a])}</b>`;
  $('mono-back').hidden = !mono.back;
  const body = $('mono-body');
  body.innerHTML = '';

  if (mono.view === 'menu') renderMonoMenu(body, a);
  else if (mono.view === 'transfer') renderMonoTransfer(body, a);
  else if (mono.view === 'buy') renderMonoBuy(body, a);
  else if (mono.view === 'props') renderMonoProps(body, a);
  else if (mono.view === 'trade-partner') renderMonoTradePartner(body, a);
  else if (mono.view === 'trade-build') renderMonoTradeBuild(body, a);
  else if (mono.view === 'trade-review') renderMonoTradeReview(body, a);
  else if (mono.view === 'bankrupt') renderMonoBankrupt(body, a);
}

// leading emoji lives on the tile itself; strip it off the i18n string
const noEmo = (s) => s.replace(/^[^\p{L}]+/u, '');

function tile(emoji, label, cb, cls = '') {
  const b = document.createElement('button');
  b.className = 'mono-tile' + (cls ? ' ' + cls : '');
  b.innerHTML = `<span class="mt-emoji">${emoji}</span><span class="mt-label">${esc(label)}</span>`;
  b.onclick = cb;
  return b;
}

function alivePlayers() {
  const m = state.monopoly;
  return state.players.map((p, i) => ({ p, i })).filter(({ i }) => !isDead(m, i));
}

function renderMonoMenu(body, a) {
  const m = state.monopoly;
  const jailed = jailNum(m.jail[a]) > 0;
  const grid = document.createElement('div');
  grid.className = 'mono-grid';
  grid.append(
    tile('💸', noEmo(T.sendMoney), () => openMono('transfer', { actor: a, back: 'menu' })),
    tile('🏦', noEmo(T.fromBank), () => openMono('transfer', { actor: a, to: a, back: 'menu' })),
    tile('💵', noEmo(T.salary), () => { monoDo({ op: 'transfer', from: 'bank', to: a, amount: 200 }); closeMono(); }),
    tile('🏠', noEmo(T.buyProp), () => openMono('buy', { actor: a, back: 'menu' })),
    tile('📜', noEmo(T.propsAll), () => openMono('props', { actor: a, back: 'menu' })),
    tile('🤝', T.tradeTile, () => {
      if (m.trade) openMono('trade-review', { actor: a, back: 'menu' });
      else openMono('trade-partner', { actor: a, back: 'menu' });
    }),
    tile(jailed ? '🕊' : '🚔', jailed ? T.jailTileOut(jailNum(m.jail[a])) : T.jailTileIn, () => {
      monoDo({ op: 'jail', player: a, on: !jailed });
      closeMono();
    }),
    tile('💀', T.bankruptTile, () => openMono('bankrupt', { actor: a, back: 'menu' }), 'danger')
  );
  body.appendChild(grid);
}

// ---- deed cards ----

function deedEl(def, ps, opts = {}) {
  const b = document.createElement('button');
  b.className = 'deed' + (ps && ps.mortgaged ? ' mort' : '') + (opts.sel ? ' sel' : '');
  const g = MGROUPS[def.g];
  const houses = ps ? (ps.houses >= 5 ? '🏨' : '🏠'.repeat(ps.houses)) : '';
  let info = '';
  if (opts.price) {
    info = fmtM(def.p);
  } else if (ps) {
    if (ps.mortgaged) info = '🔒';
    else if (def.g === 'util') info = T.utilRent;
    else info = `${T.rentNow} ${fmtM(rentOf(def.id, state.monopoly.props))}`;
  }
  b.innerHTML =
    `<span class="deed-band" style="background:${g.c}"></span>` +
    `<span class="deed-name">${esc(def.n)}</span>` +
    `<span class="deed-info">${info}</span>` +
    `<span class="deed-houses">${houses}</span>`;
  if (opts.onTap) b.onclick = opts.onTap;
  return b;
}

function deedGrid(cls = '') {
  const g = document.createElement('div');
  g.className = 'deed-grid' + (cls ? ' ' + cls : '');
  return g;
}

// Transfer view. mono.to === actor means "take from bank"; otherwise pick a
// recipient (bank or another player) and send from the actor's pocket.
function renderMonoTransfer(body, a) {
  const taking = mono.to === a;
  const label = document.createElement('div');
  label.className = 'mono-label';
  label.textContent = taking ? T.fromBank : T.toWho;
  body.appendChild(label);

  let selected = taking ? 'bank' : mono.to;
  const chips = document.createElement('div');
  chips.className = 'mono-chips';
  const options = taking
    ? [['bank', T.bank, '#8a7452']]
    : [['bank', T.bank, '#8a7452'],
       ...alivePlayers().map(({ p, i }) => [i, p.name, p.color]).filter(([i]) => i !== a)];
  const chipEls = new Map();
  for (const [val, name, color] of options) {
    const c = document.createElement('button');
    c.className = 'mono-chip';
    c.innerHTML = `<span class="cp-dot" style="background:${color}"></span>${esc(name)}`;
    c.onclick = () => {
      selected = val;
      for (const el of chipEls.values()) el.classList.remove('on');
      c.classList.add('on');
    };
    chipEls.set(val, c);
    chips.appendChild(c);
  }
  if (selected !== null && chipEls.has(selected)) chipEls.get(selected).classList.add('on');
  else if (options.length === 1) { selected = options[0][0]; chipEls.get(selected).classList.add('on'); }
  body.appendChild(chips);

  const row = document.createElement('div');
  row.className = 'mono-amount-row';
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.inputMode = 'numeric';
  inp.placeholder = T.amountPh;
  inp.className = 'mono-amount';
  row.appendChild(inp);
  body.appendChild(row);

  const quicks = document.createElement('div');
  quicks.className = 'mono-chips';
  for (const q of [10, 50, 100, 200, 500]) {
    const b = document.createElement('button');
    b.className = 'mono-chip';
    b.textContent = `+${q}`;
    b.onclick = () => { inp.value = (parseInt(inp.value, 10) || 0) + q; };
    quicks.appendChild(b);
  }
  body.appendChild(quicks);

  const go = document.createElement('button');
  go.className = 'btn btn-start mono-send';
  go.textContent = taking ? T.take : T.send;
  go.onclick = () => {
    const amount = parseInt(inp.value, 10) || 0;
    if (!amount || selected === null) return;
    // never let a balance go negative — shake instead
    if (!taking && state.monopoly.money[a] < amount) {
      inp.classList.remove('shake');
      void inp.offsetWidth;
      inp.classList.add('shake');
      monoToast(T.insufficient);
      return;
    }
    const err = taking
      ? monoDo({ op: 'transfer', from: 'bank', to: a, amount })
      : monoDo({ op: 'transfer', from: a, to: selected, amount });
    if (!err) closeMono();
  };
  body.appendChild(go);
}

function renderMonoBuy(body, a) {
  const m = state.monopoly;
  const label = document.createElement('div');
  label.className = 'mono-label';
  label.textContent = `${T.freeProps} · ${T.priceLbl}`;
  body.appendChild(label);
  const grid = deedGrid();
  for (const def of MPROPS.filter((p) => !m.props[p.id])) {
    grid.appendChild(deedEl(def, null, {
      price: true,
      onTap: () => {
        if (m.money[a] < def.p) { monoToast(T.insufficient); return; }
        monoDo({ op: 'buy', player: a, propId: def.id, price: def.p });
      },
    }));
  }
  body.appendChild(grid);
}

function renderMonoProps(body, a) {
  const m = state.monopoly;
  const byOwner = new Map();
  for (const [id, ps] of Object.entries(m.props)) {
    if (!byOwner.has(ps.owner)) byOwner.set(ps.owner, []);
    byOwner.get(ps.owner).push(id);
  }
  if (byOwner.size === 0) {
    const label = document.createElement('div');
    label.className = 'mono-label';
    label.textContent = T.noProps;
    body.appendChild(label);
    return;
  }
  const boardOrder = (x, y) =>
    MPROPS.findIndex((p) => p.id === x) - MPROPS.findIndex((p) => p.id === y);
  for (const [owner, ids] of [...byOwner.entries()].sort((x, y) => x[0] - y[0])) {
    const op = state.players[owner];
    const head = document.createElement('div');
    head.className = 'mono-owner';
    head.innerHTML = `<span class="cp-dot" style="background:${op.color}"></span>${esc(op.name)}`;
    body.appendChild(head);
    const mine = !isMp() ? owner === a : (owner === myIdx() || amHost());
    const grid = deedGrid();
    for (const id of ids.sort(boardOrder)) {
      const def = MPROP[id];
      const ps = m.props[id];
      grid.appendChild(deedEl(def, ps, {
        sel: mono.sel === id,
        onTap: mine ? () => { mono.sel = mono.sel === id ? null : id; renderMono(); } : null,
      }));
    }
    body.appendChild(grid);
    // controls for the selected own deed
    if (mine && mono.sel && ids.includes(mono.sel)) {
      const id = mono.sel;
      const def = MPROP[id];
      const ps = m.props[id];
      const hc = MGROUPS[def.g].hc;
      const bar = document.createElement('div');
      bar.className = 'mp-controls';
      if (hc && !ps.mortgaged) {
        const plus = document.createElement('button');
        plus.className = 'mono-chip';
        plus.textContent = `+🏠 −${fmtM(hc)}`;
        plus.onclick = () => monoDo({ op: 'house', propId: id, delta: 1, cost: hc });
        const minus = document.createElement('button');
        minus.className = 'mono-chip';
        minus.textContent = `−🏠 +${fmtM(Math.floor(hc / 2))}`;
        minus.onclick = () => monoDo({ op: 'house', propId: id, delta: -1, cost: hc });
        bar.append(plus, minus);
      }
      if (ps.houses === 0) {
        const mort = document.createElement('button');
        mort.className = 'mono-chip';
        mort.textContent = (ps.mortgaged ? T.unmortgage : T.mortgage) + ` ${fmtM(def.p / 2)}`;
        mort.onclick = () => monoDo({ op: 'mortgage', propId: id, on: !ps.mortgaged, value: def.p / 2 });
        bar.append(mort);
        if (!ps.mortgaged) {
          const sell = document.createElement('button');
          sell.className = 'mono-chip';
          sell.textContent = `${T.sellBtn} +${fmtM(def.p)}`;
          sell.onclick = () => { mono.sel = null; monoDo({ op: 'sell', propId: id, refund: def.p }); };
          const dis = document.createElement('button');
          dis.className = 'mono-chip mc-danger';
          dis.textContent = T.disownBtn;
          dis.onclick = () => { mono.sel = null; monoDo({ op: 'disown', propId: id }); };
          bar.append(sell, dis);
        }
      }
      body.appendChild(bar);
    }
  }
}

// ---- trades ----

function renderMonoTradePartner(body, a) {
  const label = document.createElement('div');
  label.className = 'mono-label';
  label.textContent = T.tradePartner;
  body.appendChild(label);
  const chips = document.createElement('div');
  chips.className = 'mono-chips';
  for (const { p, i } of alivePlayers()) {
    if (i === a) continue;
    const c = document.createElement('button');
    c.className = 'mono-chip';
    c.innerHTML = `<span class="cp-dot" style="background:${p.color}"></span>${esc(p.name)}`;
    c.onclick = () => openMono('trade-build', {
      actor: a,
      back: 'trade-partner',
      draft: { from: a, to: i, give: { props: [], money: 0 }, want: { props: [], money: 0 }, counter: false },
    });
    chips.appendChild(c);
  }
  body.appendChild(chips);
}

// One side of the trade builder: the owner's tradable deeds (no houses) as a
// multi-select grid plus a money input.
function tradeSideEl(body, ownerIdx, side) {
  const m = state.monopoly;
  const p = state.players[ownerIdx];
  const head = document.createElement('div');
  head.className = 'mono-owner';
  head.innerHTML = `<span class="cp-dot" style="background:${p.color}"></span>${esc(T.gives(p.name))}`;
  body.appendChild(head);
  const grid = deedGrid('trade');
  const ids = Object.entries(m.props)
    .filter(([, ps]) => ps.owner === ownerIdx && ps.houses === 0)
    .map(([id]) => id);
  for (const id of ids) {
    const def = MPROP[id];
    const ps = m.props[id];
    const el = deedEl(def, ps, {
      sel: side.props.includes(id),
      onTap: () => {
        const at = side.props.indexOf(id);
        if (at >= 0) side.props.splice(at, 1);
        else side.props.push(id);
        renderMono();
      },
    });
    grid.appendChild(el);
  }
  body.appendChild(grid);
  const row = document.createElement('div');
  row.className = 'mono-amount-row';
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.inputMode = 'numeric';
  inp.placeholder = `₺ ${T.amountPh}`;
  inp.className = 'mono-amount trade-money';
  inp.value = side.money || '';
  inp.oninput = () => { side.money = Math.max(0, parseInt(inp.value, 10) || 0); };
  row.appendChild(inp);
  body.appendChild(row);
}

function renderMonoTradeBuild(body, a) {
  const d = mono.draft;
  if (!d) { closeMono(); return; }
  tradeSideEl(body, d.from, d.give);
  const swap = document.createElement('div');
  swap.className = 'trade-swap';
  swap.textContent = '⇅';
  body.appendChild(swap);
  tradeSideEl(body, d.to, d.want);

  const go = document.createElement('button');
  go.className = 'btn btn-start mono-send';
  go.textContent = T.sendOffer;
  go.onclick = () => {
    const m = state.monopoly;
    if (d.give.money > m.money[d.from] || d.want.money > m.money[d.to]) {
      monoToast(T.insufficient);
      return;
    }
    const payload = d.counter
      ? { op: 'tradeCounter', give: d.give, want: d.want }
      : { op: 'tradeOffer', from: d.from, to: d.to, give: d.give, want: d.want };
    const err = monoDo(payload);
    if (err) return;
    if (isMp()) closeMono();
    else openMono('trade-review', { actor: state.monopoly.trade ? state.monopoly.trade.decider : a });
  };
  body.appendChild(go);
}

function renderMonoTradeReview(body, a) {
  const m = state.monopoly;
  const t = m.trade;
  if (!t) { closeMono(); return; }

  const sideView = (ownerIdx, side) => {
    const p = state.players[ownerIdx];
    const head = document.createElement('div');
    head.className = 'mono-owner';
    head.innerHTML = `<span class="cp-dot" style="background:${p.color}"></span>${esc(T.gives(p.name))}`;
    body.appendChild(head);
    if (side.props.length) {
      const grid = deedGrid('trade');
      for (const id of side.props) {
        if (MPROP[id]) grid.appendChild(deedEl(MPROP[id], m.props[id], {}));
      }
      body.appendChild(grid);
    }
    const moneyLine = document.createElement('div');
    moneyLine.className = 'mono-label trade-money-line';
    moneyLine.textContent = side.money ? `+ ${fmtM(side.money)}` : (side.props.length ? '' : T.nothing);
    if (moneyLine.textContent) body.appendChild(moneyLine);
  };

  sideView(t.from, t.give);
  const swap = document.createElement('div');
  swap.className = 'trade-swap';
  swap.textContent = '⇅';
  body.appendChild(swap);
  sideView(t.to, t.want);

  const iDecide = !isMp() || t.decider === myIdx();
  const actions = document.createElement('div');
  actions.className = 'trade-actions';
  if (iDecide) {
    const acc = document.createElement('button');
    acc.className = 'btn btn-primary';
    acc.textContent = T.accept;
    acc.onclick = () => { const err = monoDo({ op: 'tradeAccept' }); if (!err) closeMono(); };
    const cnt = document.createElement('button');
    cnt.className = 'btn btn-ghost';
    cnt.textContent = T.counterBtn;
    cnt.onclick = () => openMono('trade-build', {
      actor: isMp() ? myIdx() : t.decider,
      draft: {
        from: t.from, to: t.to,
        give: { props: [...t.give.props], money: t.give.money },
        want: { props: [...t.want.props], money: t.want.money },
        counter: true,
      },
    });
    actions.append(acc, cnt);
  }
  const rej = document.createElement('button');
  rej.className = 'btn btn-ghost';
  rej.textContent = T.reject;
  rej.onclick = () => { monoDo({ op: 'tradeReject', player: a }); closeMono(); };
  actions.append(rej);
  body.appendChild(actions);
}

// ---- bankruptcy ----

function renderMonoBankrupt(body, a) {
  const label = document.createElement('div');
  label.className = 'mono-label bankrupt-warn';
  label.textContent = T.bankruptTitle;
  body.appendChild(label);

  const market = document.createElement('button');
  market.className = 'mono-btn';
  market.textContent = T.toMarket;
  market.onclick = () => { monoDo({ op: 'bankrupt', player: a, creditor: null }); closeMono(); };
  body.appendChild(market);

  const cred = document.createElement('button');
  cred.className = 'mono-btn';
  cred.textContent = T.toCreditor;
  body.appendChild(cred);
  const chips = document.createElement('div');
  chips.className = 'mono-chips';
  chips.hidden = true;
  for (const { p, i } of alivePlayers()) {
    if (i === a) continue;
    const c = document.createElement('button');
    c.className = 'mono-chip';
    c.innerHTML = `<span class="cp-dot" style="background:${p.color}"></span>${esc(p.name)}`;
    c.onclick = () => { monoDo({ op: 'bankrupt', player: a, creditor: i }); closeMono(); };
    chips.appendChild(c);
  }
  cred.onclick = () => { chips.hidden = !chips.hidden; };
  body.appendChild(chips);
}

// Net worth: cash + property value (half if mortgaged) + houses at cost.
function netWorths(st) {
  const m = st.monopoly;
  if (!m) return st.players.map(() => 0);
  const worth = [...m.money];
  for (const [id, ps] of Object.entries(m.props)) {
    const def = MPROP[id];
    if (!def) continue;
    worth[ps.owner] += ps.mortgaged ? def.p / 2 : def.p;
    worth[ps.owner] += ps.houses * MGROUPS[def.g].hc;
  }
  return worth.map((w) => Math.round(w));
}

// ====================== REVEAL =================================================

function finishGame() {
  if (!state || state.status !== 'playing' || isMp()) return;
  if (state.mode === 'score' && state.entries.some((e) => e !== null)) {
    state.rounds.push(state.entries.map((e) => e));
  }
  state.entries = Array(state.players.length).fill(null);
  state.status = 'done';
  state.finishedAt = Date.now();
  save();
  archiveGame(state);
  const finished = state;
  state = null; // current game slot is free again
  save();
  showReveal(finished, { quiet: false });
}

function winnerIndex(st, t) {
  let w = 0;
  const lowest = st.mode !== 'monopoly' && st.lowestWins;
  for (let i = 1; i < t.length; i++) {
    if (lowest ? t[i] < t[w] : t[i] > t[w]) w = i;
  }
  return w;
}

function showReveal(st, { quiet }) {
  revealShown = st;
  const isMono = st.mode === 'monopoly';
  const t = isMono ? netWorths(st) : totals(st);
  const w = winnerIndex(st, t);

  $('winner-name').textContent = st.players[w].name;
  $('winner-sub').textContent = isMono
    ? T.monoWinnerSub(fmtM(t[w]))
    : T.winnerSub(st.gameName, t[w], st.rounds.length);
  $('rp-title').textContent = isMono
    ? `${st.icon} ${T.monoSheet}`
    : `${st.icon} ${T.scoreSheet(st.gameName)}`;

  const order = t.map((v, i) => i).sort((a, b) =>
    (st.mode !== 'monopoly' && st.lowestWins) ? t[a] - t[b] : t[b] - t[a]);
  const medal = {};
  ['🥇', '🥈', '🥉'].forEach((mM, r) => { if (order[r] !== undefined) medal[order[r]] = mM; });

  const table = $('score-table');
  const head = `<thead><tr><th>#</th>${st.players.map((p) =>
    `<th><span class="th-dot" style="background:${p.color}"></span>${esc(p.name)}</th>`).join('')}</tr></thead>`;

  let body;
  if (isMono) {
    const m = st.monopoly || { money: st.players.map(() => 0), props: {} };
    const propVal = st.players.map((_, i) => t[i] - m.money[i]);
    body = `<tbody>` +
      `<tr style="animation-delay:.9s"><td class="rlabel">${T.moneyCol}</td>${m.money.map((v) => `<td>${fmtM(v)}</td>`).join('')}</tr>` +
      `<tr style="animation-delay:1.05s"><td class="rlabel">${T.propsCol}</td>${propVal.map((v) => `<td>${fmtM(v)}</td>`).join('')}</tr>` +
      `</tbody>`;
  } else {
    body = `<tbody>${st.rounds.map((r, ri) =>
      `<tr style="animation-delay:${0.9 + ri * 0.12}s"><td class="rlabel">${ri + 1}</td>${r.map((v) =>
        `<td>${v === null ? '—' : v}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }
  const foot = `<tfoot><tr><td class="rlabel">Σ</td>${t.map((v, i) =>
    `<td class="${i === w ? 'win' : ''}">${isMono ? fmtM(v) : v}<span class="medal">${medal[i] || ''}</span></td>`).join('')}</tr></tfoot>`;
  table.innerHTML = head + body + foot;

  $('rematch-btn').hidden = !!st.mp;
  show('reveal');
  if (!quiet) confettiBurst();
}

$('rematch-btn').onclick = () => {
  if (!revealShown || revealShown.mp) return;
  const src = revealShown;
  state = {
    ...src,
    sid: null,
    rounds: [],
    entries: Array(src.players.length).fill(null),
    status: 'playing',
    monopoly: src.mode === 'monopoly' ? freshMono(src.players.length, src.startMoney ?? 1500) : null,
    startedAt: Date.now(),
    finishedAt: null,
  };
  save();
  renderTable();
  show('table');
};
$('new-game-btn').onclick = enterSetup;

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
  document.body.dataset.theme = THEME;
  state = loadJSON(LS_CURRENT, null);
  mpc = loadJSON(LS_MP, null);

  // restore setup UI
  const p = currentPreset();
  $('target-input').value = p.target ?? '';
  $('lowest-wins').checked = !!p.lowestWins;
  renderPresets();
  renderPlayers();
  renderThemeRow();
  renderResume();
  renderHistory();

  if (mpc && state && state.mp) {
    // multiplayer session: rejoin it live
    mpApply(state, 0, true);
    mpPollLoop();
  } else if (state && !state.mp && state.status === 'playing') {
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
