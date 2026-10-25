# JobPilot

Personal job-application copilot: LinkedIn search, AI-tailored cover letters and screening answers, Easy Apply, and an admin console that drives all of it through Claude.

## Setup

```bash
npm run install:all
cp .env.example .env     # set ANTHROPIC_API_KEY (console.anthropic.com)
npm run dev              # client on :5173, API on :3001
```

Python deps for the LinkedIn bridge (`server/linkedin_bridge.py`):

```bash
pip install linkedin-api playwright && playwright install chromium
```

The server spawns `python`; make sure that resolves (on macOS/Linux you may need `alias python=python3` or a venv).

Claude credentials: `ANTHROPIC_API_KEY` in `.env`, or an `ant auth login` profile on the machine. Model defaults to `claude-opus-5-5`; override with `CLAUDE_MODEL`.

## Admin console

The chat panel (right side of the LinkedIn page, floating button elsewhere) is an agent with tools over the whole app. It keeps conversation history and the UI reacts to what it does (a search from the console fills the job list).

Tools: `get_profile`, `update_additional_info`, `summarize_cv`, `get_preferences`, `update_preferences`, `list_applications`, `get_application`, `update_application_status`, `update_application_content`, `linkedin_status`, `search_jobs`, `get_job`, `generate_application`, `save_application`, `easy_apply`.

`easy_apply` acts on your real LinkedIn account. The system prompt only allows it when you explicitly ask to apply.

API: `POST /api/chat` with `{ messages: [{role, content}], context? }` returns `{ reply, events }`. `GET /api/chat/tools` lists the tools.

## MCP server (local AI clients)

The same tools are exposed over MCP (stdio) so Claude Code, Claude Desktop, Cursor or any MCP-speaking local model can operate JobPilot directly. It reads the same SQLite database and LinkedIn session as the web app, so run the web app at least once and register.

```bash
cd server && npm run mcp                 # acts as the first registered user
JOBPILOT_USER=yourname npm run mcp       # pick a user
```

Claude Code:

```bash
claude mcp add jobpilot -e JOBPILOT_USER=yourname -- npm --prefix /path/to/jobpilot/server run -s mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jobpilot": {
      "command": "npm",
      "args": ["--prefix", "/path/to/jobpilot/server", "run", "-s", "mcp"],
      "env": { "JOBPILOT_USER": "yourname" }
    }
  }
}
```

Codex CLI (`~/.codex/config.toml`):

```toml
[mcp_servers.jobpilot]
command = "npm"
args = ["--prefix", "/path/to/jobpilot/server", "run", "-s", "mcp"]
env = { JOBPILOT_USER = "yourname" }
```

Per-person setup: each person runs their own copy of the repo on their own machine. Register once in the web app (that creates the user and the local SQLite database), connect LinkedIn on the LinkedIn page once (that stores the session the bridge reuses), then point the agent at the MCP server with `JOBPILOT_USER` set to that username.

The MCP server needs no Anthropic key. Only `generate_application` and `summarize_cv` call Claude with the server's credentials; a CLI agent can skip them, read the CV with `get_profile`, write the cover letter itself and store it with `save_application`.

## Layout

- `client/` Vite + React. Console lives in `src/components/console/`.
- `server/src/agent/tools.ts` the single tool definition shared by the console and MCP.
- `server/src/agent/console.ts` tool-use loop (Anthropic SDK tool runner).
- `server/src/mcp.ts` MCP stdio server.
- `server/src/services/claude.service.ts` plain single-shot Claude calls (generation, CV summary).
- `server/linkedin_bridge.py` LinkedIn access via the unofficial `linkedin-api` package and Playwright.

## Known issue

LinkedIn search depends on the unmaintained `linkedin-api` package, which fails silently (returns no jobs) when LinkedIn changes its internal endpoints. See `search_jobs` in `linkedin_bridge.py`.
