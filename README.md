# PesoControl

PWA personal de control de peso basada en el método de **deuda calórica**.
La rama activa es **`front-v2`** (rediseño v2). `main` es código legacy.

## La idea

En vez de perseguir una meta diaria, se trabaja sobre una **deuda calórica acumulada**:

- Tenés un déficit total a saldar para llegar de tu peso inicial a tu meta (a razón de **7700 kcal/kg**).
- Cada día, tu **balance** (calorías consumidas − gasto/TDEE) abona o suma a esa deuda.
- La app calcula tu **peso teórico** y proyecta la **trayectoria** hacia la meta según tu ritmo real.

Filosofía de producto: **juego de constancia, no de perfección**. Tono calmo, sin culpa.
Pasarse un día no es un error (nunca se pinta en rojo). Ver `DESIGN.md` antes de tocar UI.

## Stack

- **Front:** Vite + Preact + TypeScript, PWA (`vite-plugin-pwa`).
- **Backend:** Supabase — Postgres + Auth + RLS + Edge Functions.
- **IA:** Gemini 2.5 Flash estima calorías desde una foto del plato (vía Edge Function; la API key vive como *secret* en Supabase, no en el repo).
- **Deploy:** GitHub Pages, servido en `/PesoControl/app/`.

## Estructura

```
web/                         # Front v2 (Vite + Preact)
  src/lib/ledger.ts          # Modelo de deuda calórica (con tests)
  src/lib/data.ts            # Carga del modelo desde Supabase
  src/lib/auth.ts            # Sesión + reseteo de contraseña (OTP por código)
  src/lib/estimateFood.ts    # Resize de imagen + llamada a la Edge Function
  src/components/            # UI (Hero, Today, WeekLedger, CaptureSheet, Login...)
supabase/
  migrations/                # Esquema de la base
  functions/estimate-food/   # Edge Function (foto -> Gemini -> JSON de kcal)
app/                         # Build estático deployado (lo sirve Pages)
DESIGN.md                    # Sistema de diseño (leer antes de tocar UI)
CLAUDE.md                    # Notas para sesiones de Claude/Codex
```

## Desarrollo local

```bash
git clone -b front-v2 https://github.com/fedeberron-cmyk/PesoControl.git
cd PesoControl/web
npm install
npm run dev        # servidor de desarrollo
npm test           # tests del modelo (vitest)
npm run build      # build de producción
```

La *anon key* de Supabase ya está en el código (es pública por diseño; los datos
los protege RLS). Para solo editar el front no necesitás credenciales extra.

## Deploy

```bash
cd web && npx vite build --base=/PesoControl/app/ && cd ..
rm -rf app && cp -R web/dist app
git add -A && git commit -m "deploy: ..." && git push origin front-v2
```

GitHub Pages reconstruye solo en ~1–2 min. Para `push` desde otra máquina,
autenticáte una vez con `gh auth login`.

## Backend (Supabase)

Las tareas de admin (migraciones, Edge Functions, secrets) requieren un
**Supabase Personal Access Token** que **NO está en el repo** (vive fuera, en la
máquina del dueño).

```bash
# Edge Function: necesita el secret GEMINI_API_KEY configurado en el proyecto
SUPABASE_ACCESS_TOKEN=<token> supabase functions deploy estimate-food --project-ref <ref>
```

## Seguridad

- **RLS activo en todas las tablas**: cada usuario solo lee/escribe sus propias filas (`auth.uid() = user_id`). Sin sesión iniciada, la anon key no devuelve datos.
- **Secrets fuera del repo**: la API key de Gemini es un *secret* de Supabase; el token admin de Supabase vive fuera del repositorio.
- El acceso a la app es por **cuenta** (email + contraseña); el reseteo es por **código de 6 dígitos** al correo.

## Estado

- ✅ Modelo de deuda calórica, home (trayectoria + hoy + semana), Camino, Comidas, Perfil, registro manual.
- ✅ Captura por **foto con IA** (Gemini), con opción de guardar la foto cuando exista el bucket de Storage.
- ✅ Reseteo de contraseña por código.
- ✅ Service worker offline para el shell de la PWA.
- ⏳ Pendiente operativo: aplicar migración `004_food_photo_storage.sql` en Supabase para guardar fotos opcionales.
