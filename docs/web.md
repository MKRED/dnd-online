# Web (`apps/web`)

Vite + React 19 + TypeScript, Mantine 9 (UI, light «parchment» scheme by default, dark «charcoal + brass» via the header toggle), react-router 7, three.js + react-three-fiber 9 + drei for the 3D map.

## Layout

- `src/main.tsx` — providers: `MantineProvider(theme, cssVariablesResolver)` → `AuthProvider` → `RouterProvider`.
- `src/router.tsx` — routes. Everything except `/login` and `/register` sits behind `RequireAuth`; those two behind `RequireGuest`.
- `src/features/<feature>/` — non-page logic and feature UI (API client, context, validation, labels, shared forms), public surface via `index.ts`. Currently `auth`, `characters`, `maps`, `apiTokens`.
  - `characters/CharacterForm/` — the character-sheet form (uncontrolled `useForm`, sections memoized via `formSectionMemo.ts`), used by both the create and edit pages. `initialValues` are read once on mount, so the edit page mounts it only after the character has loaded. `characterFormValues.ts` maps form values ↔ API payload (`toCreatePayload`, `fromCharacter`).
  - `maps/` — map API client, `mapStateFromChunks` (API response → shared `MapState`), `useMapData` (load, edits, undo/redo). 3D view and the GM editor (see [map.md](map.md)):
    - `useMapData.ts` — one edit at a time (`busy`). An edit response carries the applied changeset (`MapEditResult.changes`); if its `seq` is exactly ours + 1, `applyMapChanges` applies it to a copy of the map (copy-on-write: only touched chunk arrays are new). If `seq` jumped (someone else, e.g. the AI, edited in between) or the changes don't fit our copy (conflicts, palette mismatch), the page refetches all chunks; a chunks response with an older `seq` is dropped. `frame` is the map bounds at open time: the camera is placed from it, never from live bounds, so placing blocks doesn't reset the camera. An empty map gets a default 16×16 frame.
    - `render/buildChunkMesh.ts` — pure mesher: one geometry per chunk from the faces that are actually visible, box shapes included. It reads neighbours through the whole store so chunk borders cull correctly, splits transparent blocks into their own geometry, and takes the height cut as a parameter (rebuild, not a clipping plane, so cut walls get tops). Vertex colours go through `THREE.Color`, which converts sRGB to linear. Covered by unit tests, including face winding.
    - `cameraView.ts` — camera and height cut from the page URL (`?view=north&y=3`, or `cam=x,y,z&target=x,y,z`): one link always gives the same picture, which is how the AI agent looks at a map (see [mcp.md](mcp.md)). The cut slider writes `y` back to the URL (`replace`); the camera memo depends only on `view`/`cam`/`target` and the open-time frame, so neither the slider nor edits reset the user's camera. No `y` means no cut; moving the slider to the top removes `y`, so blocks placed above the old top stay visible.
    - `MapScene/` — the R3F `Canvas`. `CameraRig` applies the placement; `FirstFrame` reports the first rendered frame, after which the page shows «Сцена готова» (the agent waits for that text before a screenshot). **Not re-exported from the barrel**: `MapViewPage` loads it with `React.lazy`, so three.js stays in its own chunk. `ChunkMesh` disposes replaced geometry, which R3F doesn't do for a swapped prop. Page tests `vi.mock` the scene because jsdom has no WebGL; the stub exposes a button that calls `editor.onPick`. The scene is keyed by map id, so «Сцена готова» resets only when the map changes, not on edits.
    - `render/chunkMeshCache.ts` + `MapScene/useChunkMeshes.ts` — incremental meshing: a chunk is rebuilt only if its own array or one of its 6 neighbours' arrays changed identity (that's why `applyMapChanges` must keep untouched chunks as the same arrays); a cut change rebuilds everything. The previous build is kept in state and updated during render (React's "derive from previous" pattern).
    - `MapScene/EditLayer.tsx` — editor picking. Pointer handlers sit on one group around the chunk meshes plus an invisible ground plane at y = 0 (grid drawn only while a tool is active). A click with `event.delta` > 4 px is a camera drag, not an edit. Hover lives inside the R3F tree so mouse moves don't re-render the page. Highlight meshes and the grid have `raycast={() => null}`.
    - `editor/` — `editorTools.ts` (pure: hit point + face normal → cells, op from tool + corners; unit-tested), `useMapEditor` (tool state, hotkeys Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Esc), `EditorPanel` (panel UI). Hit cell is `floor(point − n·ε)`, place cell is hit + n: offsetting outward would put a click on a slab's top (y + 0.5) into the slab's own cell. Block/fill/box use the place cell, eraser/replace use the hit cell; replace's `match` is the block in the first corner. Region height extends the box upward from the higher corner.
    - `walkTest/` — the «Ход» tool: a test token for the walking rules (stage 6 in [map.md](map.md)). It changes no blocks and isn't saved: `useWalkTest` lives in `MapViewPage` (size, speed, anchor), and its `scene` (token, reachable tiles, feet left) is passed to `MapScene` separately from `sceneEditor`, so it stays visible and is recomputed after edits with any tool. `reachable` runs only on placement, moves, edits and setting changes, never on mouse moves; `reachTiles` (pure, unit-tested) puts each tile at feet height on the cursor cell of the footprint, and `MapScene/ReachTiles` draws them all as one `InstancedMesh` (it calls `invalidate()` itself, since buffer writes don't trigger a frame in `frameloop="demand"`). `walkTarget` (pure, unit-tested) maps a click to the anchor: the hit cell first (slab, stairs), then the place cell; the cursor holds the middle of a big footprint. `walkBody` is the drawn body: unlike `creatureBody`, it ignores full blocks in the footprint when placing the feet, otherwise a Large creature hovering over a narrow door would float a block up onto the wall. With this tool the editor passes `preview` to the scene, and EditLayer draws `MapScene/WalkHoverMesh` instead of the cell highlight. `walkHover` (pure, unit-tested) decides what a hover or click means: it looks the cursor cells up in the reachable set first (`pathFromReach` gives the path line and cost, so a click moves and spends feet), else it falls back to `walkTarget` (place anew or blocked). The cost label is a drei `Html` with `pointer-events: none`, otherwise it would swallow the hover over blocks behind it. `MapScene/FrameBox` draws both the highlights and the token (`MapScene/WalkLayer`).
- `src/pages/` — route components, kept thin; a page that grows several files becomes a folder. Character routes: `/characters`, `/characters/new`, `/characters/:id/edit`. Map routes: `/maps`, `/maps/:id`; API tokens: `/tokens`.
  - `MapViewPage/` (`/maps/:id`) — full-height page without scrolling: the scene fills the left side, all controls live in the right panel (`MapSidebar`), which moves under the scene on narrow screens. The page height is `100dvh` minus the AppShell header (`--app-shell-header-offset`); the scene container needs `min-height: 0`, otherwise the R3F canvas keeps its previous size and the page starts scrolling. New map UI (editor tools, tokens, initiative) goes into the panel.
- `src/components/` — shared UI (`AppLayout`).
- `src/lib/apiRequest.ts` — `apiRequest` + `ApiError` + `errorMessage`, the client for every API module except `auth` (which has its own: a 401 on login is a wrong password, not an expired session). On a 401 it refreshes the session once and retries the request.
- `src/lib/session.ts` — `refreshSession` (one shared in-flight `POST /auth/refresh`: the server rotates the refresh token, so parallel refreshes would log the user out) and `onSessionExpired` listeners.
- `src/lib/usePageTitle.ts` — tab title `«<page> · DnD Online»`; every page calls it (no argument → just `DnD Online`). The favicon is `public/favicon.png`.
- `src/theme/` — Mantine theme: `palettes.ts` (leather/parchment for light, brass/charcoal for dark; red is left to errors, delete buttons and the logo), `cssVariables.ts` (parchment body background), `theme.ts` (`primary` is a virtual color: leather in light, brass in dark). The header toggle is `src/components/ColorSchemeToggle.tsx`; the 3D scene background follows the scheme too (`MapScene`).

## API access

- Base URL: `VITE_API_URL`, default `http://localhost:3000/api` in dev; the Docker build bakes in `/api` (same origin).
- Every request uses `credentials: 'include'` — auth lives in httpOnly cookies (see [server auth](server.md#auth)).
- Errors become `AuthApiError(status, message)`; the server's `message` is shown to the user as-is, so server-side user-facing messages are in Russian.
- `AuthProvider` bootstraps the session: `GET /auth/me`, on 401 `refreshSession()` and retry. It also subscribes to `onSessionExpired` and drops the user when a refresh is rejected, so `RequireAuth` sends them to the login page. The access cookie lives 15 minutes, so without the refresh in `apiRequest` client-side navigation would start failing with «Access token missing». The bootstrap promise is module-level on purpose — StrictMode mounts effects twice, and a duplicate refresh would be rejected because the first one rotated the token.

## Styling

CSS Modules (`Component.module.css`) colocated with the component — Vite supports them natively and `types: ["vite/client"]` provides the import types. `src/index.css` (imported once in `main.tsx`) stays global on purpose: `:root` theme tokens and element resets apply app-wide. Mantine styles go through `postcss-preset-mantine`.

## TypeScript

Bundler-mode project-references setup from the Vite React-TS template (`tsconfig.app.json` + `tsconfig.node.json`), `verbatimModuleSyntax`, no emit — Vite bundles. Don't unify with `apps/server`'s config. `build` is `tsc -b && vite build`.

## Tests

Vitest + Testing Library on jsdom, configured in the `test` section of `vite.config.ts` (`defineConfig` comes from `vitest/config`).

- Files: `*.test.ts(x)` next to the source. Globals are off — import from `vitest`.
- `src/test/setup.ts` wires jest-dom matchers, `cleanup`, and the jsdom stubs Mantine needs (`matchMedia`, `ResizeObserver`, `document.fonts`).
- `src/test/characterFixture.ts` — a fully populated `Character` for form/page tests.
- Render components via `renderWithProviders` from `src/test/render.tsx`: Mantine + `MemoryRouter` + a stub `AuthContext` (so nothing hits `/auth/me`). Options: `route`, `auth` overrides; returns `authValue` to assert on `setUser` etc.
- Mock the network with `vi.stubGlobal('fetch', …)` — globals and mocks are auto-restored between tests.
- Run: `pnpm --filter web test` (or `test:watch`).

## Gotcha: Git Bash on Windows

Git Bash rewrites `VITE_API_URL=/api` into a Windows path (`C:/Program Files/Git/api`). For a local production-like build prefix the command with `MSYS_NO_PATHCONV=1`. Docker builds on Linux are unaffected.
