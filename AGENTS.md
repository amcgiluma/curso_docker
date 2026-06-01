# AGENTS.md

> Este fichero es lo PRIMERO que debe leer cualquier agente antes de trabajar en el repo.
> Contiene el contexto, las convenciones y la politica de uso de skills del proyecto.

## Que es este proyecto

Plataforma web de un **curso de Docker interactivo, self-paced y de nivel avanzado**
(para quien ya hizo el "Docker Getting Started"). El objetivo del curso es dominar
Docker a fondo: internals, Dockerfiles, todos los comandos y flags, Compose,
seguridad, build avanzado y produccion.

Filosofia del curso: cada leccion muestra un **comando** para ejecutar en la maquina
del alumno y, al lado, la **salida esperada**. La verificacion es **manual/visual**
(el alumno compara su salida real con la esperada). No hay auto-correccion ni se
ejecuta Docker desde el backend.

Enfoque hibrido: la propia plataforma (React + FastAPI) es el proyecto que se va
dockerizando a lo largo del curso, y `examples/` contiene casos puntuales extra.

## Arquitectura

- **frontend/** — SPA en React 19 + Vite + TypeScript + Tailwind v4. Renderiza el
  contenido en Markdown y resalta los bloques de codigo. Guarda el progreso en
  `localStorage`. Habla con el backend via `/api` (proxy de Vite en dev, proxy de
  nginx en prod).
- **backend/** — API FastAPI (solo lectura) que escanea `content/` y expone los
  modulos y lecciones en `/api/modules` y `/api/lessons/{modulo}/{leccion}`.
- **content/** — El curso en si: una carpeta por modulo (`NN-slug/`) con un
  `module.json` y lecciones `.md` con frontmatter. Es la fuente de verdad del contenido.
- **examples/** — Casos de practica autocontenidos (node, python, nginx, networking,
  volumes, multi-arch).

```
content/NN-slug/module.json   -> { slug, title, order, summary }
content/NN-slug/NN-leccion.md -> frontmatter { title, slug, order, summary } + cuerpo
```

## Setup y comandos

### Opcion A: Docker (recomendada)

- Desarrollo (hot reload): `docker compose -f docker-compose.dev.yml up --build`
  - Frontend (Vite): http://localhost:5173
  - Backend (FastAPI): http://localhost:8000/api/modules
- Produccion: `docker compose up --build -d`
  - App (nginx): http://localhost:8080
- Con base de datos opcional (modulo de Compose): `docker compose --profile db up`

### Opcion B: local sin Docker

- Backend:
  - `cd backend`
  - `python -m venv .venv && .venv\Scripts\activate` (Windows) o `source .venv/bin/activate`
  - `pip install -r requirements.txt`
  - `uvicorn app.main:app --reload` (sirve en :8000; lee `../content` por defecto)
- Frontend:
  - `cd frontend`
  - `npm install`
  - `npm run dev` (sirve en :5173 y proxya `/api` a :8000)

## Build y lint

- Frontend build: `cd frontend && npm run build` (salida en `frontend/dist/`)
- Frontend lint: `cd frontend && npm run lint`
- Frontend typecheck: `cd frontend && npx tsc -b`
- Validar compose: `docker compose config` y `docker compose -f docker-compose.dev.yml config`

## Despliegue

- **Local / self-host:** Docker Compose (ver arriba). El frontend habla con FastAPI via `/api`.
- **Vercel (estatico, sin backend):** `node scripts/build-content.mjs` genera
  `frontend/public/content.json` desde `content/`, y `frontend/src/api.ts` lo detecta
  y entra en modo estatico (si no existe ese JSON, usa la API de FastAPI). La config
  esta en `vercel.json` (installCommand, buildCommand, outputDirectory, rewrite SPA).
  El `content.json` esta en `.gitignore` y en `frontend/.dockerignore`, de modo que las
  imagenes Docker NO lo incluyen y siguen usando la API.

## Convenciones de codigo

- **Frontend**: TypeScript estricto, componentes funcionales, React Router v7. Estilos
  con utilidades Tailwind y tokens definidos en `src/index.css` (`@theme`). Los estilos
  del Markdown viven en la clase `.prose-docker`.
- **Backend**: FastAPI con type hints y modelos Pydantic en `app/models.py`. El parseo
  del contenido esta aislado en `app/content.py`. Mantener la API de **solo lectura**.
- **Contenido**: ver la skill `course-lesson-authoring` (formato obligatorio de leccion).

### Bloques de codigo especiales en las lecciones

El renderer (`frontend/src/components/Markdown.tsx`) interpreta el lenguaje del bloque:

- ` ```compare ` con marcadores `# CMD` / `# OUT` -> comando + salida esperada lado a lado.
- ` ```bash ` -> tarjeta "Comando" con boton de copiar.
- ` ```output ` -> tarjeta "Salida esperada" (estilo terminal).
- ` ```dockerfile | yaml | json | ... ` -> codigo resaltado con boton de copiar.

## Politica de uso de SKILLS (importante)

Las skills viven en `.agents/skills/`. **No las cargues todas a la vez.** Para cada
tarea, lanza un subagente e inyectale solo la(s) skill(s) que necesite:

- Contenido de lecciones / dockerizacion -> `course-lesson-authoring` + `docker-expert`.
- Backend FastAPI -> `fastapi`.
- Frontend React/Tailwind -> `vercel-react-best-practices` + `tailwind`.
- Generar/actualizar este fichero -> `create-agentsmd`. README -> `create-readme`.
- Si falta una capacidad concreta -> usa `find-skills` para localizar/instalar una skill.
- Si una tarea recurrente lo justifica, crea una nueva skill (con `create-skill`).

## Como anadir contenido

1. Crea/edita la carpeta `content/NN-slug/` con su `module.json`.
2. Anade lecciones `.md` con frontmatter (`title`, `slug`, `order`, `summary`).
3. Sigue el formato de la skill `course-lesson-authoring`.
4. No hace falta reconstruir imagenes: `content/` se monta como volumen de solo lectura.
   El backend cachea el indice; reinicia el backend (o el contenedor) para refrescar.

## Gotchas

- Los `slug` de `module.json` y del frontmatter deben ser unicos y estables: forman
  las URLs (`/m/{moduleSlug}/{lessonSlug}`).
- Evita `version:` en los ficheros compose (obsoleto en Compose v2).
- En contextos no seguros (http sin localhost) el portapapeles del navegador puede
  fallar; el boton "Copiar" lo maneja sin romper la UI.
- Las salidas con valores variables (hashes, IDs, fechas) usan `<...>` a proposito.
