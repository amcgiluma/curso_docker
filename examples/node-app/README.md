# Node app (multi-stage + non-root + healthcheck)

App mínima con Express que responde `hola docker` en `/` y un endpoint `/health`.

## Que demuestra

- **Build multi-stage**: una etapa `deps` instala dependencias (cacheable) y una etapa `runtime` ligera solo copia lo necesario.
- **Usuario non-root**: el contenedor corre como el usuario `node` (uid 1000), no como root.
- **HEALTHCHECK**: Docker comprueba `/health` periódicamente sin depender de `curl` (usa el propio `node`).
- **Imagen pequeña**: base `node:22-alpine`.

## Construir

```bash
docker build -t curso/node-app .
```

## Ejecutar

```bash
docker run --rm -p 3000:3000 --name node-app curso/node-app
```

- App: http://localhost:3000  -> `hola docker`
- Health: http://localhost:3000/health  -> `{"status":"ok"}`

## Que observar

```bash
# El healthcheck pasa a "healthy" tras unos segundos
docker ps

# Confirmar que NO corre como root (uid=1000 node)
docker exec node-app id

# Ver el detalle del estado de salud
docker inspect --format '{{json .State.Health}}' node-app
```

Para parar: `Ctrl+C` (o `docker stop node-app`).
