---
title: "Imagenes, capas y copy-on-write"
slug: "imagenes-y-capas"
order: 4
summary: "Como se apilan las capas, que es OverlayFS y por que importa el copy-on-write."
---

# Imagenes, capas y copy-on-write

Una imagen de Docker no es un fichero monolitico: es una **pila de capas de solo lectura**. Entender como se apilan y como funciona el copy-on-write explica el cache de build, el tamano de las imagenes y por que los datos de un contenedor se pierden al borrarlo.

## Teoria

Cada instruccion de un Dockerfile que cambia el sistema de ficheros (`RUN`, `COPY`, `ADD`) crea una **capa** nueva e inmutable. La imagen final es la suma ordenada de esas capas.

Cuando arrancas un contenedor, Docker anade encima una **capa de escritura** fina y efimera (la "container layer"). Todo lo que escribas va ahi; las capas de la imagen no se tocan.

```
[ capa de escritura del contenedor ]   <- efimera, se borra con el contenedor
---------------------------------------
[ capa: COPY app/ ]                     \
[ capa: RUN apt-get install ... ]        |  capas de la IMAGEN (solo lectura,
[ capa: FROM debian:12-slim ]           /   compartidas entre contenedores)
```

Mecanismos clave:

- **Union filesystem (OverlayFS)**: el driver `overlay2` "fusiona" todas las capas en una unica vista. Tu ves un solo sistema de ficheros, pero por debajo son capas apiladas.
- **Copy-on-write (CoW)**: si modificas un fichero que vive en una capa de solo lectura, el kernel **copia** ese fichero a la capa de escritura y edita la copia. La capa original no cambia.
- **Capas compartidas**: dos imagenes que comparten una capa base (mismo `FROM`) la guardan **una sola vez** en disco. Por eso muchos contenedores apenas ocupan espacio extra.

> Consecuencia importante: los datos escritos en la capa de escritura **desaparecen** al borrar el contenedor. Para datos persistentes se usan volumenes (lo veremos mas adelante).

Cada capa se identifica por un **digest** (sha256). El cache de build se basa en estos digests: si una capa no cambia, se reutiliza.

## Manos a la obra

Mira las capas de una imagen con su historial de construccion:

```compare
# CMD
docker history nginx:alpine
# OUT
IMAGE          CREATED       CREATED BY                                      SIZE
<hash>         2 weeks ago   CMD ["nginx" "-g" "daemon off;"]                0B
<missing>      2 weeks ago   EXPOSE map[80/tcp:{}]                           0B
<missing>      2 weeks ago   COPY docker-entrypoint.sh / # buildkit          2.6kB
<missing>      2 weeks ago   RUN /bin/sh -c set -x && addgroup ...           ...MB
<missing>      2 weeks ago   /bin/sh -c #(nop) ADD file:... in /              8.4MB
...
# (hashes, fechas y tamanos varian)
```

Las lineas con `0B` son capas de solo metadatos (`CMD`, `EXPOSE`): no anaden ficheros.

Comprueba el copy-on-write: un fichero creado en el contenedor vive solo en su capa de escritura. `docker diff` te muestra los cambios respecto a la imagen:

```compare
# CMD
docker run -d --name c1 alpine sleep 300
docker exec c1 sh -c "echo hola > /tmp/nota.txt"
docker diff c1
# OUT
<container-id>
C /tmp
A /tmp/nota.txt
```

`A` = anadido, `C` = cambiado, `D` = borrado. Ese fichero esta en la capa de escritura, no en la imagen `alpine`.

Verifica el driver de almacenamiento que fusiona las capas:

```compare
# CMD
docker info --format 'Storage Driver: {{.Driver}}'
# OUT
Storage Driver: overlay2
```

## Flags y variantes

| Comando / flag | Para que sirve |
| --- | --- |
| `docker history <imagen>` | Lista las capas y el comando que creo cada una |
| `docker history --no-trunc` | Igual, sin recortar los comandos largos |
| `docker diff <contenedor>` | Cambios (A/C/D) de la capa de escritura frente a la imagen |
| `docker inspect <imagen>` | Incluye `RootFS.Layers` con los digests sha256 de cada capa |
| `docker image inspect --format '{{.Size}}' <imagen>` | Tamano total de la imagen |
| `docker system df` | Espacio usado por imagenes, contenedores y volumenes |
| `docker info --format '{{.Driver}}'` | Driver de almacenamiento (overlay2 normalmente) |

## Pruebalo tu

1. Ejecuta `docker history nginx:alpine` e identifica que capas anaden tamano y cuales son `0B`.
2. Arranca `docker run -d --name c1 alpine sleep 300`, crea un fichero con `docker exec` y mira `docker diff c1`.
3. Borra el contenedor (`docker rm -f c1`) y arranca otro de la misma imagen: el fichero ya no esta (CoW + capa efimera).
4. Lanza `docker inspect alpine` y busca `RootFS.Layers` para ver los digests.
5. Comprueba el ahorro de capas compartidas: descarga `nginx:alpine` y `nginx:stable-alpine` y mira `docker system df`.

## Errores comunes

- **"Perdi los datos del contenedor al borrarlo"**: es lo esperado; la capa de escritura es efimera. Usa volumenes para persistir.
- **"Mi imagen pesa demasiado"**: a menudo por borrar ficheros en una capa posterior; el peso queda en la capa anterior. Borra en el mismo `RUN` que los creo (lo veremos en optimizacion).
- **Confundir `docker history` con `docker diff`**: `history` son las capas de la *imagen*; `diff` son los cambios de un *contenedor* en marcha.
- **Esperar que dos `latest` distintas no compartan nada**: si comparten capas base, el disco no crece tanto como la suma de tamanos.

> Idea clave: una imagen son capas de solo lectura apiladas con OverlayFS; el contenedor anade una capa de escritura efimera. Gracias al copy-on-write, las capas se comparten y solo se copia un fichero cuando lo modificas, pero esos cambios se pierden al borrar el contenedor.
