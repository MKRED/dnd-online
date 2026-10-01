# Deploy

Production: https://dnd.aoshi.ru, on the author's home server.

## Pipeline

Push to the `deploy` branch (or run the workflow manually) → `.github/workflows/deploy.yml`, the same pattern as the author's `tg-rp-bot`:

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

## Checking production from the server

Hairpin NAT doesn't work: from the server itself the public domain hangs. Resolve it to localhost instead:

```bash
curl --resolve dnd.aoshi.ru:443:127.0.0.1 https://dnd.aoshi.ru/api/auth/me
```
