# Production Deployment

This repository deploys to a single Ubuntu host with:

- nginx serving `apps/web/dist`
- systemd running `apps/api/dist/index.js` as the `collaborate` user
- file-backed room state under `/var/lib/collaborate/rooms.json`

## Paths

- app root: `/opt/collaborate`
- synced source: `/opt/collaborate/source`
- API env: `/etc/collaborate/api.env`
- web build env: `/etc/collaborate/web.env`
- room state: `/var/lib/collaborate/rooms.json`
- web root: `/var/www/collaborate`

## Server bootstrap

1. Sync the repository to `${APP_ROOT}/source`.
2. Run `scripts/deploy/bootstrap-server.sh`.
3. Review and edit:
   - `/etc/collaborate/api.env`
   - `/etc/collaborate/web.env`

## GitHub Actions secrets

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_WEB_ROOT`
- `DEPLOY_SSH_KEY`
- `DEPLOY_KNOWN_HOSTS`

## Deploy flow

On every push to `main`, GitHub Actions:

1. runs lint, typecheck, tests, build, and e2e
2. rsyncs the repository to the server
3. runs `scripts/deploy/remote-deploy.sh`

The remote deploy script installs dependencies, builds the current revision, syncs the static frontend to nginx, installs the nginx site, and restarts the `collaborate-api` systemd service.
