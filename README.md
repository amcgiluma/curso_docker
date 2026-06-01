# 🐳 Curso de Docker Interactivo

Un curso **self-paced de nivel avanzado** para dominar Docker de verdad, pensado para
quien ya completo el *Docker Getting Started*. Cada leccion te da un **comando para
ejecutar en tu maquina** y, justo al lado, la **salida esperada**, para que compares
tu resultado al instante y aprendas haciendo.

La plataforma esta construida con **React + Vite + Tailwind** (frontend) y
**FastAPI** (backend), y todo corre con **Docker** — porque el propio curso es,
ademas, un caso real de dockerizacion que estudiaras en el ultimo modulo.

---

## Que vas a aprender

13 modulos que cubren Docker de arriba a abajo:

| #  | Modulo | Contenido |
| -- | ------ | --------- |
| 01 | Fundamentos e internals | Contenedores vs VMs, daemon/containerd/runc, namespaces, cgroups, capas |
| 02 | Imagenes y contenedores | Todos los comandos y flags: `run`, `ps`, `inspect`, `logs`, `exec`, `cp`... |
| 03 | Dockerfiles a fondo | Todas las instrucciones, `CMD` vs `ENTRYPOINT`, cache, `.dockerignore` |
| 04 | Multi-stage y optimizacion | Builds multi-stage, alpine/distroless/scratch, cache mounts |
| 05 | Almacenamiento | Volumes, bind mounts, tmpfs, persistencia y backup |
| 06 | Redes | bridge/host/none/overlay/macvlan, DNS interno, publicacion de puertos |
| 07 | Docker Compose a fondo | Servicios, healthchecks, profiles, override, secrets, deploy |
| 08 | Seguridad | Non-root, capabilities, read-only, secretos, escaneo, limites |
| 09 | Build avanzado | BuildKit, buildx, multi-arch, secret/ssh mounts, bake |
| 10 | Registries | login, tag, push/pull, registro privado, manifests multi-arch |
| 11 | Observabilidad y debugging | logs, events, inspect, stats, depurar contenedores |
| 12 | Produccion | PID 1 y senales, healthchecks, restart policies, logging, 12-factor |
| 13 | Proyecto final | Dockerizar esta misma plataforma (dev y prod) y repaso |

Ademas, `examples/` incluye casos de practica autocontenidos: `node-app`,
`python-app`, `nginx`, `networking`, `volumes` y `multi-arch`.

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) 24+ (recomendado 28+) y Docker Compose v2.
- O, para ejecucion local sin contenedores: Node.js 20+ y Python 3.11+.

---

## Arranque rapido (con Docker)

### Desarrollo (hot reload)

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend (Vite): http://localhost:5173
- Backend (FastAPI): http://localhost:8000/api/modules

### Produccion

```bash
docker compose up --build -d
```

- Abre la app en http://localhost:8080

Para parar todo:

```bash
docker compose down
```

---

## Arranque local (sin Docker)

**Backend**

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend** (en otra terminal)

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 (Vite proxya `/api` al backend en el puerto 8000).

---

## Estructura del proyecto

```
.
├── AGENTS.md               # Contexto para agentes de IA (leer primero)
├── README.md
├── docker-compose.yml      # Stack de produccion (nginx + FastAPI, +db opcional)
├── docker-compose.dev.yml  # Stack de desarrollo (hot reload)
├── frontend/               # React + Vite + TS + Tailwind
│   ├── Dockerfile          # multi-stage: build -> nginx
│   └── src/
├── backend/                # FastAPI (sirve el contenido)
│   ├── Dockerfile          # multi-stage: deps -> runtime non-root
│   └── app/
├── content/                # El curso: 1 carpeta por modulo (module.json + lecciones .md)
│   ├── 01-fundamentos-internals/
│   └── ...
└── examples/               # Casos de practica autocontenidos
    ├── node-app/  python-app/  nginx/
    └── networking/  volumes/  multi-arch/
```

---

## Como funcionan las lecciones

Cada leccion sigue la misma estructura: teoria breve → **comando** → **salida
esperada** → "Pruebalo tu" → flags y variantes → errores comunes → idea clave.

Los bloques `Comando` (azul) traen boton de copiar; los bloques `Salida esperada`
(verde) muestran lo que deberias ver. **Ejecuta el comando en tu terminal y compara.**
Algunas salidas usan marcadores como `<hash>` o `<container-id>` para indicar valores
que cambian en tu entorno.

Tu progreso se guarda automaticamente en el navegador (`localStorage`).

---

## Anadir o editar contenido

1. Crea una carpeta `content/NN-slug/` con un `module.json`:

```json
{ "slug": "mi-modulo", "title": "Mi modulo", "order": 14, "summary": "..." }
```

2. Anade lecciones `.md` con frontmatter:

```markdown
---
title: "Mi leccion"
slug: "mi-leccion"
order: 1
summary: "Una frase de resumen"
---
```

`content/` se monta como volumen de solo lectura, asi que no necesitas reconstruir la
imagen: reinicia el backend para refrescar el indice. Consulta el formato completo en
la skill `.agents/skills/course-lesson-authoring/`.

---

## Desplegar en Vercel (sin backend)

La plataforma puede desplegarse **100% estatica**: como la verificacion es manual y
el contenido no cambia en tiempo de ejecucion, en produccion no hace falta backend.
Un script de build genera `frontend/public/content.json` a partir de `content/` y el
frontend lo consume directamente (con *fallback* automatico a la API de FastAPI cuando
ese JSON no existe, p. ej. en local o en Docker).

Pasos:

1. Importa el repo en [Vercel](https://vercel.com/new). La configuracion ya esta en
   [`vercel.json`](vercel.json), no necesitas tocar ajustes:
   - Install: `npm --prefix frontend ci`
   - Build: `node scripts/build-content.mjs && npm --prefix frontend run build`
   - Output: `frontend/dist`
   - SPA fallback (rewrite a `/index.html`) ya configurado.
2. Deploy. Listo.

Para previsualizar el modo estatico en local:

```bash
node scripts/build-content.mjs        # genera frontend/public/content.json
cd frontend && npm run build && npm run preview
```

> Nota: el `content.json` generado esta en `.gitignore` y en el `.dockerignore` del
> frontend, asi que **Docker sigue usando la API de FastAPI** y solo Vercel usa el
> modo estatico.

---

## Stack tecnico

- **Frontend:** React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router v7,
  `react-markdown` + `react-syntax-highlighter`.
- **Backend:** FastAPI, Uvicorn, Pydantic, PyYAML.
- **Infra:** Docker multi-stage, nginx, Docker Compose (dev y prod), Postgres opcional.

---

## Licencia

MIT. Uselo y adaptelo libremente para aprender y ensenar Docker.
