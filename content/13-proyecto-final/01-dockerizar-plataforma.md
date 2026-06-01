---
title: "Dockerizar la plataforma del curso"
slug: "dockerizar-plataforma"
order: 1
summary: "Recorrido real por los Dockerfiles y los compose (dev y prod) de este repo."
---

# Dockerizar la plataforma del curso

Esta misma plataforma (un backend **FastAPI** que sirve las lecciones y un frontend **React** que las renderiza) esta dockerizada. Vamos a recorrer sus ficheros reales y explicar cada decision: multi-stage, usuario no-root, healthchecks, dos stacks de Compose y hot reload.

## Teoria

La estructura del repositorio es:

```output
backend/Dockerfile        # FastAPI (Python) multi-stage
frontend/Dockerfile       # React -> build -> nginx
frontend/nginx.conf       # nginx que sirve la SPA y proxya /api
docker-compose.yml        # stack de PRODUCCION
docker-compose.dev.yml    # stack de DESARROLLO (hot reload)
content/                  # las lecciones en Markdown (este texto incluido)
```

Dos ideas guian todo el diseno:

- **Una imagen, varios destinos**: cada Dockerfile usa **multi-stage** con stages `development` y `production`. Compose elige el stage con `target:`. Asi dev y prod comparten base (paridad 12-factor).
- **El contenido se monta, no se hornea**: las lecciones de `content/` se montan como volumen de **solo lectura**, asi editar una leccion no obliga a reconstruir la imagen.

## Manos a la obra

### Backend: `backend/Dockerfile`

Multi-stage con una base comun, una capa de dependencias cacheable, y stages de desarrollo y produccion:

```dockerfile
# ---- Base comun ----
FROM python:3.13-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

# ---- Dependencias (capa cacheable) ----
FROM base AS deps
COPY requirements.txt ./
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# ---- Produccion ----
FROM base AS production
COPY --from=deps /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN groupadd --system --gid 1001 appgroup \
    && useradd --system --uid 1001 --gid appgroup appuser
COPY --chown=appuser:appgroup app ./app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0) if urllib.request.urlopen('http://localhost:8000/api/health').status==200 else sys.exit(1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Decisiones clave del backend:

- **`python:3.13-slim`**: base ligera con tag de version fijo (no `latest`).
- **Variables `PYTHON*` y `PIP_*`**: `PYTHONUNBUFFERED=1` saca los logs a stdout sin buffer (clave para `docker logs`); `PYTHONDONTWRITEBYTECODE=1` evita `.pyc`; las `PIP_*` evitan cache y ruido.
- **Stage `deps` separado + venv en `/opt/venv`**: las dependencias se instalan en su propia capa. Como `requirements.txt` se copia **antes** que el codigo, mientras no cambien las deps esa capa se reaprovecha de cache. El `--mount=type=cache` acelera reinstalaciones (necesita BuildKit, activado por `# syntax=docker/dockerfile:1`).
- **Usuario no-root (`appuser`, UID/GID 1001)**: el `COPY --chown` y el `USER appuser` hacen que el proceso corra sin privilegios.
- **`HEALTHCHECK`**: golpea `/api/health` con la libreria estandar (sin instalar `curl`), saliendo 0/1 segun el codigo HTTP.
- **Exec form en `CMD`**: `uvicorn` es el PID 1 y recibe SIGTERM directamente (apagado limpio).

El stage `development` (que omitimos arriba por brevedad) reusa el mismo `deps` pero arranca con `--reload` para recargar al cambiar el codigo.

### Frontend: `frontend/Dockerfile`

Construye los estaticos de React con Node y los sirve con nginx:

```dockerfile
# ---- Dependencias ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---- Build de produccion ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runtime: nginx sirviendo los estaticos ----
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

Decisiones clave del frontend:

- **Patron build -> runtime**: Node solo se usa para compilar; la imagen final es **nginx**. Node y `node_modules` no viajan a produccion, asi que la imagen final es pequena y con menos superficie de ataque.
- **`npm ci` con `package*.json` copiado antes**: instalacion reproducible y cache de dependencias mientras no cambie el lockfile.
- **`nginx:1.27-alpine`** sirviendo `dist/` en el puerto 80.
- **Healthcheck con `wget --spider`**: nginx alpine trae `wget`, asi que comprueba que responde sin instalar nada.
- **`nginx -g "daemon off;"`** en exec form: nginx en primer plano como PID 1.

### nginx: `frontend/nginx.conf`

```output
location /api/ {
    proxy_pass http://backend:8000;   # nombre de servicio en Compose
    ...
}
location / {
    try_files $uri $uri/ /index.html; # SPA: rutas desconocidas -> index.html
}
location /assets/ {
    expires 30d;                      # cache larga para assets con hash
    add_header Cache-Control "public, immutable";
}
```

Tres responsabilidades: **proxya `/api/`** al servicio `backend` (resolucion por DNS interno de Compose), **sirve la SPA** redirigiendo rutas desconocidas a `index.html` (React Router), y **cachea los assets** con hash 30 dias.

### Produccion: `docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: ./backend
      target: production
    image: curso-docker/backend:latest
    environment:
      CONTENT_DIR: /content
      CORS_ORIGINS: http://localhost:8080
    volumes:
      - ./content:/content:ro
    networks: [app]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health').status==200 else 1)"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits: { cpus: "0.5", memory: 256M }

  frontend:
    build:
      context: ./frontend
      target: production
    image: curso-docker/frontend:latest
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "8080:80"
    networks: [app]
    restart: unless-stopped
    deploy:
      resources:
        limits: { cpus: "0.5", memory: 128M }

  db:
    image: postgres:16-alpine
    profiles: ["db"]
    environment:
      POSTGRES_USER: curso
      POSTGRES_PASSWORD: curso
      POSTGRES_DB: curso
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [app]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U curso"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  app:
    driver: bridge
volumes:
  pgdata:
```

Decisiones clave de produccion:

- **`target: production`** en ambos servicios: usa el stage final de cada Dockerfile.
- **`content` montado `:ro`**: las lecciones se sirven en solo lectura; editarlas no requiere rebuild.
- **`depends_on: condition: service_healthy`**: el frontend no arranca hasta que el backend pasa su healthcheck (no basta con que "este running").
- **Solo `frontend` publica puerto** (`8080:80`); el backend solo es accesible por la red interna `app`. Menos superficie expuesta.
- **`restart: unless-stopped`**: resiliencia ante caidas, respetando paradas manuales.
- **`deploy.resources.limits`**: topes de CPU/memoria para que ningun servicio ahogue al host.
- **`db` con `profiles: ["db"]`**: opcional, solo se levanta con `--profile db`. Su volumen `pgdata` persiste los datos y tiene healthcheck con `pg_isready`.

Levanta el stack de produccion:

```compare
# CMD
docker compose up --build -d
docker compose ps
# OUT
NAME                     IMAGE                          STATUS
curso-docker-backend-1   curso-docker/backend:latest    Up (healthy)
curso-docker-frontend-1  curso-docker/frontend:latest   Up
# frontend en http://localhost:8080
```

### Desarrollo: `docker-compose.dev.yml`

```yaml
services:
  backend:
    build:
      context: ./backend
      target: development
    environment:
      CONTENT_DIR: /content
      CORS_ORIGINS: http://localhost:5173
    volumes:
      - ./backend/app:/app/app
      - ./content:/content:ro
    ports:
      - "8000:8000"
    networks: [app]

  frontend:
    build:
      context: ./frontend
      target: development
    environment:
      VITE_API_PROXY_TARGET: http://backend:8000
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
      - ./frontend/index.html:/app/index.html
      - /app/node_modules
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks: [app]

networks:
  app:
    driver: bridge
```

Decisiones clave de desarrollo:

- **`target: development`**: el backend arranca uvicorn con `--reload` y el frontend con el dev server de Vite (HMR).
- **Bind mounts del codigo** (`./backend/app`, `./frontend/src`...): editas en el host y el contenedor recarga al instante, sin reconstruir.
- **Volumen anonimo `/app/node_modules`**: truco clasico para que el bind mount del frontend **no pise** el `node_modules` que ya esta dentro de la imagen. Sin esta linea, el mount del codigo taparia las dependencias instaladas.
- **Ambos puertos publicados** (`8000` y `5173`): en dev quieres acceder directo al backend y al frontend por separado.
- **`depends_on` simple** (sin `service_healthy`): en dev basta con el orden de arranque; no se necesita la espera estricta de produccion.

Levanta el stack de desarrollo con hot reload:

```compare
# CMD
docker compose -f docker-compose.dev.yml up --build
# OUT
frontend-1  | VITE ready in 412 ms
frontend-1  | Local: http://localhost:5173/
backend-1   | Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
backend-1   | Application startup complete.
```

## Flags y variantes

| Comando | Para que sirve |
| --- | --- |
| `docker compose up --build -d` | Levanta el stack de PRODUCCION en segundo plano |
| `docker compose -f docker-compose.dev.yml up --build` | Levanta el stack de DESARROLLO con hot reload |
| `docker compose --profile db up -d` | Anade el servicio `db` (Postgres) opcional |
| `docker compose ps` | Estado de los servicios (incluye `healthy`) |
| `docker compose logs -f backend` | Sigue los logs de un servicio |
| `docker compose build backend` | Reconstruye solo un servicio |
| `docker compose down` | Para y elimina contenedores y red |
| `docker compose down -v` | Ademas borra los volumenes (¡cuidado con `pgdata`!) |

## Pruebalo tu

1. Desde la raiz del repo, levanta produccion: `docker compose up --build -d` y abre `http://localhost:8080`.
2. Comprueba la salud: `docker compose ps` (el backend debe figurar como `healthy`).
3. Edita una leccion en `content/...md` y recarga el navegador: cambia sin rebuild gracias al volumen `:ro`.
4. Mira los logs del backend: `docker compose logs -f backend`.
5. Para todo: `docker compose down`. Luego prueba el modo dev: `docker compose -f docker-compose.dev.yml up --build` y entra en `http://localhost:5173`.
6. Reto: levanta el perfil de base de datos con `docker compose --profile db up -d` y verifica con `docker compose ps` que `db` esta `healthy`.

## Errores comunes

- **`port is already allocated` en 8080/5173/8000**: ya tienes algo en ese puerto. Para el otro stack (`docker compose down`) o cambia el mapeo.
- **El frontend no encuentra `/api`**: en prod, nginx proxya a `http://backend:8000`; si renombras el servicio `backend`, rompes la resolucion DNS. Manten el nombre o ajusta `nginx.conf`.
- **Editar una leccion y no ver cambios**: en prod el contenido se monta `:ro` y se relee, pero si tocas codigo del backend si necesitas el stack dev (o rebuild), porque la imagen de prod horneó el codigo.
- **`node_modules` desaparece en dev**: falta el volumen anonimo `/app/node_modules`; sin el, el bind mount del codigo tapa las dependencias de la imagen.
- **`docker compose down -v` borra la BD**: el flag `-v` elimina `pgdata`. No lo uses si quieres conservar los datos de Postgres.

> Idea clave: la plataforma aplica todo lo del curso en un caso real: multi-stage con stages dev/prod, usuario no-root y healthcheck en el backend, patron build->nginx en el frontend, y dos Compose que comparten imagenes pero difieren en `target`, mounts y puertos. El contenido se monta `:ro` para iterar sin reconstruir.
