# Web (`apps/web`)

Vite + React 19 + TypeScript, Mantine 9 (UI, dark color scheme by default), react-router 7. react-three-fiber (3D map) is planned, not installed yet.

## Layout

- `src/main.tsx` — providers: `MantineProvider(theme)` → `AuthProvider` → `RouterProvider`.
- `src/router.tsx` — routes. Everything except `/login` and `/register` sits behind `RequireAuth`; those two behind `RequireGuest`.
- `src/features/<feature>/` — non-page logic per feature (API client, context, validation, labels), public surface via `index.ts`. Currently `auth`, `characters`.
- `src/pages/` — route components; a page that grows several files becomes a folder (`CharacterCreatePage/`).
- `src/components/` — shared UI (`AppLayout`).
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
- `src/test/setup.ts` wires jest-dom matchers, `cleanup`, and the jsdom stubs Mantine needs (`matchMedia`, `ResizeObserver`).
- Render components via `renderWithProviders` from `src/test/render.tsx`: Mantine + `MemoryRouter` + a stub `AuthContext` (so nothing hits `/auth/me`). Options: `route`, `auth` overrides; returns `authValue` to assert on `setUser` etc.
- Mock the network with `vi.stubGlobal('fetch', …)` — globals and mocks are auto-restored between tests.
- Run: `pnpm --filter web test` (or `test:watch`).

## Gotcha: Git Bash on Windows

Git Bash rewrites `VITE_API_URL=/api` into a Windows path (`C:/Program Files/Git/api`). For a local production-like build prefix the command with `MSYS_NO_PATHCONV=1`. Docker builds on Linux are unaffected.
