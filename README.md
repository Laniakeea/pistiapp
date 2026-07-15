# Pisti — Points Keeper

A tabletop points keeper PWA for card & dice games (Pişti, 101 Okey, Yaniv,
Rummy, dice, custom). 2–8 players sit around a virtual felt table, enter each
round's points on a calculator with game-specific bonus buttons, and the
score sheet stays face-down until the game ends — then it unfolds with the
winner, medals, and confetti.

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
