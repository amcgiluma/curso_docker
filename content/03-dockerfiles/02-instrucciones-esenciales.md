---
title: "Instrucciones esenciales: FROM, RUN, COPY, ADD, WORKDIR, ENV, ARG"
slug: "instrucciones-esenciales"
order: 2
summary: "Las instrucciones que usaras en casi todo Dockerfile, con COPY vs ADD y ENV vs ARG."
---

# Instrucciones esenciales

Con un punado de instrucciones construyes el 90% de las imagenes. Aqui las clave, con los dos pares que mas dudas generan: **COPY vs ADD** y **ENV vs ARG**.

## Teoria

| Instruccion | Que hace |
| --- | --- |
| `FROM` | Imagen base de partida. Siempre la primera (salvo `ARG` previos) |
| `RUN` | Ejecuta un comando en build y guarda el resultado en una capa |
| `COPY` | Copia ficheros del contexto a la imagen |
| `ADD` | Como COPY, pero ademas descomprime tars locales y acepta URLs |
| `WORKDIR` | Fija el directorio de trabajo (lo crea si no existe) |
| `ENV` | Variable de entorno que persiste en la imagen y en runtime |
| `ARG` | Variable solo disponible **durante el build** |

Pares que confunden:

- **COPY vs ADD**: usa **COPY** casi siempre (es predecible). `ADD` tiene "magia": descomprime automaticamente un `.tar` local y puede descargar de una URL. Esa magia es justo lo que no quieres por sorpresa. Para descargar usa `RUN curl`/`wget` (mas control).
- **ENV vs ARG**: `ARG` vive solo en build (ideal para versiones, no queda en la imagen). `ENV` queda en la imagen y estara disponible cuando ejecutes el contenedor. Un `ARG` puede dar valor por defecto a un `ENV`.

> Buenas practicas: combina varios comandos en un solo `RUN` con `&&` para no crear capas de mas, y limpia caches en la **misma** capa (`apt-get clean`, `rm -rf /var/lib/apt/lists/*`).

## Manos a la obra

Un Dockerfile que usa todas estas instrucciones:

```dockerfile
FROM debian:12-slim
ARG APP_VERSION=1.0.0
ENV APP_VERSION=${APP_VERSION} \
    APP_HOME=/opt/app
WORKDIR ${APP_HOME}
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY app/ ./
CMD ["sh", "-c", "echo app v$APP_VERSION en $APP_HOME"]
```

Construye pasando un `ARG` y ejecuta:

```compare
# CMD
docker build --build-arg APP_VERSION=2.3.1 -t app:2.3.1 .
docker run --rm app:2.3.1
# OUT
[+] Building 6.2s (10/10) FINISHED
...
app v2.3.1 en /opt/app
```

Comprueba que el `ENV` quedo en la imagen pero el `ARG` no es accesible en runtime:

```compare
# CMD
docker run --rm app:2.3.1 env | grep APP_
# OUT
APP_VERSION=2.3.1
APP_HOME=/opt/app
```

Diferencia COPY vs ADD con un tar local (ADD lo descomprime; COPY lo deja tal cual):

```compare
# CMD
docker run --rm app:2.3.1 ls /opt/app
# OUT
index.html
styles.css
```

## Flags y variantes

| Instruccion | Forma / flag util | Nota |
| --- | --- | --- |
| `FROM` | `FROM img AS etapa` | Nombra etapas para multi-stage |
| `RUN` | forma exec `RUN ["bin","arg"]` | Evita la shell intermedia |
| `RUN` | `--mount=type=cache,...` | Cache de paquetes (BuildKit) |
| `COPY` | `--chown=uid:gid` | Asigna propietario al copiar |
| `COPY` | `--from=etapa` | Copia desde otra etapa o imagen |
| `ADD` | `--chown`, URLs, tars | Descomprime tars y baja URLs (usa con criterio) |
| `WORKDIR` | rutas relativas se acumulan | Mejor rutas absolutas |
| `ENV` | `ENV A=1 B=2` | Varias en una linea |
| `ARG` | `ARG X=valor_por_defecto` | Solo en build; se pasa con `--build-arg` |

## Pruebalo tu

1. Crea el Dockerfile del ejemplo y una carpeta `app/` con un `index.html`.
2. Construye con `--build-arg APP_VERSION=2.3.1` y ejecuta para ver la version impresa.
3. Comprueba con `docker run --rm app:2.3.1 env` que `APP_VERSION` esta como `ENV`.
4. Cambia un `COPY` por `ADD` con un `.tar.gz` local y observa que ADD lo descomprime solo.
5. Junta dos `RUN apt-get` separados en uno solo con `&&` y compara el numero de capas con `docker history`.

## Errores comunes

- **`ARG` usado en runtime**: no existe al ejecutar; si lo necesitas en el contenedor, pásalo a un `ENV`.
- **Capas hinchadas por `apt-get`**: si no haces `rm -rf /var/lib/apt/lists/*` en el mismo `RUN`, el cache de apt queda en la capa. Limpia en la misma instruccion.
- **`ADD` con sorpresas**: descomprimio un tar que querias copiar entero. Usa `COPY` si no quieres esa magia.
- **`WORKDIR` con rutas relativas encadenadas**: `WORKDIR a` y luego `WORKDIR b` acaba en `/a/b`. Usa rutas absolutas para evitar lios.
- **Orden de `COPY . .` demasiado pronto**: invalida la cache en cada cambio de codigo (lo veremos en la leccion de cache).

> Idea clave: `FROM`+`RUN`+`COPY`+`WORKDIR`+`ENV`/`ARG` cubren casi todo. Usa `COPY` por defecto (deja `ADD` para sus casos especiales), recuerda que `ARG` solo vive en build y `ENV` persiste, y agrupa/limpia en el mismo `RUN`.
