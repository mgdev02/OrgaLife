#!/usr/bin/env bash
set -euo pipefail

KEY="$HOME/.tauri/orgalife.key"

if [[ ! -f "$KEY" ]]; then
  echo ""
  echo "Falta la clave privada del updater: $KEY"
  echo ""
  echo "Generala una vez con:"
  echo "  npx tauri signer generate --write-keys ~/.tauri/orgalife.key"
  echo ""
  exit 1
fi

export TAURI_SKIP_SIGNING=true
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PATH="$KEY"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

exec npx tauri build "$@"
