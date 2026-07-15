'use strict';

// Pisti HTTP server. Mounted under BASE_PATH (default /pisti) behind Caddy,
// which reverse-proxies without stripping the prefix, so every path the
// browser and this server agree on begins with /pisti.
//
// The client owns game state (localStorage first, works offline); the API is
// a best-effort backup/sync store keyed by a client-generated game id.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { PORT, HOST, BASE_PATH } = require('./config');
const db = require('./db');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy(); // basic guard
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

// ---- static files ----------------------------------------------------------

function serveStatic(req, res, rel) {
  let name = rel.replace(/^\/+/, '');
  if (name === '' || name === '/') name = 'index.html';
  const filePath = path.join(PUBLIC_DIR, name);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // SPA fallback: unknown non-file paths get the app shell.
      if (!path.extname(name)) {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, shell) => {
          if (e2) return res.writeHead(404).end('Not found');
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          res.end(shell);
        });
        return;
      }
      res.writeHead(404).end('Not found');
      return;
    }
    const headers = { 'Content-Type': MIME[path.extname(name)] || 'application/octet-stream' };
    // The service worker must be allowed to control the whole /pisti scope.
    if (name === 'sw.js') headers['Service-Worker-Allowed'] = BASE_PATH + '/';
    res.writeHead(200, headers);
    res.end(buf);
  });
}

// ---- API ---------------------------------------------------------------
// POST /api/games            {state}  -> {id}
// GET  /api/games/:id                 -> {id, state, updatedAt}
// PUT  /api/games/:id        {state}  -> {ok}

const ID_RE = /^[a-f0-9]{16}$/;

async function handleApi(req, res, rel) {
  if (rel === '/health') return sendJson(res, 200, { ok: true, app: 'pisti' });

  if (rel === '/games' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body || typeof body.state !== 'object' || body.state === null) {
      return sendJson(res, 400, { error: 'state required' });
    }
    const id = crypto.randomBytes(8).toString('hex');
    db.createGame(id, body.state);
    return sendJson(res, 200, { id });
  }

  const m = rel.match(/^\/games\/([a-f0-9]{16})$/);
  if (m && ID_RE.test(m[1])) {
    const id = m[1];
    if (req.method === 'GET') {
      const game = db.getGame(id);
      if (!game) return sendJson(res, 404, { error: 'not found' });
      return sendJson(res, 200, game);
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (!body || typeof body.state !== 'object' || body.state === null) {
        return sendJson(res, 400, { error: 'state required' });
      }
      if (!db.saveGame(id, body.state)) return sendJson(res, 404, { error: 'not found' });
      return sendJson(res, 200, { ok: true });
    }
  }

  sendJson(res, 404, { error: 'no such endpoint' });
}

// ---- server ------------------------------------------------------------

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let p = url.pathname;

  // Everything lives under BASE_PATH; redirect the bare prefix to the slash form.
  if (p === BASE_PATH) {
    res.writeHead(301, { Location: BASE_PATH + '/' });
    return res.end();
  }
  if (!p.startsWith(BASE_PATH + '/')) {
    res.writeHead(404).end('Not found');
    return;
  }
  p = p.slice(BASE_PATH.length); // "/", "/app.js", "/api/health", ...

  if (p.startsWith('/api/')) {
    handleApi(req, res, p.slice(4)).catch((e) => {
      console.error('api error', e);
      sendJson(res, 500, { error: 'internal' });
    });
    return;
  }

  serveStatic(req, res, p);
});

server.listen(PORT, HOST, () => {
  console.log(`pisti listening on http://${HOST}:${PORT}${BASE_PATH}/`);
});
