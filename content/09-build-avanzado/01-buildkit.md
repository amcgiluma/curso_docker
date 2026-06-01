---
title: "Que es BuildKit"
slug: "buildkit"
order: 1
summary: "BuildKit, DOCKER_BUILDKIT y las mejoras frente al builder clasico."
---

# Que es BuildKit

**BuildKit** es el motor de construccion moderno de Docker. Sustituye al builder clasico y aporta builds mas rapidos, cache inteligente, ejecucion en paralelo y nuevas capacidades como los `--mount` de cache, secret y ssh.

## Teoria

El builder antiguo procesaba el Dockerfile de forma lineal, capa a capa. BuildKit construye un **grafo de dependencias** y:

- **Paraleliza** etapas independientes de un multi-stage build.
- **Salta** etapas que no se necesitan para el `target` solicitado.
- Tiene una **cache** mas granular y exportable/importable.
- Soporta `RUN --mount` para **cache de paquetes**, **secretos** y **claves ssh** sin dejarlos en la imagen.
- Muestra una salida mas clara y resumida.

En Docker moderno (Docker Desktop y Engine recientes) **BuildKit ya es el motor por defecto**. En instalaciones antiguas se activaba con la variable `DOCKER_BUILDKIT=1`. Para usar la sintaxis mas reciente del Dockerfile conviene declarar la cabecera `# syntax=docker/dockerfile:1`.

> `docker build` usa BuildKit por defecto; `docker buildx build` siempre usa BuildKit y anade funciones extra (multi-plataforma, builders remotos), que veras en las siguientes lecciones.

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

Si tu Docker fuese antiguo, activarias BuildKit asi (en PowerShell):

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

| Elemento | Que hace |
| --- | --- |
| `# syntax=docker/dockerfile:1` | Usa la ultima sintaxis estable del Dockerfile (frontend) |
| `DOCKER_BUILDKIT=1` | Activa BuildKit en Docker antiguos (hoy es el por defecto) |
| `DOCKER_BUILDKIT=0` | Fuerza el builder clasico (legacy) |
| `RUN --mount=type=cache,target=<ruta>` | Cache persistente entre builds (no va a la imagen) |
| `RUN --mount=type=bind,...` | Monta ficheros del contexto solo durante el `RUN` |
| `--progress=plain` | Muestra la salida completa, util para depurar |
| `--no-cache` | Ignora la cache y reconstruye todo |
| `docker buildx version` | Comprueba la version de buildx |

## Pruebalo tu

1. Crea el `Dockerfile` del ejemplo con `# syntax=docker/dockerfile:1` y un `requirements.txt` con alguna dependencia (p. ej. `requests`).
2. Construye con `docker build -t demo-buildkit .` y fijate en la salida tipo grafo de BuildKit.
3. Vuelve a construir sin cambiar nada: notaras que reutiliza cache y va mucho mas rapido.
4. Ejecuta con `--progress=plain` para ver la salida detallada de cada paso.
5. Comprueba tu version con `docker buildx version`.

## Errores comunes

- **`the --mount option requires BuildKit`**: estas en el builder clasico. Activa BuildKit (`DOCKER_BUILDKIT=1`) o usa una version de Docker reciente.
- **`Unknown flag: --mount` o sintaxis no reconocida**: falta la cabecera `# syntax=docker/dockerfile:1` en la primera linea del Dockerfile.
- **La cache de `--mount=type=cache` "no persiste"**: es cache de build, no se incluye en la imagen; si limpias el builder (`docker buildx prune`) se va. Es normal.
- **Salida poco clara al depurar**: usa `--progress=plain` para ver los comandos y logs completos.

> Idea clave: BuildKit es el motor moderno (ya por defecto) con builds paralelos, mejor cache y `RUN --mount`; declara `# syntax=docker/dockerfile:1` para acceder a la sintaxis mas reciente.
