'use strict';

// Multiplayer for Pisti: lobbies keyed by a 6-digit code, HTTP long-poll sync,
// server-authoritative round progression and Monopoly ledger ops.
//
// Trust model: a table of friends. The server enforces identity (per-player
// token) and light permissions (you act for yourself; the host can act for
// anyone — banker override), but amounts/prices come from the client, which
// owns the board data.

const crypto = require('node:crypto');
const db = require('./db');
const { sendJson, readBody } = require('./util');

const COLORS = ['#e05555', '#4d9de0', '#3fa66a', '#e0a94d', '#9b6dd6', '#38b6b6', '#d66d9e', '#96a53d'];
const MAX_PLAYERS = 8;
const LOG_CAP = 10;
const POLL_MS = 25000;

// code -> Set<{res, timer}> of long-poll requests waiting for a version bump
const waiters = new Map();

db.mpCleanup(7 * 24 * 3600 * 1000);
setInterval(() => db.mpCleanup(7 * 24 * 3600 * 1000), 3600 * 1000).unref();

// ---- helpers -----------------------------------------------------------------

function publicState(state) {
  const { tokens, ...rest } = state;
  return rest;
}

function totals(st) {
  const t = st.players.map(() => 0);
  for (const r of st.rounds) r.forEach((v, i) => { t[i] += v || 0; });
  return t;
}

function newCode() {
  for (let i = 0; i < 20; i++) {
    const code = String(100000 + crypto.randomInt(900000));
    if (!db.mpGet(code)) return code;
  }
  return null;
}

function save(game) {
  game.version++;
  db.mpSave(game.code, game.state, game.version);
  const set = waiters.get(game.code);
  if (set) {
    waiters.delete(game.code);
    for (const w of set) {
      clearTimeout(w.timer);
      sendJson(w.res, 200, { version: game.version, state: publicState(game.state) });
    }
  }
}

function playerIdx(state, token) {
  const pid = state.tokens[token];
  if (!pid) return -1;
  return state.players.findIndex((p) => p.id === pid);
}

// ---- game logic --------------------------------------------------------------

// When every player has committed, fold the round in and check end conditions.
function maybeAdvanceRound(st) {
  if (!st.entries.every((e) => e !== null)) return;
  st.rounds.push(st.entries);
  st.entries = st.players.map(() => null);
  const t = totals(st);
  const roundsDone = st.maxRounds && st.rounds.length >= st.maxRounds;
  const targetHit = st.target && t.some((v) => v >= st.target);
  if (roundsDone || targetHit) {
    st.status = 'done';
    st.finishedAt = Date.now();
  }
}

function finish(st) {
  if (st.entries.some((e) => e !== null)) {
    st.rounds.push(st.entries.map((e) => e));
  }
  st.entries = st.players.map(() => null);
  st.status = 'done';
  st.finishedAt = Date.now();
}

// Monopoly ledger. Mirrored client-side for solo games — keep both in sync.
// Returns an error string or null. `a` fields: op, from, to, amount, propId,
// price, refund, delta, cost, on, value, player.
function applyMono(st, actorIdx, isHost, a) {
  const m = st.monopoly;
  const n = st.players.length;
  const idxOk = (i) => Number.isInteger(i) && i >= 0 && i < n;
  const may = (i) => isHost || i === actorIdx;
  const amt = Math.floor(Math.abs(a.amount || 0));

  switch (a.op) {
    case 'transfer': {
      const from = a.from === 'bank' ? 'bank' : a.from;
      const to = a.to === 'bank' ? 'bank' : a.to;
      if (from !== 'bank' && !idxOk(from)) return 'bad from';
      if (to !== 'bank' && !idxOk(to)) return 'bad to';
      if (from === to) return 'same account';
      if (!amt) return 'bad amount';
      // moving money out of a player's pocket (or pulling from the bank into
      // your own) is a self-or-host action
      if (from !== 'bank' && !may(from)) return 'not yours';
      if (from === 'bank' && to !== 'bank' && !may(to)) return 'not yours';
      if (from !== 'bank') m.money[from] -= amt;
      if (to !== 'bank') m.money[to] += amt;
      log(m, { op: 'transfer', from, to, amount: amt });
      return null;
    }
    case 'buy': {
      const who = a.player ?? actorIdx;
      if (!idxOk(who) || !may(who)) return 'not yours';
      if (!a.propId || m.props[a.propId]) return 'unavailable';
      const price = Math.floor(Math.abs(a.price || 0));
      m.props[a.propId] = { owner: who, houses: 0, mortgaged: false };
      m.money[who] -= price;
      log(m, { op: 'buy', player: who, propId: a.propId, amount: price });
      return null;
    }
    case 'sell': {
      const p = m.props[a.propId];
      if (!p || !may(p.owner)) return 'not yours';
      const refund = Math.floor(Math.abs(a.refund || 0));
      delete m.props[a.propId];
      m.money[p.owner] += refund;
      log(m, { op: 'sell', player: p.owner, propId: a.propId, amount: refund });
      return null;
    }
    case 'house': {
      const p = m.props[a.propId];
      if (!p || !may(p.owner)) return 'not yours';
      const delta = a.delta > 0 ? 1 : -1;
      const next = p.houses + delta;
      if (next < 0 || next > 5) return 'out of range';
      const cost = Math.floor(Math.abs(a.cost || 0));
      p.houses = next;
      m.money[p.owner] -= delta * cost;
      log(m, { op: 'house', player: p.owner, propId: a.propId, houses: next });
      return null;
    }
    case 'mortgage': {
      const p = m.props[a.propId];
      if (!p || !may(p.owner)) return 'not yours';
      const value = Math.floor(Math.abs(a.value || 0));
      if (!!p.mortgaged === !!a.on) return 'no change';
      p.mortgaged = !!a.on;
      m.money[p.owner] += a.on ? value : -value;
      log(m, { op: 'mortgage', player: p.owner, propId: a.propId, on: !!a.on, amount: value });
      return null;
    }
    case 'jail': {
      const who = a.player ?? actorIdx;
      if (!idxOk(who) || !may(who)) return 'not yours';
      m.jail[who] = !!a.on;
      log(m, { op: 'jail', player: who, on: !!a.on });
      return null;
    }
    case 'turn': {
      if (!(isHost || m.turn === actorIdx)) return 'not your turn';
      m.turn = (m.turn + 1) % n;
      log(m, { op: 'turn', player: m.turn });
      return null;
    }
    default:
      return 'unknown op';
  }
}

function log(m, entry) {
  m.log.unshift({ ...entry, at: Date.now() });
  if (m.log.length > LOG_CAP) m.log.length = LOG_CAP;
}

// ---- endpoints ---------------------------------------------------------------

async function create(req, res) {
  const body = await readBody(req);
  if (!body || typeof body.config !== 'object' || body.config === null) {
    return sendJson(res, 400, { error: 'config required' });
  }
  const code = newCode();
  if (!code) return sendJson(res, 503, { error: 'no codes left' });
  const c = body.config;
  const name = String(body.hostName || '').trim().slice(0, 16) || 'Oyuncu 1';
  const playerId = crypto.randomBytes(4).toString('hex');
  const token = crypto.randomBytes(12).toString('hex');
  const state = {
    v: 1,
    mp: true,
    mode: c.mode === 'monopoly' ? 'monopoly' : 'score',
    game: String(c.game || 'free'),
    gameName: String(c.gameName || '').slice(0, 24) || 'Oyun',
    icon: String(c.icon || '🃏').slice(0, 8),
    items: Array.isArray(c.items) ? c.items.slice(0, 24) : [],
    lowestWins: !!c.lowestWins,
    target: Number.isFinite(c.target) && c.target > 0 ? Math.floor(c.target) : null,
    maxRounds: Number.isFinite(c.maxRounds) && c.maxRounds > 0 ? Math.floor(c.maxRounds) : null,
    startMoney: Number.isFinite(c.startMoney) && c.startMoney >= 0 ? Math.floor(c.startMoney) : 1500,
    hostId: playerId,
    players: [{ id: playerId, name, color: COLORS[0] }],
    tokens: { [token]: playerId },
    rounds: [],
    entries: [null],
    status: 'lobby',
    monopoly: null,
    startedAt: null,
    finishedAt: null,
  };
  db.mpCreate(code, state);
  sendJson(res, 200, { code, playerId, token, version: 1, state: publicState(state) });
}

async function join(req, res) {
  const body = await readBody(req);
  const code = String(body && body.code || '').trim();
  if (!/^\d{6}$/.test(code)) return sendJson(res, 400, { error: 'bad code' });
  const game = db.mpGet(code);
  if (!game) return sendJson(res, 404, { error: 'not found' });
  const st = game.state;
  if (st.status !== 'lobby') return sendJson(res, 409, { error: 'already started' });
  if (st.players.length >= MAX_PLAYERS) return sendJson(res, 409, { error: 'full' });
  const name = String(body.name || '').trim().slice(0, 16) || `Oyuncu ${st.players.length + 1}`;
  const playerId = crypto.randomBytes(4).toString('hex');
  const token = crypto.randomBytes(12).toString('hex');
  st.players.push({ id: playerId, name, color: COLORS[st.players.length] });
  st.tokens[token] = playerId;
  st.entries = st.players.map(() => null);
  save(game);
  sendJson(res, 200, { code, playerId, token, version: game.version, state: publicState(st) });
}

async function action(req, res, code) {
  const game = db.mpGet(code);
  if (!game) return sendJson(res, 404, { error: 'not found' });
  const body = await readBody(req);
  if (!body) return sendJson(res, 400, { error: 'bad body' });
  const st = game.state;
  const idx = playerIdx(st, String(body.token || ''));
  if (idx < 0) return sendJson(res, 403, { error: 'bad token' });
  const isHost = st.players[idx].id === st.hostId;

  switch (body.type) {
    case 'rename': {
      const name = String(body.name || '').trim().slice(0, 16);
      if (!name) return sendJson(res, 400, { error: 'bad name' });
      st.players[idx].name = name;
      break;
    }
    case 'start': {
      if (!isHost) return sendJson(res, 403, { error: 'host only' });
      if (st.status !== 'lobby') return sendJson(res, 409, { error: 'not in lobby' });
      if (st.players.length < 2) return sendJson(res, 409, { error: 'need players' });
      st.status = 'playing';
      st.startedAt = Date.now();
      st.entries = st.players.map(() => null);
      if (st.mode === 'monopoly') {
        st.monopoly = {
          money: st.players.map(() => st.startMoney),
          jail: st.players.map(() => false),
          props: {},
          turn: 0,
          log: [],
        };
      }
      break;
    }
    case 'entry': {
      if (st.status !== 'playing' || st.mode !== 'score') return sendJson(res, 409, { error: 'not playing' });
      const v = Math.trunc(body.value);
      if (!Number.isFinite(v) || Math.abs(v) > 1e6) return sendJson(res, 400, { error: 'bad value' });
      st.entries[idx] = v;
      maybeAdvanceRound(st);
      break;
    }
    case 'unentry': {
      if (st.status !== 'playing' || st.mode !== 'score') return sendJson(res, 409, { error: 'not playing' });
      st.entries[idx] = null;
      break;
    }
    case 'finish': {
      if (!isHost) return sendJson(res, 403, { error: 'host only' });
      if (st.status !== 'playing') return sendJson(res, 409, { error: 'not playing' });
      finish(st);
      break;
    }
    case 'mono': {
      if (st.status !== 'playing' || st.mode !== 'monopoly' || !st.monopoly) {
        return sendJson(res, 409, { error: 'not playing' });
      }
      const err = applyMono(st, idx, isHost, body);
      if (err) return sendJson(res, 400, { error: err });
      break;
    }
    default:
      return sendJson(res, 400, { error: 'unknown type' });
  }

  save(game);
  sendJson(res, 200, { ok: true, version: game.version });
}

function poll(req, res, code, since) {
  const game = db.mpGet(code);
  if (!game) return sendJson(res, 404, { error: 'not found' });
  if (game.version > since) {
    return sendJson(res, 200, { version: game.version, state: publicState(game.state) });
  }
  // hold the request until the next action or the timeout
  let set = waiters.get(code);
  if (!set) waiters.set(code, (set = new Set()));
  const w = { res, timer: null };
  w.timer = setTimeout(() => {
    set.delete(w);
    sendJson(res, 200, { version: game.version });
  }, POLL_MS);
  set.add(w);
  req.on('close', () => {
    clearTimeout(w.timer);
    set.delete(w);
  });
}

// rel is the path after "/api/mp", e.g. "/create", "/123456", "/123456/action"
async function handle(req, res, rel, query) {
  if (rel === '/create' && req.method === 'POST') return create(req, res);
  if (rel === '/join' && req.method === 'POST') return join(req, res);
  const m = rel.match(/^\/(\d{6})(\/action)?$/);
  if (m) {
    if (m[2] && req.method === 'POST') return action(req, res, m[1]);
    if (!m[2] && req.method === 'GET') {
      return poll(req, res, m[1], parseInt(query.get('since') || '0', 10) || 0);
    }
  }
  sendJson(res, 404, { error: 'no such endpoint' });
}

module.exports = { handle };
