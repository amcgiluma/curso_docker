---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos para levantar, validar y modificar una aplicación multi-servicio con Docker Compose."
---

# Examen práctico

Este examen comprueba si sabes convertir varios `docker run` en una definición Compose reproducible.

## Retos

### Reto 1: valida un compose

Crea una carpeta temporal con este `compose.yaml`:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "${WEB_PORT:-8090}:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - cache
  cache:
    image: redis:7-alpine
```

```compare
# CMD
mkdir html
echo examen compose > html/index.html
docker compose config
# OUT
name: <proyecto>
services:
  cache:
    image: redis:7-alpine
  web:
    ...
```

### Reto 2: levanta y observa

```compare
# CMD
docker compose up -d
docker compose ps
docker compose logs --tail 5 web
# OUT
Container <proyecto>-cache-1  Started
Container <proyecto>-web-1    Started
NAME                  IMAGE            SERVICE   STATUS
...
```

Comprueba `http://localhost:8090`.

### Reto 3: perfil opcional

Añade un servicio `adminer` con `profiles: ["tools"]` y valida que solo aparece al activar el perfil:

```compare
# CMD
docker compose --profile tools config --services
# OUT
cache
web
adminer
```

## Checklist de autoevalúación

- Sé escribir `services`, `ports`, `volumes`, `environment`, `env_file`, `depends_on`, `profiles` y `networks`.
- Sé usar `docker compose config` antes de levantar.
- Sé leer `ps`, `logs`, `exec`, `up`, `down`, `build` y `--scale`.
- Sé diferenciar interpolación `.env` de variables dentro del contenedor.

## Limpieza

```bash
docker compose down -v
```

> Resultado esperado: puedes describir y operar una aplicación multi-contenedor con Compose sin perder de vista redes, volúmenes y configuración.
