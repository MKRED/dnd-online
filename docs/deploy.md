# Deploy

Production: https://dnd.aoshi.ru, on the author's home server.

## Pipeline

Push to the `deploy` branch (or run the workflow manually) → `.github/workflows/deploy.yml`, the same pattern as the author's `tg-rp-bot`:

0. **Tests first.** The `test` job calls `.github/workflows/test.yml`; the `deploy` job `needs` it, so a failing check means nothing is built or deployed. The same workflow also runs on every push to `master` (so a usual deploy runs it twice: once for `master`, once inside the deploy). It runs on a GitHub runner with Node 24 and pnpm from `packageManager`: build `shared`, `pnpm test`, `pnpm lint` (then `git diff --exit-code`, because the apps' lint runs with `--fix`), `pnpm format:check`, and the integration tests against a throwaway `postgres:17` service container (`dnd_online_test`; CI never touches the server's databases). The JWT secrets there are dummy values for signing test tokens.
1. A `docker context` over SSH points at the server's Docker daemon; the root `Dockerfile` is built **on the server** (no registry).
2. `docker-compose.yml` is uploaded to `/mnt/ssd/docker/dnd_online/`.
3. `drizzle-kit migrate` runs via `docker compose run --rm api`; if it fails, the old container keeps running.
4. `docker compose up -d --force-recreate api`, then dangling images are pruned.

Requires the `DEPLOY_CICD` secret (SSH private key) in the GitHub repo. The server-side `.env` next to the compose file is created by hand and never touched by CI. Deploys are serialized (`concurrency: deploy`).

## Image and runtime

- One image serves both: the web build (`VITE_API_URL=/api`) is copied into `apps/server/public` and served by Nest (see [server.md](server.md#http-surface)).
- The runtime image keeps dev dependencies on purpose: `drizzle-kit` for migrations, `pino-pretty` for the `logs/app.log` transport.
- The container joins the external `postgres-network` and `nginx-network`. Edge-nginx (separate `nginx` container, `/etc/nginx/conf.d/dnd.aoshi.ru.conf`) terminates HTTPS and proxies the domain to `dnd_online:3000`, appending the client IP to `X-Forwarded-For`.
- The production DB is currently the same database as dev.
- **Upload size.** Character images are uploaded as files of up to 10 MB, and nginx rejects bodies over 1 MB by default (413). So the `listen 443` block of `dnd.aoshi.ru.conf` has `client_max_body_size 12m;` (set 2026-10-14; checked: a 4.9 MB upload goes through, an 11 MB one gets the app's own Russian 413). 12 MB, not 10, so a file just over the app limit is refused by the app with a readable message rather than by nginx. The file lives on the host in `/mnt/ssd/dockerdirs/nginx/conf.d/`, mounted read-only into the `nginx` container: edit it on the host as root, then `docker exec nginx nginx -t && docker exec nginx nginx -s reload`.
- **Sign-in through lolka** ([plan/done/lolka-login.md](plan/done/lolka-login.md)), live since 2026-10-14:
  - the server `.env` holds `LOLKA_CLIENT_ID`, `LOLKA_CLIENT_SECRET` (shown by lolka once; a new one is issued in the lolka app) and `LOLKA_REDIRECT_URI=https://dnd.aoshi.ru/api/auth/lolka/callback`. Without `LOLKA_CLIENT_ID` the feature is simply off. A changed `.env` takes effect when the container is recreated, e.g. by the next deploy;
  - `dnd.aoshi.ru.conf` has, in the `listen 443` block, `location = /.well-known/lolka-app.txt { default_type text/plain; return 200 "lolka-app-…
"; }` with the domain verification code. Don't remove it: lolka re-checks it daily. The code isn't kept in the repo; it's in that file on the host;
  - quick check: `curl https://dnd.aoshi.ru/api/auth/providers` answers `{"lolka":true}`.
- **The game socket** (Socket.IO at `/api/socket.io`, since 2026-10-20) works through any proxy by long-polling, but a real WebSocket needs the upgrade headers. **Done on 2026-10-21:** the `listen 443` block of `dnd.aoshi.ru.conf` has a `location /api/socket.io/` with them (it proxies to the `dnd_online_up` upstream like `location /`; an earlier block had the path `/socket.io/` without `/api` and never matched). Its shape, applied with `docker exec nginx nginx -t && docker exec nginx nginx -s reload`:

  ```nginx
  location /api/socket.io/ {
      proxy_pass http://dnd_online:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_read_timeout 1h;
  }
  ```

  Check (2026-10-21: 101 from prod): `curl -i --http1.1 -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" "https://dnd.aoshi.ru/api/socket.io/?EIO=4&transport=websocket"` answers `101 Switching Protocols` (without the headers the app answers 400). In the browser's network tab the lobby has a `websocket` request to `/api/socket.io/?EIO=4&transport=websocket` with status 101, and the polling requests stop. The socket is checked locally on the built server (helmet's CSP `default-src 'self'` lets the same-origin WebSocket through).

- `sharp` (image processing) brings native `@img/*` binaries as optional dependencies; the image builds and runs with it (first deployed 2026-10-14).

## Checking production from the server

Hairpin NAT doesn't work: from the server itself the public domain hangs. Resolve it to localhost instead:

```bash
curl --resolve dnd.aoshi.ru:443:127.0.0.1 https://dnd.aoshi.ru/api/auth/me
```
