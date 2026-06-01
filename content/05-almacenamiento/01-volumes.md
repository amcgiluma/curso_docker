---
title: "Volumes nombrados"
slug: "volumes"
order: 1
summary: "Crear, inspeccionar y limpiar volumes nombrados; -v frente a --mount."
---

# Volumes nombrados

El sistema de ficheros de un contenedor es efimero: cuando borras el contenedor, sus datos desaparecen. Los **volumes** son el mecanismo recomendado por Docker para guardar datos fuera del contenedor y que sobrevivan a su ciclo de vida.

## Teoria

Un **volume nombrado** es un directorio que gestiona el daemon de Docker. Vive fuera de la capa de escritura del contenedor (en Linux, bajo `/var/lib/docker/volumes/`) y por eso persiste aunque borres el contenedor.

Ventajas frente a guardar datos dentro del contenedor:

- **Persistencia**: el volume sigue existiendo tras `docker rm`.
- **Compartido**: varios contenedores pueden montar el mismo volume.
- **Gestionado por Docker**: lo manipulas con `docker volume ...`, sin depender de rutas del host.
- **Mejor rendimiento** que un bind mount en Docker Desktop (macOS/Windows).

> Nota: si montas un volume **vacio** sobre un directorio del contenedor que ya tiene ficheros (por ejemplo el contenido de la imagen), Docker copia ese contenido al volume la primera vez. Con un bind mount eso NO ocurre.

Los tres tipos de almacenamiento son: **volumes** (esta leccion), **bind mounts** y **tmpfs** (siguiente leccion).

## Manos a la obra

Crea un volume, mira la lista y monta el volume en un contenedor:

```compare
# CMD
docker volume create datos-app
docker volume ls
# OUT
datos-app
DRIVER    VOLUME NAME
local     datos-app
```

Escribe un fichero en el volume desde un contenedor y comprueba que persiste en otro contenedor distinto:

```compare
# CMD
docker run --rm -v datos-app:/data alpine sh -c "echo hola > /data/saludo.txt"
docker run --rm -v datos-app:/data alpine cat /data/saludo.txt
# OUT
hola
```

Inspecciona el volume para ver donde lo guarda el daemon:

```compare
# CMD
docker volume inspect datos-app
# OUT
[
    {
        "CreatedAt": "<fecha>",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/datos-app/_data",
        "Name": "datos-app",
        "Options": null,
        "Scope": "local"
    }
]
```

## Flags y variantes

| Comando / flag | Que hace |
| --- | --- |
| `docker volume create <nombre>` | Crea un volume nombrado |
| `docker volume ls` | Lista los volumes |
| `docker volume ls -f dangling=true` | Solo volumes huerfanos (sin contenedor) |
| `docker volume inspect <nombre>` | Muestra metadatos (mountpoint, driver, labels) |
| `docker volume rm <nombre>` | Elimina un volume (debe estar sin usar) |
| `docker volume prune` | Borra volumes anonimos sin usar |
| `docker volume prune -a` | Borra todos los volumes sin usar (incluidos nombrados) |
| `-v <nombre>:<ruta>` | Sintaxis corta para montar un volume |
| `-v <nombre>:<ruta>:ro` | Monta el volume en solo lectura |
| `--mount type=volume,src=<nombre>,dst=<ruta>` | Sintaxis larga y explicita |
| `--mount ...,readonly` | Equivalente a `:ro` con `--mount` |

### `-v` frente a `--mount`

Ambas montan el mismo tipo de almacenamiento, pero se comportan distinto:

- Con `-v`, si el volume **no existe**, Docker lo crea automaticamente.
- Con `--mount`, si indicas `type=volume` y el volume no existe, tambien se crea; pero si usas `type=bind` y la ruta de origen no existe, falla (lo cual ayuda a detectar errores).
- `--mount` es mas verboso pero mas legible y es la forma recomendada en scripts y produccion.

```compare
# CMD
docker run --rm --mount type=volume,src=datos-app,dst=/data alpine ls /data
# OUT
saludo.txt
```

## Pruebalo tu

1. Crea un volume: `docker volume create curso-vol`.
2. Lanza un contenedor que escriba un fichero: `docker run --rm -v curso-vol:/data alpine sh -c "date > /data/inicio.txt"`.
3. Borra ese contenedor (ya se borro con `--rm`) y crea otro nuevo que lea el fichero: `docker run --rm -v curso-vol:/data alpine cat /data/inicio.txt`. Debe mostrar la fecha.
4. Inspecciona el volume con `docker volume inspect curso-vol` y localiza el `Mountpoint`.
5. Limpia: `docker volume rm curso-vol`.

## Errores comunes

- **`Error response from daemon: remove curso-vol: volume is in use`**: hay un contenedor (aunque este parado) que usa el volume. Borralo primero con `docker rm <contenedor>` o usa `docker rm -v` para borrar contenedor y sus volumes anonimos.
- **`docker volume prune` no borra mi volume nombrado**: por defecto `prune` solo elimina volumes **anonimos** sin usar. Para incluir los nombrados usa `docker volume prune -a`.
- **Esperaba ver mis datos pero el directorio esta vacio**: confundir el nombre del volume o montar en una ruta distinta. Verifica con `docker volume inspect`.

> Idea clave: usa volumes nombrados para cualquier dato que deba sobrevivir al contenedor; `docker volume create/ls/inspect/rm/prune` los gestiona, y `--mount` es la sintaxis preferida por ser explicita.
