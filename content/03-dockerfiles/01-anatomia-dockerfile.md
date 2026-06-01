---
title: "Anatomia de un Dockerfile y el proceso de build"
slug: "anatomia-dockerfile"
order: 1
summary: "Como se construye una imagen, el contexto de build y el papel de BuildKit."
---

# Anatomia de un Dockerfile y el proceso de build

Un Dockerfile es una receta: una lista de instrucciones que `docker build` ejecuta en orden para producir una imagen. Antes de ver cada instruccion, conviene entender que pasa cuando pulsas "build" y que es el famoso "contexto".

## Teoria

Un Dockerfile tipico empieza por `FROM` (imagen base) y encadena instrucciones:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Conceptos clave del proceso de build:

- **Contexto de build**: el ultimo argumento de `docker build` (normalmente `.`). Es el conjunto de ficheros que se **empaqueta y envia** al daemon. `COPY`/`ADD` solo pueden traer ficheros que esten dentro del contexto.
- **Cada instruccion = una capa**: las que cambian el filesystem (`RUN`, `COPY`, `ADD`) crean capas; otras (`ENV`, `WORKDIR`, `CMD`) anaden metadatos.
- **BuildKit**: el constructor moderno (por defecto en Docker actual). Es mas rapido, paraleliza etapas y permite features como cache mounts y secrets.
- **Cache**: si una instruccion y sus entradas no cambian, BuildKit reutiliza la capa cacheada (lo veremos en detalle en otra leccion).

> El contexto pesa: si tu carpeta tiene `node_modules`, `.git` o ficheros enormes, todos se envian al daemon y ralentizan el build. Por eso existe `.dockerignore`.

## Manos a la obra

Crea un Dockerfile minimo y constrúyelo:

```dockerfile
FROM alpine:3.20
RUN echo "construido el $(date)" > /info.txt
CMD ["cat", "/info.txt"]
```

```compare
# CMD
docker build -t demo:1 .
# OUT
[+] Building 1.8s (7/7) FINISHED
 => [internal] load build definition from Dockerfile        0.0s
 => [internal] load .dockerignore                           0.0s
 => [internal] load metadata for docker.io/library/alpine   0.0s
 => [1/2] FROM docker.io/library/alpine:3.20                 0.0s
 => [2/2] RUN echo "construido el $(date)" > /info.txt       0.3s
 => exporting to image                                       0.1s
 => => naming to docker.io/library/demo:1                    0.0s
```

Ejecuta la imagen para ver el resultado:

```compare
# CMD
docker run --rm demo:1
# OUT
construido el Mon Jun  1 14:00:00 UTC 2026
# (la fecha varia segun cuando construyas)
```

Observa el peso del contexto que se envia (fijate en "transferring context"):

```compare
# CMD
docker build -t demo:2 .
# OUT
 => [internal] load build context                            0.0s
 => => transferring context: 134B                            0.0s
 ...
```

## Flags y variantes

| Flag de `docker build` | Para que sirve |
| --- | --- |
| `-t nombre:tag` | Etiqueta la imagen resultante (puedes repetirlo) |
| `-f <ruta>` | Usa un Dockerfile con otro nombre/ubicacion |
| `--no-cache` | Ignora la cache y reconstruye todo |
| `--build-arg CLAVE=val` | Pasa un valor a un `ARG` del Dockerfile |
| `--target <etapa>` | Construye hasta una etapa concreta (multi-stage) |
| `--platform linux/arm64` | Construye para otra arquitectura |
| `--progress=plain` | Salida detallada (util para depurar builds) |
| `--pull` | Refresca la imagen base aunque exista en local |
| `.` (ultimo arg) | Define el contexto de build |

## Pruebalo tu

1. Crea el Dockerfile minimo de arriba y construye `docker build -t demo:1 .`.
2. Ejecuta `docker run --rm demo:1` y comprueba la fecha.
3. Vuelve a construir con `--progress=plain` y lee cada paso `[1/2]`, `[2/2]`.
4. Crea un fichero grande (`fallocate -l 50M big.bin` o similar) en la carpeta y vuelve a construir: nota como crece "transferring context".
5. Mueve el Dockerfile a `docker/Dockerfile` y construye con `-f docker/Dockerfile .`.

## Errores comunes

- **`COPY failed: ... no such file or directory`**: el fichero esta fuera del contexto de build. Mete el fichero dentro de la carpeta del contexto o ajusta el contexto.
- **Build lentisimo en "transferring context"**: estas enviando `node_modules`/`.git`. Anádelos a `.dockerignore`.
- **`failed to read dockerfile`**: el Dockerfile no esta donde build lo busca; usa `-f` con la ruta correcta.
- **Esperar que `$(date)` se evalue en el host**: se evalua **dentro** del contenedor durante el `RUN`, no en tu shell.

> Idea clave: `docker build` envia el contexto al daemon y ejecuta el Dockerfile instruccion por instruccion, creando una capa por cada cambio de filesystem. Manten el contexto pequeno (`.dockerignore`) y recuerda que `COPY`/`ADD` solo ven ficheros del contexto.
