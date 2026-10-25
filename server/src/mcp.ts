/**
 * JobPilot MCP server (stdio). Exposes the same tools as the in-app admin
 * console to any local MCP client: Claude Code, Claude Desktop, Cursor, or a
 * local model runner that speaks MCP.
 *
 *   npm run mcp                      # acts as the first registered user
 *   JOBPILOT_USER=sam npm run mcp    # acts as a specific username
 *
 * stdout is the MCP transport, so all logging goes to stderr.
 */
console.log = (...a: any[]) => console.error(...a);

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import db, { migrate } from './db/connection';
import { tools } from './agent/tools';
import { User } from './types';

function resolveUser(): User {
  const wanted = process.env.JOBPILOT_USER;
  const user = wanted
    ? (db.prepare('SELECT * FROM users WHERE username = ?').get(wanted) as User | undefined)
    : (db.prepare('SELECT * FROM users ORDER BY id LIMIT 1').get() as User | undefined);
  if (!user) {
    console.error(wanted ? `[mcp] no user named "${wanted}"` : '[mcp] no users yet. Register in the web app first.');
    process.exit(1);
  }
  return user;
}

async function main() {
  migrate();
  const user = resolveUser();
  const ctx = { userId: user.id };

  const server = new McpServer({ name: 'jobpilot', version: '1.0.0' });

  for (const t of tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.schema.shape },
      async (input: any) => {
        try {
          const out = await t.run(ctx, input);
          const isErr = !!(out.result && typeof out.result === 'object' && 'error' in (out.result as any));
          return { content: [{ type: 'text' as const, text: JSON.stringify(out.result ?? null, null, 2) }], isError: isErr };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: err?.message || String(err) }) }], isError: true };
        }
      },
    );
  }

  await server.connect(new StdioServerTransport());
  console.error(`[mcp] jobpilot ready as "${user.username}" with ${tools.length} tools`);
}

main().catch(err => { console.error('[mcp]', err); process.exit(1); });
