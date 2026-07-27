#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${COLLABORATE_APP_ROOT:-/opt/collaborate}"
SOURCE_DIR="${APP_ROOT}/source"
WEB_ROOT="${COLLABORATE_WEB_ROOT:-/var/www/collaborate}"
SERVER_NAME="${COLLABORATE_SERVER_NAME:-collaborate.abhinash.dev}"
API_PORT="${COLLABORATE_API_PORT:-5010}"
API_ENV="${COLLABORATE_API_ENV:-/etc/collaborate/api.env}"
WEB_ENV="${COLLABORATE_WEB_ENV:-/etc/collaborate/web.env}"
SITE_PATH="/etc/nginx/sites-available/${SERVER_NAME}"
APP_USER="${COLLABORATE_APP_USER:-collaborate}"
SSL_CERT="/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/${SERVER_NAME}/privkey.pem"
NGINX_TEMPLATE="${SOURCE_DIR}/ops/nginx/collaborate.abhinash.dev.conf.template"

sudo install -d -m 0755 -o ubuntu -g ubuntu "${APP_ROOT}" "${SOURCE_DIR}"
sudo install -d -m 0750 -o "${APP_USER}" -g "${APP_USER}" /var/lib/collaborate
sudo install -d -m 0755 -o root -g root "${WEB_ROOT}" "$(dirname "${API_ENV}")"

if [ ! -f "${API_ENV}" ]; then
  sed \
    -e "s|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=https://${SERVER_NAME}|g" \
    -e "s|^ROOM_STORAGE_PATH=.*|ROOM_STORAGE_PATH=/var/lib/collaborate/rooms.json|g" \
    "${SOURCE_DIR}/ops/env/api.production.env.example" |
    sudo tee "${API_ENV}" >/dev/null
  sudo chmod 0644 "${API_ENV}"
fi

if [ ! -f "${WEB_ENV}" ]; then
  sed \
    -e "s|^VITE_SERVER_URL=.*|VITE_SERVER_URL=https://${SERVER_NAME}|g" \
    "${SOURCE_DIR}/ops/env/web.production.env.example" |
    sudo tee "${WEB_ENV}" >/dev/null
  sudo chmod 0644 "${WEB_ENV}"
fi

if sudo test -f "${SSL_CERT}" && sudo test -f "${SSL_KEY}"; then
  NGINX_TEMPLATE="${SOURCE_DIR}/ops/nginx/collaborate.abhinash.dev.ssl.conf.template"
fi

sed \
  -e "s|__SERVER_NAME__|${SERVER_NAME}|g" \
  -e "s|__WEB_ROOT__|${WEB_ROOT}|g" \
  -e "s|__API_PORT__|${API_PORT}|g" \
  "${NGINX_TEMPLATE}" |
  sudo tee "${SITE_PATH}" >/dev/null

sudo ln -sfn "${SITE_PATH}" "/etc/nginx/sites-enabled/${SERVER_NAME}"
sudo nginx -t
sudo systemctl reload nginx

sudo install -m 0644 -o root -g root \
  "${SOURCE_DIR}/ops/systemd/collaborate-api.service" \
  /etc/systemd/system/collaborate-api.service
sudo systemctl daemon-reload
