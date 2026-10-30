# DEVELOPMENT_STATUS (v0.1.0)
## Done (tested by apps/server/src/smoke.test.ts, 3 simulated clients)
- Room create/join, host migration, lobby, host-only start
- State machine: LOBBY -> WORD_SELECTION -> DRAWING -> ROUND_END -> MATCH_END (server timers)
- Server-side guess validation + Arabic/Latin normalization, duplicate-score protection, server scoring
- Secret word sent only to drawer; chat leak via guessed players closed
- Stroke sync (drawer-only, validated, sequenced, rate limited) + late-joiner snapshot
## Not yet
- React/Vite/Tailwind UI (client is a single plain HTML file, not browser-tested), Postgres/Prisma, Redis, auth,
  reconnection, timed hints, other modes, drawing tools v2, admin, AI, Docker, CI, load/e2e tests
## Next: M3 reconnection + Redis state, then M4 drawing engine
