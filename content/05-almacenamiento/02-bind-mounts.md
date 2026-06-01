---
title: "Bind mounts y tmpfs"
slug: "bind-mounts"
order: 2
summary: "Montar rutas del host con bind mounts, datos en RAM con tmpfs y montajes :ro."
---

# Bind mounts y tmpfs

Ademas de los volumes gestionados por Docker, puedes montar **una ruta del host** dentro del contenedor (bind mount) o un sistema de ficheros **en memoria** que no toca disco (tmpfs). Cada uno tiene su caso de uso.

## Teoria

| Tipo | Donde viven los datos | Caso de uso tipico |
| --- | --- | --- |
| **volume** | Gestionado por Docker (`/var/lib/docker/volumes`) | Datos de produccion, bases de datos |
| **bind mount** | Una ruta concreta de tu host | Desarrollo: montar tu codigo en el contenedor |
| **tmpfs** | RAM del host (no se escribe a disco) | Datos sensibles o temporales que no deben persistir |

**Bind mount**: enlaza un directorio o fichero del host con una ruta del contenedor. Es ideal en desarrollo porque editas el codigo en tu maquina y el cambio se ve dentro del contenedor al instante. Aviso: el bind mount **oculta** lo que hubiera en esa ruta del contenedor y monta encima el contenido del host (no copia el contenido previo, a diferencia de un volume).

**tmpfs**: monta un sistema de ficheros en memoria. Cuando el contenedor se para, los datos desaparecen. Util para ficheros temporales o secretos que no quieres que toquen el disco. Solo funciona en contenedores Linux.

> En Windows/PowerShell, usa la ruta absoluta del host. Por ejemplo `-v C:\Users\juanm\proyecto:/app` o, dentro de WSL, `/mnt/c/Users/juanm/proyecto:/app`. Con `--mount` el `source` siempre debe ser una ruta absoluta.

## Manos a la obra

Monta el directorio actual del host en `/app` y lista su contenido desde el contenedor (sustituye `$(pwd)` por tu ruta absoluta en PowerShell, p. ej. `${PWD}`):

```compare
# CMD
docker run --rm -v "$(pwd)":/app alpine ls /app
# OUT
Dockerfile
README.md
src
```

Monta una ruta en **solo lectura** y comprueba que no puedes escribir:

```compare
# CMD
docker run --rm -v "$(pwd)":/app:ro alpine sh -c "touch /app/nuevo.txt"
# OUT
touch: /app/nuevo.txt: Read-only file system
```

Usa un **tmpfs** y observa que el montaje es de tipo `tmpfs` (en RAM):

```compare
# CMD
docker run --rm --tmpfs /cache alpine df -h /cache
# OUT
Filesystem                Size      Used Available Use% Mounted on
tmpfs                   <size>         0    <size>   0% /cache
```

## Flags y variantes

| Flag | Que hace |
| --- | --- |
| `-v <ruta-host>:<ruta-contenedor>` | Bind mount (la ruta de host debe ser absoluta) |
| `-v <ruta-host>:<ruta-contenedor>:ro` | Bind mount en solo lectura |
| `--mount type=bind,src=<ruta-host>,dst=<ruta-contenedor>` | Bind mount explicito; falla si `src` no existe |
| `--mount type=bind,...,readonly` | Bind mount de solo lectura con sintaxis larga |
| `--tmpfs <ruta>` | Monta un tmpfs simple en esa ruta |
| `--mount type=tmpfs,dst=<ruta>` | tmpfs con sintaxis larga |
| `--mount type=tmpfs,dst=<ruta>,tmpfs-size=64m` | Limita el tamano del tmpfs |
| `--mount type=tmpfs,dst=<ruta>,tmpfs-mode=1770` | Define permisos del tmpfs |

## Pruebalo tu

1. Crea una carpeta de prueba con un fichero: `mkdir demo && echo "soy del host" > demo/dato.txt`.
2. Montala en un contenedor y leela: `docker run --rm -v "$(pwd)/demo":/app alpine cat /app/dato.txt`.
3. Repite con `:ro` e intenta crear un fichero dentro: debe fallar con *Read-only file system*.
4. Lanza `docker run --rm --tmpfs /tmp/ram alpine sh -c "echo x > /tmp/ram/a && ls /tmp/ram"`. Veras el fichero, pero al salir del contenedor desaparece (estaba en RAM).

## Errores comunes

- **`docker: Error response from daemon: invalid mount config: bind source path does not exist`**: con `--mount type=bind` la ruta de origen tiene que existir en el host. Crea la carpeta o revisa la ruta.
- **El contenedor "no ve" el contenido que esperaba**: un bind mount tapa lo que hubiera en esa ruta del contenedor. Si necesitas conservar el contenido de la imagen, usa un volume (que si lo copia) o monta en otra ruta.
- **Permisos / "Permission denied" al escribir**: el usuario del contenedor puede no tener permisos sobre los ficheros del host. Ajusta `--user` o los permisos del host.
- **Rutas relativas con `-v`**: `-v ./demo:/app` no siempre funciona como esperas; usa ruta absoluta (`$(pwd)/demo` o `${PWD}/demo`).

> Idea clave: usa **bind mounts** para desarrollar con tu codigo en vivo, **tmpfs** para datos temporales que nunca tocan disco, y anade `:ro`/`readonly` siempre que el contenedor no necesite escribir.
