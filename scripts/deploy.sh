#!/usr/bin/env bash
set -euo pipefail

DEVICE="${WEBOS_DEVICE:-minhatv}"
APP_ID="br.jonis.launcher"
VERSION="1.0.1"
IPK="${APP_ID}_${VERSION}_all.ipk"

echo "==> Build"
npm run build

echo "==> Package"
ares-package dist

echo "==> Install on ${DEVICE}"
ares-install --device "${DEVICE}" "${IPK}"

echo "==> Launch"
ares-launch --device "${DEVICE}" "${APP_ID}"

echo "==> Done"
