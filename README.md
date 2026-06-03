# OrgaLife

[![Repository](https://img.shields.io/badge/GitHub-mgdev02%2FOrgaLife-181717?logo=github)](https://github.com/mgdev02/OrgaLife)

**OrgaLife** es una herramienta de escritorio nativa para organización personal: inbox de tareas, notas diarias, seguimiento académico, finanzas con consola de comandos y carga semanal. Está pensada como panel de productividad en macOS, con ventana overlay, atajo global para mostrar/ocultar y datos guardados localmente en el navegador embebido (sin backend en la nube).

**Stack:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) · [Tailwind CSS v4](https://tailwindcss.com/) · [Vite 8](https://vite.dev/) · [Tauri v2](https://v2.tauri.app/) (Rust).

**macOS:** el build de producción usa compilación **unsigned** local (`TAURI_SKIP_SIGNING=true`), adecuada para desarrollo y uso personal sin certificado de Apple Developer. Para distribución pública firmada, configurá firma de código por separado (no incluida en este repositorio).

## Requisitos

- Node.js 20+
- [Rust](https://www.rust-lang.org/tools/install) (shell nativo Tauri)
- macOS: Xcode Command Line Tools (`xcode-select --install`)

## Desarrollo

```bash
npm install
npm run tauri:dev
```

Levanta Vite en `http://localhost:5173` y abre la ventana nativa de Tauri.

Solo frontend en el navegador:

```bash
npm run dev
```

## Compilación para producción (macOS)

Build sin firma de Apple (desarrollo local / distribución interna):

```bash
npm run tauri:build
```

El script ejecuta `TAURI_SKIP_SIGNING=true tauri build`, que omite la firma de código cuando no hay certificado configurado.

### Artefactos generados

| Tipo | Ruta |
|------|------|
| App bundle | `src-tauri/target/release/bundle/macos/OrgaLife.app` |
| Instalador DMG | `src-tauri/target/release/bundle/dmg/` |

El binario release también queda en `src-tauri/target/release/orgalife`.

Estas rutas están en `.gitignore` y **no deben subirse** a GitHub.

## Publicar en GitHub de forma segura

Antes del primer `git push`:

```bash
npm run preflight
```

El script comprueba que no haya `.env`, claves de firma, carpetas legadas de Electron ni `src-tauri/target/` listos para commitearse.

**Limpieza opcional en disco** (libera ~3 GB si compilaste Tauri):

```bash
rm -rf src-tauri/target dist node_modules
npm install   # cuando vuelvas a desarrollar
```

**Inicializar repo** (si aún no existe):

```bash
git init
git add .
git status    # confirmá que NO aparecen target/, node_modules/, dist/
git commit -m "Initial public release: OrgaLife (Tauri v2)"
git remote add origin https://github.com/mgdev02/OrgaLife.git
git push -u origin main
```

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Vite dev server (web) |
| `npm run build` | Typecheck + build estático en `dist/` |
| `npm run tauri:dev` | App de escritorio en desarrollo |
| `npm run tauri:build` | Empaquetado Tauri para producción (sin firma) |
| `npm run preflight` | Verificación previa a publicar en GitHub |
| `npm run lint` | ESLint |

## Licencia

Añadí el archivo `LICENSE` que corresponda antes de publicar si querés definir términos de uso explícitos.
