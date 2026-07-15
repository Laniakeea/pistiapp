'use strict';

// SQLite persistence via Node's built-in `node:sqlite` (no npm packages).
// The client is the source of truth for game state; the server stores the
// whole state blob per game so games survive reloads and device switches.
// Migrations must stay additive — auto-deploy restarts onto the live DB.

const { DatabaseSync } = require('node:sqlite');
const { DB_PATH } = require('./config');

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS games (
    id          TEXT PRIMARY KEY,
    state       TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
`);

const insertGame = db.prepare(
  'INSERT INTO games (id, state, created_at, updated_at) VALUES (?, ?, ?, ?)'
);
const updateGame = db.prepare(
  'UPDATE games SET state = ?, updated_at = ? WHERE id = ?'
);
const selectGame = db.prepare('SELECT * FROM games WHERE id = ?');

function createGame(id, state) {
  const now = Date.now();
  insertGame.run(id, JSON.stringify(state), now, now);
}

function saveGame(id, state) {
  return updateGame.run(JSON.stringify(state), Date.now(), id).changes > 0;
}

function getGame(id) {
  const row = selectGame.get(id);
  if (!row) return null;
  try {
    return { id: row.id, state: JSON.parse(row.state), updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

module.exports = { createGame, saveGame, getGame };
