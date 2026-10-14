# Web (`apps/web`)

Vite + React 19 + TypeScript, Mantine 9.7 (UI, light «parchment» scheme by default, dark «charcoal + brass» via the header toggle), react-router 7, three.js + react-three-fiber 9 + drei for the 3D map.

## Layout

- `src/main.tsx` — providers: `MantineProvider(theme, cssVariablesResolver)` → `AuthProvider` → `RouterProvider`.
- `src/router.tsx` — routes. Everything except `/login` and `/register` sits behind `RequireAuth`; those two behind `RequireGuest`.
- `src/features/<feature>/` — non-page logic and feature UI (API client, context, validation, labels, shared forms), public surface via `index.ts`. Currently `auth`, `characters`, `maps`, `apiTokens`, `profile`.
  - `characters/CharacterForm/` — the character-sheet form (uncontrolled `useForm`, sections memoized via `formSectionMemo.ts`), used by both the create and edit pages. `initialValues` are read once on mount, so the edit page mounts it only after the character has loaded. `characterFormValues.ts` maps form values ↔ API payload (`toCreatePayload`, `fromCharacter`).
  - `characters/CharacterGallery/` — the character's image gallery on the edit page (plan: [plan/character-images.md](plan/character-images.md)). It sits outside the sheet `<form>` and saves every change at once. `useCharacterImages` holds the data and the edits; `GalleryTile` and `UploadTile` (`@mantine/dropzone`) make the grid; `GalleryLightbox` (`@mantine/lightbox`) and `ThumbnailEditor` (`react-easy-crop`) are mounted only while open. If the phone page is pinch-zoomed, the stock `position: fixed; inset: 0` viewer would open zoomed and shifted with its toolbar off screen, so `useZoomedViewport` places it over the visible part of the page (`visualViewport`) and scales it back; at scale 1 it changes nothing. Image bytes come through `fetch` and are shown as object URLs: `imageUrlCache.ts` loads each image once and revokes its URL 15 s after the last component stops showing it, `useImageUrls` is the hook over it. `CharacterAvatar` is the main image's thumbnail (a rounded square) with initials as the fallback. Tests stub `URL.createObjectURL`, which jsdom lacks.
  - `maps/` — map API client, `mapStateFromChunks` (API response → shared `MapState`), `useMapData` (load, edits, undo/redo). 3D view and the GM editor (see [plan/map.md](plan/map.md)):
    - `useMapData.ts` — one edit at a time (`busy`). An edit response carries the applied changeset (`MapEditResult.changes`); if its `seq` is exactly ours + 1, `applyMapChanges` applies it to a copy of the map (copy-on-write: only touched chunk arrays are new). If `seq` jumped (someone else, e.g. the AI, edited in between) or the changes don't fit our copy (conflicts, palette mismatch), the page refetches all chunks; a chunks response with an older `seq` is dropped. `frame` is the map bounds at open time: the camera is placed from it, never from live bounds, so placing blocks doesn't reset the camera. An empty map gets a default 16×16 frame.
    - `render/buildChunkMesh.ts` — pure mesher: one geometry per chunk from the faces that are actually visible, box shapes included. It reads neighbours through the whole store so chunk borders cull correctly, splits transparent blocks into their own geometry, and takes the height cut as a parameter (rebuild, not a clipping plane, so cut walls get tops). Vertex colours go through `THREE.Color`, which converts sRGB to linear. Covered by unit tests, including face winding.
    - `cameraView.ts` — camera and height cut from the page URL (`?view=north&y=3`, or `cam=x,y,z&target=x,y,z`): one link always gives the same picture, which is how the AI agent looks at a map (see [mcp.md](mcp.md)). The cut slider writes `y` back to the URL (`replace`); the camera memo depends only on `view`/`cam`/`target` and the open-time frame, so neither the slider nor edits reset the user's camera. No `y` means no cut; moving the slider to the top removes `y`, so blocks placed above the old top stay visible.
    - `MapScene/` — the R3F `Canvas`. `CameraRig` applies the placement; `FirstFrame` reports the first rendered frame, after which the page shows «Сцена готова» (the agent waits for that text before a screenshot). **Not re-exported from the barrel**: `MapViewPage` loads it with `React.lazy`, so three.js stays in its own chunk. `ChunkMesh` disposes replaced geometry, which R3F doesn't do for a swapped prop. Page tests `vi.mock` the scene because jsdom has no WebGL; the stub exposes a button that calls `editor.onPick`. The scene is keyed by map id, so «Сцена готова» resets only when the map changes, not on edits.
    - `render/chunkMeshCache.ts` + `MapScene/useChunkMeshes.ts` — incremental meshing: a chunk is rebuilt only if its own array or one of its 6 neighbours' arrays changed identity (that's why `applyMapChanges` must keep untouched chunks as the same arrays); a cut change rebuilds everything. The previous build is kept in state and updated during render (React's "derive from previous" pattern).
    - `MapScene/EditLayer.tsx` — editor picking. Pointer handlers sit on one group around the chunk meshes plus an invisible ground plane at y = 0 (grid drawn only while a tool is active). A click with `event.delta` > 4 px is a camera drag, not an edit. Hover lives inside the R3F tree so mouse moves don't re-render the page. Highlight meshes and the grid have `raycast={() => null}`.
    - `editor/` — `editorTools.ts` (pure: hit point + face normal → cells, op from tool + corners; unit-tested), `useMapEditor` (tool state, hotkeys Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Esc), `EditorPanel` (panel UI). Hit cell is `floor(point − n·ε)`, place cell is hit + n: offsetting outward would put a click on a slab's top (y + 0.5) into the slab's own cell. Block/fill/box use the place cell, eraser/replace use the hit cell; replace's `match` is the block in the first corner. Region height extends the box upward from the higher corner.
    - `walkTest/` — the «Ход» tool: a test token for the walking rules (stage 6 in [plan/map.md](plan/map.md)). It changes no blocks and isn't saved: `useWalkTest` lives in `MapViewPage` (size, speed, anchor), and its `scene` (token, reachable tiles, feet left) is passed to `MapScene` separately from `sceneEditor`, so it stays visible and is recomputed after edits with any tool. `reachable` runs only on placement, moves, edits and setting changes, never on mouse moves; `reachTiles` (pure, unit-tested) puts tiles on grid cells, each at its own cell's support height (not the body's feet, which sit on the highest support of the footprint and would leave tiles beside a slab or stairs floating), namely the cells from which the cursor selects a reachable position: the middle cell of the footprint for odd sizes, the middle 2×2 for even ones (a cell several positions share takes the cheapest cost; a cell with no support under it is skipped even if the body overhangs it, so no tile floats in the air; a tile on the cell corner, where an even body's centre really is, read worse), and `MapScene/ReachTiles` draws them all as one `InstancedMesh` (it calls `invalidate()` itself, since buffer writes don't trigger a frame in `frameloop="demand"`). `walkTarget` (pure, unit-tested) maps a click to the anchor: the hit cell first (slab, stairs), then the place cell. Horizontally `walkAnchors` puts the middle of the footprint nearest to the exact hit point (`PickedCells` carries `point` and `normal`): for odd sizes that is the cursor cell's centre, for even sizes (Large, Gargantuan) the cell corner nearest the cursor, so the body leans towards the quarter of the cell under the cursor. On a wall's side face the body starts in the cell next to the face and extends away from it. `walkBody` is the drawn body: unlike `creatureBody`, it ignores full blocks in the footprint when placing the feet, otherwise a Large creature hovering over a narrow door would float a block up onto the wall. With this tool the editor passes `preview` to the scene, and EditLayer draws `MapScene/WalkHoverMesh` instead of the cell highlight. `walkHover` (pure, unit-tested) decides what a hover or click means: it looks the cursor cells up in the reachable set first (`pathFromReach` gives the path line and cost, so a click moves and spends feet), else it falls back to `walkTarget` (place anew or blocked). The cost label is a drei `Html` with `pointer-events: none`, otherwise it would swallow the hover over blocks behind it. `MapScene/FrameBox` draws both the highlights and the token (`MapScene/WalkLayer`).
- `src/pages/` — route components, kept thin; a page that grows several files becomes a folder. Character routes: `/characters`, `/characters/new`, `/characters/:id/edit`. Creating a character leads to its edit page, because the image gallery needs a saved character. Map routes: `/maps`, `/maps/:id`; API tokens: `/tokens`.
  - `MapViewPage/` (`/maps/:id`) — full-height page without scrolling: the scene fills the left side, all controls live in the right panel (`MapSidebar`), which moves under the scene on narrow screens. The page height is `100dvh` minus the AppShell header (`--app-shell-header-offset`); the scene container needs `min-height: 0`, otherwise the R3F canvas keeps its previous size and the page starts scrolling. New map UI (editor tools, tokens, initiative) goes into the panel.
- `src/components/` — shared UI (`AppLayout`).
- `src/lib/apiRequest.ts` — `apiRequest` (JSON; a `FormData` body goes without the JSON content type) + `apiRequestBlob` (binary responses) + `ApiError` + `errorMessage`, the client for every API module except `auth` (which has its own: a 401 on login is a wrong password, not an expired session). On a 401 it refreshes the session once and retries the request.
- `src/lib/session.ts` — `refreshSession` (one shared in-flight `POST /auth/refresh`: the server rotates the refresh token, so parallel refreshes would log the user out) and `onSessionExpired` listeners.
- `src/lib/usePageTitle.ts` — tab title `«<page> · DnD Online»`; every page calls it (no argument → just `DnD Online`). The favicon is `public/favicon.png`.
- `src/theme/` — Mantine theme: `palettes.ts` (leather/parchment for light, brass/charcoal for dark; red is left to errors, delete buttons and the logo), `cssVariables.ts` (parchment body background), `theme.ts` (`primary` is a virtual color: leather in light, brass in dark). The header toggle is `src/components/ColorSchemeToggle.tsx`; the 3D scene background follows the scheme too (`MapScene`).

## API access

- Base URL: `VITE_API_URL`, default `http://localhost:3000/api` in dev; the Docker build bakes in `/api` (same origin).
- Every request uses `credentials: 'include'` — auth lives in httpOnly cookies (see [server auth](server.md#auth)).
- Errors become `AuthApiError(status, message)`; the server's `message` is shown to the user as-is, so server-side user-facing messages are in Russian.
- `AuthProvider` bootstraps the session: `GET /auth/me`, on 401 `refreshSession()` and retry. It also subscribes to `onSessionExpired` and drops the user when a refresh is rejected, so `RequireAuth` sends them to the login page. The access cookie lives 15 minutes, so without the refresh in `apiRequest` client-side navigation would start failing with «Access token missing». The bootstrap promise is module-level on purpose — StrictMode mounts effects twice, and a duplicate refresh would be rejected because the first one rotated the token.
- **Sign-in through lolka** (`features/auth/LolkaSignIn/`): under the login and register forms, «или» and a «Войти через лольку» button. It shows only when `GET /auth/providers` says `lolka: true` (off locally: lolka accepts one return address, production's). The button is a plain link to `${API_BASE_URL}/auth/lolka/start`, not a `fetch`: the browser goes to lolka and comes back through the server, which sets the cookies and redirects to `/`. A failure comes back as `/login?lolkaError=<code>`; `LoginPage` shows `lolkaErrorMessage(code)` in its usual error alert and strips the parameter. Plan: [plan/lolka-login.md](plan/lolka-login.md).
- **Profile** (`/profile`, `pages/ProfilePage/`): reached through the nickname in the header (a link) or «Профиль» in the narrow-screen menu. Shows the nickname and whether lolka is connected; an account without a password gets `SetCredentialsForm` (login + password, after which the login in `AuthContext` is updated), one with a password sees its login and `ChangePasswordForm`.

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

## UI changes: UX and the browser check

The rule itself is in [CLAUDE.md](../CLAUDE.md#ui-changes-appsweb); this is the how-to.

### UX before coding

Questions to answer before writing the component:

- **Place.** Which existing group does it belong to? Look at how the neighbouring pages already do it and follow that: map controls go into `MapSidebar`, red is kept for errors and delete buttons. A new control next to related ones beats a new control where there happened to be room.
- **Discoverability.** Can the person find it without being told? A text label beats a bare icon; an icon-only button needs a tooltip. Add a hotkey only for frequent actions and only if it fits the existing ones (`useMapEditor`: Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y, Esc).
- **Feedback.** What does the person see while it's working, when it fails, when there's nothing to show, and when the action is unavailable (and why)? Anything that destroys data asks for confirmation.
- **Effort.** Count the clicks and the mouse travel for an action done often; keep sensible defaults so the common case needs no setup.
- **Consistency.** Mantine components and theme colours (`src/theme/`), not one-off styles; wording in the same tone as the neighbouring strings.
- **Narrow screen and both schemes.** On `/maps/:id` the panel moves under the scene; light is parchment, dark is charcoal + brass.

If that leaves one clear answer, build it and mention the reasoning in the summary. If it leaves two or more with real tradeoffs (e.g. a toolbar button vs. a context menu item), ask the user first, with the options sketched and one recommended.

### Browser check

1. Start the stack: `pnpm dev` (web on `:5173`, API on `:3000`; needs the local Postgres).
2. Open the page with the Playwright MCP (wired up in `.mcp.json`) and log in under the local test account. Its credentials are deliberately not in the repo: they live in the Claude Code session memory of this project. If there is none, register a throwaway account on the local stack and tell the user.
3. Function: go through the new flow the way a person would, from the entry point to the result, plus at least one error or edge case (empty input, cancelled action, server error). Then read the browser console and the failed network requests.
4. Looks: take screenshots and look at them. Check alignment, spacing, overflow and clipped text, in both colour schemes (header toggle), and at a narrow width (`browser_resize`) when the layout responds to it.
5. Map pages: set the camera through the URL (`view` or `cam`/`target`, plus `y`), wait for «Сцена готова», then take the screenshot, one call after another (see [mcp.md](mcp.md)). Don't move the camera with the mouse.
6. Fix what the check finds and repeat it. If it couldn't run, say so in the summary.

## Gotcha: Git Bash on Windows

Git Bash rewrites `VITE_API_URL=/api` into a Windows path (`C:/Program Files/Git/api`). For a local production-like build prefix the command with `MSYS_NO_PATHCONV=1`. Docker builds on Linux are unaffected.
