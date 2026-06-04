---
title: "Cache mounts de BuildKit y buenas prácticas de build"
slug: "cache-mounts"
order: 4
summary: "RUN --mount=type=cache para acelerar instalaciones y otras buenas prácticas de build."
---

# Cache mounts de BuildKit y buenas prácticas de build

La cache de capas reútiliza una capa **entera o nada**. Los **cache mounts** de BuildKit van un paso más alla: cachean el directorio de un gestor de paquetes (npm, pip, apt, go...) **entre builds**, aunque la capa se reconstruya. Resultado: instalaciones mucho más rápidas.

## Teoría

`RUN --mount=type=cache,target=<dir>` monta un directorio cacheado y persistente **solo durante ese `RUN`**. No queda en la imagen final, pero se conserva para el siguiente build. Es ideal para las carpetas de cache de los gestores de paquetes:

| Gestor | Directorio a cachear |
| --- | --- |
| npm | `/root/.npm` |
| pip | `/root/.cache/pip` |
| apt | `/var/cache/apt` y `/var/lib/apt` |
| Go modules | `/go/pkg/mod` y `/root/.cache/go-build` |
| Maven | `/root/.m2` |

Otros tipos de mount útiles:

- **`type=bind`**: monta ficheros del contexto solo durante el `RUN` (sin copiarlos a una capa).
- **`type=secret`**: expone un secreto (token, clave) en build sin que quede en ninguna capa.
- **`type=ssh`**: reenvía tu agente SSH para clonar repos privados.

Requisitos: BuildKit activo (por defecto en Docker moderno; si no, `DOCKER_BUILDKIT=1`).

> Diferencia con la cache de capas: si cambias `package.json`, la capa `RUN npm install` se invalida y se reconstruye, pero con un cache mount **no se redescargan** los paquetes ya bajados antes: se reútilizan del cache. Ahorras red y tiempo.

## Manos a la obra

Cache mount para npm: aunque la capa se reconstruya, los paquetes se reaprovechan.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
CMD ["node", "server.js"]
```

Primer build (cache vacío) frente al segundo tras cambiar una dependencia:

```compare
# CMD
docker build -t web:1 .
# (cambias una version en package.json)
docker build -t web:2 .
# OUT
 => [4/5] RUN --mount=type=cache,target=/root/.npm npm ci    3.1s
# (sin cache mount esto rondaria 15-30s; aqui reaprovecha los .tgz ya bajados)
```

Cache mount para pip:

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Secret en build sin que quede en la imagen (BuildKit):

```compare
# CMD
echo "mi-token-secreto" > token.txt
docker build --secret id=npmtoken,src=token.txt -t web:secret .
docker history web:secret --no-trunc | grep -i token
# OUT
[+] Building 4.0s ... 
# (sin coincidencias: el token no aparece en ninguna capa)
```

## Flags y variantes

| Mount / flag | Forma | Para qué sirve |
| --- | --- | --- |
| Cache mount | `RUN --mount=type=cache,target=/root/.npm ...` | Cache persistente entre builds |
| Cache con id/sharing | `--mount=type=cache,target=...,id=npm,sharing=locked` | Comparte/serializa el cache entre builds |
| Bind mount | `--mount=type=bind,source=.,target=/src` | Usa ficheros del contexto sin copiarlos a capa |
| Secret | `--mount=type=secret,id=npmtoken` + `--secret id=...,src=...` | Secreto en build, fuera de las capas |
| SSH | `--mount=type=ssh` + `--ssh default` | Clonar repos privados con tu agente SSH |
| Cabecera | `# syntax=docker/dockerfile:1` | Habilita la sintaxis moderna de BuildKit |
| Forzar BuildKit | `DOCKER_BUILDKIT=1 docker build ...` | Si tu entorno no lo trae por defecto |

## Pruébalo tú

1. Añade `# syntax=docker/dockerfile:1` y un cache mount de npm/pip a tu Dockerfile.
2. Construye dos veces cambiando una dependencia y compara el tiempo del paso de instalacion.
3. Comprueba que el cache mount **no** aparece en la imagen final con `docker history` (no verás esa carpeta).
4. Prueba un secret: `docker build --secret id=tok,src=token.txt .` y verifica con `docker history --no-trunc` que el token no está.
5. Mide el ahorro de red desconectando momentaneamente y reconstruyendo: los paquetes ya cacheados no se redescargan.

## Errores comunes

- **`the --mount option requires BuildKit`**: falta la cabecera `# syntax=docker/dockerfile:1` o BuildKit no está activo. Activa `DOCKER_BUILDKIT=1`.
- **Cachear el directorio equivocado**: si apuntas a un `target` que el gestor no usa, no aceleras nada. Revisa la tabla de directorios.
- **Esperar que el cache mount este en la imagen**: no queda en ninguna capa (por diseno); solo acelera el build.
- **Meter secretos con `--build-arg`**: los `ARG` quedan visibles en `history`. Usa `--mount=type=secret` para datos sensibles.
- **`npm install` en vez de `npm ci`**: para builds reproducibles usa `npm ci` (respeta el lockfile).

> Idea clave: los cache mounts (`RUN --mount=type=cache,...`) reaprovechan el cache del gestor de paquetes entre builds aunque la capa se reconstruya, acelerando mucho las instalaciones. Y para datos sensibles, usa `--mount=type=secret`, que nunca queda en las capas.
