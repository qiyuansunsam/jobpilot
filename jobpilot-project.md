---
name: jobpilot-project
description: "JobPilot repo (~/projects/jobpilot, github qiyuansunsam/jobpilot): what it is, state as of 2026-10-25, how to test it on the phone"
metadata:
  type: project
---

JobPilot is the user's personal job-application app (Vite/React client, Express + SQLite server, Python LinkedIn bridge). Cloned to `~/projects/jobpilot` on 2026-10-25; commits go straight to `main` and are pushed, the user pulls on a laptop.

State after 2026-10-25:
- AI calls use `@anthropic-ai/sdk` 1.x via `server/src/services/claude.service.ts` (single-shot) and `server/src/agent/console.ts` (tool runner). Needs `ANTHROPIC_API_KEY` in `.env`; the old port-3456 proxy is gone.
- Tools are defined once in `server/src/agent/tools.ts` and served to the in-app admin console and to an MCP stdio server (`server/src/mcp.ts`, `npm run mcp`).
- LinkedIn search goes through the unmaintained `linkedin-api` pip package and fails silently (0 jobs) when LinkedIn rotates endpoints. Not fixed; a guest-jobs-page scraper was suggested.
- The user initially thought the assistant was a ChatGPT agent; it was always Claude.

Testing on the phone: better-sqlite3 needs the Debian node (`/usr/bin/node`, v20) plus the glibc prebuild (`cd node_modules/better-sqlite3 && rm -rf build && /usr/bin/node ../.bin/prebuild-install`); the default node pulls an Android prebuild that fails with `libdl.so` missing. Run tsx as `/usr/bin/node node_modules/.bin/tsx`. npm 12 blocks install scripts, so native deps must be rebuilt by hand.

**Why:** avoids an hour of re-discovery each session, and the silent-search failure is easy to misdiagnose as a client bug.

**How to apply:** when asked about JobPilot, check `git log` first for anything newer; see [[phone-dev-environment]] for the toolchain and [[mymusic-project-rules]] for the user's commit habits.
