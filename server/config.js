'use strict';

// Central configuration for Pisti (points keeper).
//
// The app is mounted under a sub-path (behind Caddy `handle @pisti`, no prefix
// stripping) so every route the browser sees begins with BASE_PATH.
// Nothing here depends on npm packages.

const fs = require('node:fs');
const path = require('node:path');

const PORT = parseInt(process.env.PORT || '8789', 10);
const HOST = process.env.HOST || '127.0.0.1';

const BASE_PATH = (process.env.BASE_PATH || '/pisti').replace(/\/$/, '');

// Where the SQLite db lives. Defaults to ./data next to the repo so a plain
// `git clone` + systemd works with no extra setup. Gitignored.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'pisti.db');

module.exports = { PORT, HOST, BASE_PATH, DATA_DIR, DB_PATH };
