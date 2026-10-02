# Map MCP server (`apps/mcp`)

A local stdio MCP server that lets an AI agent (Claude Code) read and build maps. It is a thin client over the REST API (`/api/maps…`), authenticated with an API token, so every rule (operation parsing, limits, ownership, undo) lives on the server and is the same for the GM's UI and for the agent. Design notes: [map.md](map.md).

## Tools

| Tool                      | What it does                                                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list_maps`, `create_map` | Map records of the token owner.                                                                                                                                                                                                                                                            |
| `block_guide`             | Coordinates and compass directions, block names, materials, shapes, rotation, operation formats. Built from `shared`, so it can't drift from what the server accepts. Read it before the first edit.                                                                                       |
| `map_summary`             | Bounds, block counts, palette.                                                                                                                                                                                                                                                             |
| `map_slice`               | ASCII slice at height `y` (rows = z with north up, columns = x, legend). Optional rectangle, max 100 000 cells.                                                                                                                                                                            |
| `map_section`             | ASCII vertical section through the plane `x = at` or `z = at` (rows = height, top up; `axis: z` looks from the south, `axis: x` from the west). Checks roofs, storey heights, stairs and the openings above them, which a horizontal slice can't show. Optional ranges, max 100 000 cells. |
| `apply_ops`               | A batch of up to 100 operations: all-or-nothing, one undo unit.                                                                                                                                                                                                                            |
| `undo`, `redo`            | The map's journal stack.                                                                                                                                                                                                                                                                   |
| `view_url`                | A link to the 3D view with a camera (`view=top\|north\|south\|west\|east`, or exact `cam`/`target`) and a height cut `y`.                                                                                                                                                                  |

API errors come back as tool results with `isError` and the server's Russian message, not as protocol errors, so the model sees what to fix ("Операция №2: Неизвестный блок…").

## The build → look → fix loop

1. Edit with `apply_ops`, check with `map_slice` (plan), `map_section` (heights) and `map_summary`.
2. `view_url` → open it with the browser MCP → **wait for the text «Сцена готова»** (the page shows it after the first rendered frame; before that the canvas may still be empty) → screenshot. Make these three calls one after another, not in parallel: a parallel screenshot is taken before the wait finishes and shows the loader.
3. Same URL, same picture: the camera comes from the URL, not from mouse drags.

Building proportions (a storey is 3 blocks, a door 2, creature heights) are decided in [map.md](map.md), «Два масштаба: правила и пропорции»; `block_guide` repeats them for the model.

**The browser must be logged in as the token's owner.** The map page uses the browser's cookie session, not the API token. If the browser MCP profile is logged in as someone else, `view_url` shows «Карта не найдена» — log in as the right user in that browser window. Putting the token in the URL is deliberately not an option: it would leak into history and logs.

## Connecting

1. Build: `pnpm --filter shared build && pnpm --filter map-mcp build` (`.mcp.json` runs `apps/mcp/dist/index.js`).
2. Create a token in the UI: «Карты» → «Токены для нейросети» (`/tokens`). It's shown once.
3. Copy `apps/mcp/.env.example` to `apps/mcp/.env` (gitignored) and paste the token into `DND_API_TOKEN`. The server reads this file itself on start (`src/envFile.ts`); real process environment variables win over it. `.mcp.json` holds no settings, so nothing secret can end up in git.
4. Optional in the same file: `DND_API_URL` (default `http://localhost:3000/api`) and `DND_WEB_URL` (default `http://localhost:5173`). For production use `https://dnd.aoshi.ru/api` and `https://dnd.aoshi.ru`.
5. Restart Claude Code and approve the project MCP server `dnd-map`.
6. Log in to the site in the browser MCP's window as the same user (see the loop above).

Without a token the server still starts; every tool then explains where to get one.

stdout is the protocol channel: the server logs only to stderr.
