# Pisti — Points Keeper

A tabletop points keeper PWA for card & dice games (Pişti, 101 Okey, Yaniv,
Rummy, dice, custom). 2–8 players sit around a virtual felt table, enter each
round's points with one-tap card buttons (combo rules like "every 3 taps =
270" computed live; a calculator is one tap away for free-form numbers), and
the score sheet stays face-down until the game ends — then it unfolds with
the winner, medals, and confetti. Games can have a target score and/or a
fixed round count.

**Multiplayer**: toggle "Çok oyunculu", get a 6-digit room code, friends join
from their own phones. Everyone enters only their own score; rounds advance
automatically when the last player commits. Server-authoritative state in
`mp_games` (SQLite), synced by HTTP long-poll (`/api/mp/*`, ~25s holds).

**Monopoly mode** (🎩): the app is the bank — per-player cash, the Monopoly
Türkiye board (Giresun on top), houses, mortgage, jail, and turns. Transfers
player↔player and player↔bank, rent lookup per property, net-worth reveal.
Works solo (one phone = banker) and multiplayer (each player manages their
own money; the host is the banker override).

Served at `resonateapp.online/pisti` (port 8789, systemd unit `pisti`).

## Stack

- Zero-npm-dependency Node HTTP server (`server/server.js`), storage via the
  built-in `node:sqlite` (`--experimental-sqlite` on node 22).
- Mounted under `BASE_PATH=/pisti` behind Caddy **without** prefix stripping.
- Client owns game state (localStorage, works offline); the API
  (`POST/GET/PUT /pisti/api/games`) is a best-effort mirror.
- PWA with the sewconnect update machinery: precache + stale-while-revalidate
  service worker, update bar with SKIP_WAITING. **Bump `CACHE = 'pisti-vN'`
  in `public/sw.js` on every deploy.**

## Run locally

```bash
DATA_DIR=/tmp/pisti PORT=8899 node --experimental-sqlite server/server.js
# → http://127.0.0.1:8899/pisti/
```

## Deploy

Everything under `deploy/` — systemd unit, autopull timer (push → live in
~60s), and the full replacement Caddyfile. See `PLAYBOOK.md` in the
sewconnect repo for the step-by-step server procedure. Migrations in
`server/db.js` must stay additive; `data/` is gitignored and survives deploys.
