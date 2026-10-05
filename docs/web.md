# Web (`apps/web`)

Vite + React 19 + TypeScript, Mantine 9 (UI, dark color scheme by default), react-router 7, three.js + react-three-fiber 9 + drei for the 3D map.

## Layout

- `src/main.tsx` — providers: `MantineProvider(theme)` → `AuthProvider` → `RouterProvider`.
- `src/router.tsx` — routes. Everything except `/login` and `/register` sits behind `RequireAuth`; those two behind `RequireGuest`.
- `src/features/<feature>/` — non-page logic and feature UI (API client, context, validation, labels, shared forms), public surface via `index.ts`. Currently `auth`, `characters`, `maps`, `apiTokens`.
  - `characters/CharacterForm/` — the character-sheet form (uncontrolled `useForm`, sections memoized via `formSectionMemo.ts`), used by both the create and edit pages. `initialValues` are read once on mount, so the edit page mounts it only after the character has loaded. `characterFormValues.ts` maps form values ↔ API payload (`toCreatePayload`, `fromCharacter`).
  - `maps/` — map API client, `mapStateFromChunks` (API response → shared `MapState`), the temporary demo-village ops. 3D view (see [map.md](map.md)):
    - `render/buildChunkMesh.ts` — pure mesher: one geometry per chunk from the faces that are actually visible, box shapes included. It reads neighbours through the whole store so chunk borders cull correctly, splits transparent blocks into their own geometry, and takes the height cut as a parameter (rebuild, not a clipping plane, so cut walls get tops). Vertex colours go through `THREE.Color`, which converts sRGB to linear. Covered by unit tests, including face winding.
    - `cameraView.ts` — camera and height cut from the page URL (`?view=north&y=3`, or `cam=x,y,z&target=x,y,z`): one link always gives the same picture, which is how the AI agent looks at a map (see [mcp.md](mcp.md)). The cut slider writes `y` back to the URL (`replace`); the camera memo depends only on `view`/`cam`/`target`, so moving the slider doesn't reset the user's camera.
    - `MapScene/` — the R3F `Canvas`. `CameraRig` applies the placement; `FirstFrame` reports the first rendered frame, after which the page shows «Сцена готова» (the agent waits for that text before a screenshot). **Not re-exported from the barrel**: `MapViewPage` loads it with `React.lazy`, so three.js stays in its own chunk. `ChunkMesh` disposes replaced geometry, which R3F doesn't do for a swapped prop. Page tests `vi.mock` the scene because jsdom has no WebGL.
- `src/pages/` — route components, kept thin; a page that grows several files becomes a folder. Character routes: `/characters`, `/characters/new`, `/characters/:id/edit`. Map routes: `/maps`, `/maps/:id`; API tokens: `/tokens`.
  - `MapViewPage/` (`/maps/:id`) — full-height page without scrolling: the scene fills the left side, all controls live in the right panel (`MapSidebar`), which moves under the scene on narrow screens. The page height is `100dvh` minus the AppShell header (`--app-shell-header-offset`); the scene container needs `min-height: 0`, otherwise the R3F canvas keeps its previous size and the page starts scrolling. New map UI (editor tools, tokens, initiative) goes into the panel.
- `src/components/` — shared UI (`AppLayout`).
- `src/lib/apiRequest.ts` — `apiRequest` + `ApiError` + `errorMessage` for new API clients (maps, API tokens). `characters`/`auth` still have their own older copies.
- `src/theme.ts` — Mantine theme.

## API access

- Base URL: `VITE_API_URL`, default `http://localhost:3000/api` in dev; the Docker build bakes in `/api` (same origin).
- Every request uses `credentials: 'include'` — auth lives in httpOnly cookies (see [server auth](server.md#auth)).
- Errors become `AuthApiError(status, message)`; the server's `message` is shown to the user as-is, so server-side user-facing messages are in Russian.
- `AuthProvider` bootstraps the session: `GET /auth/me`, on 401 one `POST /auth/refresh` and retry. The bootstrap promise is module-level on purpose — StrictMode mounts effects twice, and a duplicate refresh would be rejected because the first one rotated the token.

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
