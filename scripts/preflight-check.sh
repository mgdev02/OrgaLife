#!/usr/bin/env bash
# Pre-flight check antes de publicar OrgaLife en GitHub.
# Uso: npm run preflight   o   bash scripts/preflight-check.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

errors=0
warnings=0

fail() {
  echo -e "${RED}✗${NC} $1"
  errors=$((errors + 1))
}

warn() {
  echo -e "${YELLOW}!${NC} $1"
  warnings=$((warnings + 1))
}

ok() {
  echo -e "${GREEN}✓${NC} $1"
}

echo "OrgaLife — preflight para GitHub"
echo "Raíz: $ROOT"
echo ""

# --- Carpetas que no deben subirse (presencia local) ---
HEAVY_OR_FORBIDDEN=(
  "node_modules"
  "dist"
  "src-tauri/target"
  "dist-electron"
  "release"
  "electron"
)

echo "1) Artefactos locales (deben estar en .gitignore, no en el repo)"
for dir in "${HEAVY_OR_FORBIDDEN[@]}"; do
  if [[ -d "$dir" ]]; then
    size="$(du -sh "$dir" 2>/dev/null | cut -f1 | tr -d ' ')"
    if [[ "$dir" == "node_modules" || "$dir" == "dist" || "$dir" == "src-tauri/target" ]]; then
      ok "$dir/ existe localmente ($size) — correcto si está ignorado"
    else
      warn "$dir/ existe ($size) — legado Electron o basura; podés borrarla: rm -rf $dir"
    fi
  else
    ok "Sin carpeta $dir/"
  fi
done
echo ""

# --- Archivos de entorno y firmas ---
echo "2) Secretos y firmas en el árbol del proyecto (excl. node_modules y target)"
shopt -s nullglob
secret_hits=()
for pattern in .env .env.local .env.production; do
  [[ -f "$pattern" ]] && secret_hits+=("$pattern")
done
while IFS= read -r -d '' f; do
  secret_hits+=("$f")
done < <(find . -path ./node_modules -prune -o -path ./src-tauri/target -prune -o \
  \( -name '*.pem' -o -name '*.p12' -o -name '*.key' -o -name 'sign-*' \) -print 0 2>/dev/null)

if [[ ${#secret_hits[@]} -gt 0 ]]; then
  for f in "${secret_hits[@]}"; do
    fail "Archivo sensible encontrado: $f (no debe commitearse)"
  done
else
  ok "No hay .env ni claves PEM/P12/sign-* en el proyecto"
fi
echo ""

# --- .DS_Store ---
echo "3) Archivos de sistema macOS"
ds_count="$(find . -name '.DS_Store' -not -path './node_modules/*' -not -path './src-tauri/target/*' 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$ds_count" -gt 0 ]]; then
  warn "$ds_count archivo(s) .DS_Store — borrar: find . -name .DS_Store -not -path './node_modules/*' -delete"
else
  ok "Sin .DS_Store fuera de dependencias"
fi
echo ""

# --- Git (si existe) ---
echo "4) Estado de Git"
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  warn "No hay repositorio git inicializado. Antes del push: git init && git add . && git status"
else
  if git check-ignore -q src-tauri/target 2>/dev/null; then
    ok "src-tauri/target/ está ignorado por git"
  else
    fail "src-tauri/target/ NO está ignorado — revisá .gitignore"
  fi

  tracked_heavy="$(git ls-files 2>/dev/null | grep -E '^(src-tauri/target/|node_modules/|dist/|\.env)' || true)"
  if [[ -n "$tracked_heavy" ]]; then
    fail "Archivos pesados o sensibles ya trackeados por git:"
    echo "$tracked_heavy" | sed 's/^/    /'
    echo "    Quitarlos del índice: git rm -r --cached <ruta>  (sin borrar en disco)"
  else
    ok "Nada de target/, node_modules/, dist/ ni .env en el índice"
  fi

  if git grep -l -E 'TAURI_SIGNING_PRIVATE_KEY|APPLE_API_KEY|BEGIN (RSA |OPENSSH )?PRIVATE KEY' -- ':!node_modules' ':!src-tauri/target' 2>/dev/null | head -5 | grep -q .; then
    fail "Posible secreto embebido en código — revisá: git grep -E 'PRIVATE KEY|TAURI_SIGNING'"
  else
    ok "Sin patrones obvios de claves en el código versionado"
  fi
fi
echo ""

# --- Resumen ---
echo "----------------------------------------"
if [[ "$errors" -gt 0 ]]; then
  echo -e "${RED}Preflight FALLÓ${NC}: $errors error(es), $warnings advertencia(s)"
  echo "Corregí los errores antes de git push."
  exit 1
fi

if [[ "$warnings" -gt 0 ]]; then
  echo -e "${YELLOW}Preflight OK con advertencias${NC}: $warnings advertencia(s)"
  exit 0
fi

echo -e "${GREEN}Preflight OK${NC} — listo para inicializar/commit y push a GitHub."
exit 0
