# Python app (FastAPI, multi-stage + venv + non-root + healthcheck)

API mínima con FastAPI servida por Uvicorn: `/` devuelve `hola docker` y `/health` el estado.

## Que demuestra

- **Build multi-stage con venv**: la etapa `builder` crea `/opt/venv` con las dependencias y la etapa `runtime` solo lo copia (no arrastra cache de pip).
- **Usuario non-root con UID/GID fijos**: `appuser` (1001:1001) creado explicitamente.
- **HEALTHCHECK** sin `curl`: usa `urllib` de la propia stdlib de Python.
- **Imagen pequeña**: base `python:3.13-slim`.

## Construir

```bash
docker build -t curso/python-app .
```

## Ejecutar

```bash
docker run --rm -p 8000:8000 --name python-app curso/python-app
```

- App: http://localhost:8000  -> `{"mensaje":"hola docker"}`
- Health: http://localhost:8000/health  -> `{"status":"ok"}`
- Docs automaticas: http://localhost:8000/docs

## Que observar

```bash
# Estado del healthcheck
docker ps

# Confirmar usuario non-root (uid=1001 appuser)
docker exec python-app id

# Detalle del estado de salud
docker inspect --format '{{json .State.Health}}' python-app
```

Para parar: `Ctrl+C` (o `docker stop python-app`).
