---
title: "Qué es BuildKit"
slug: "buildkit"
order: 1
summary: "BuildKit, DOCKER_BUILDKIT y las mejoras frente al builder clásico."
---

# Qué es BuildKit

**BuildKit** es el motor de construcción moderno de Docker. Sustituye al builder clásico y aporta builds más rápidos, cache inteligente, ejecución en paralelo y nuevas capacidades como los `--mount` de cache, secret y ssh.

## Teoría

El builder antiguo procesaba el Dockerfile de forma líneal, capa a capa. BuildKit construye un **grafo de dependencias** y:

- **Paraleliza** etapas independientes de un multi-stage build.
- **Salta** etapas que no se necesitan para el `target` solicitado.
- Tiene una **cache** más granular y exportable/importable.
- Soporta `RUN --mount` para **cache de paquetes**, **secretos** y **claves ssh** sin dejarlos en la imagen.
- Muestra una salida más clara y resumida.

En Docker moderno (Docker Desktop y Engine recientes) **BuildKit ya es el motor por defecto**. En instalaciones antiguas se activaba con la variable `DOCKER_BUILDKIT=1`. Para usar la sintaxis más reciente del Dockerfile conviene declarar la cabecera `# syntax=docker/dockerfile:1`.

> `docker build` usa BuildKit por defecto; `docker buildx build` siempre usa BuildKit y añade funciones extra (multi-plataforma, builders remotos), que verás en las siguientes lecciones.

## Manos a la obra

Un Dockerfile que aprovecha la cabecera de sintaxis y la cache de paquetes:

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

Construye y observa la salida tipica de BuildKit (con `=> => ` y etapas):

```compare
# CMD
docker build -t demo-buildkit .
# OUT
[+] Building 4.2s (10/10) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: <bytes>
 => [internal] load metadata for docker.io/library/python:3.12-slim
 => [1/4] FROM docker.io/library/python:3.12-slim@<sha256>
 => [2/4] WORKDIR /app
 => [3/4] COPY requirements.txt .
 => [4/4] RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
 => exporting to image
 => => naming to docker.io/library/demo-buildkit
```

Si tu Docker fuese antiguo, activarias BuildKit así (en PowerShell):

```bash
$env:DOCKER_BUILDKIT=1
docker build -t demo-buildkit .
```

Comprueba que tienes BuildKit/buildx disponible:

```compare
# CMD
docker buildx version
# OUT
github.com/docker/buildx v0.<x>.<y> <hash>
```

## Flags y variantes

| Elemento | Qué hace |
| --- | --- |
| `# syntax=docker/dockerfile:1` | Usa la última sintaxis estable del Dockerfile (frontend) |
| `DOCKER_BUILDKIT=1` | Activa BuildKit en Docker antiguos (hoy es el por defecto) |
| `DOCKER_BUILDKIT=0` | Fuerza el builder clásico (legacy) |
| `RUN --mount=type=cache,target=<ruta>` | Cache persistente entre builds (no va a la imagen) |
| `RUN --mount=type=bind,...` | Monta ficheros del contexto solo durante el `RUN` |
| `--progress=plain` | Muestra la salida completa, útil para depurar |
| `--no-cache` | Ignora la cache y reconstruye todo |
| `docker buildx version` | Comprueba la versión de buildx |

## Pruébalo tú

1. Crea el `Dockerfile` del ejemplo con `# syntax=docker/dockerfile:1` y un `requirements.txt` con alguna dependencia (p. ej. `requests`).
2. Construye con `docker build -t demo-buildkit .` y fíjate en la salida tipo grafo de BuildKit.
3. Vuelve a construir sin cambiar nada: notaras que reútiliza cache y va mucho más rápido.
4. Ejecuta con `--progress=plain` para ver la salida detallada de cada paso.
5. Comprueba tu versión con `docker buildx version`.

## Errores comunes

- **`the --mount option requires BuildKit`**: estás en el builder clásico. Activa BuildKit (`DOCKER_BUILDKIT=1`) o usa una versión de Docker reciente.
- **`Unknown flag: --mount` o sintaxis no reconocida**: falta la cabecera `# syntax=docker/dockerfile:1` en la primera línea del Dockerfile.
- **La cache de `--mount=type=cache` "no persiste"**: es cache de build, no se incluye en la imagen; si limpias el builder (`docker buildx prune`) se va. Es normal.
- **Salida poco clara al depurar**: usa `--progress=plain` para ver los comandos y logs completos.

> Idea clave: BuildKit es el motor moderno (ya por defecto) con builds paralelos, mejor cache y `RUN --mount`; declara `# syntax=docker/dockerfile:1` para acceder a la sintaxis más reciente.
