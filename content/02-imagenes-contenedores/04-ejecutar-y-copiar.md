---
title: "Ejecutar dentro y copiar: exec, cp, commit y mas"
slug: "ejecutar-y-copiar"
order: 4
summary: "exec, attach, cp, commit, diff, rename y update sobre contenedores en marcha."
---

# Ejecutar dentro y copiar: exec, cp, commit y mas

Una vez el contenedor corre, a menudo necesitas "entrar" a depurar, sacar o meter ficheros, o ajustar limites sin reiniciar. Estos comandos operan sobre contenedores ya creados.

## Teoria

- **`docker exec`**: lanza un proceso **adicional** dentro de un contenedor en marcha (ej. una shell). No reinicia nada; ideal para depurar.
- **`docker attach`**: se "engancha" al proceso principal (PID 1) y su STDIO. Cuidado: si sales con `Ctrl+C` puedes matar el proceso. Para soltarte sin matarlo usa la secuencia `Ctrl+P` `Ctrl+Q`.
- **`docker cp`**: copia ficheros entre host y contenedor en ambos sentidos. Funciona incluso con el contenedor parado.
- **`docker commit`**: crea una imagen nueva a partir del estado actual de un contenedor. Util para experimentar, pero **no es reproducible**: para algo serio usa un Dockerfile.
- **`docker diff`**: muestra los cambios (A/C/D) de la capa de escritura.
- **`docker rename`**: cambia el nombre de un contenedor.
- **`docker update`**: ajusta limites de recursos (CPU, memoria, restart) **en caliente**, sin recrear.

> `exec` vs `attach`: usa `exec` casi siempre (abres un proceso aparte y sales sin riesgo). `attach` solo si necesitas interactuar con el proceso principal en si.

## Manos a la obra

Entrar a depurar con `exec` (un proceso nuevo, no el principal):

```compare
# CMD
docker run -d --name web nginx:alpine
docker exec -it web sh -c 'nginx -v'
# OUT
<container-id>
nginx version: nginx/1.27.2
```

Copiar un fichero del contenedor al host y al reves:

```compare
# CMD
docker cp web:/etc/nginx/nginx.conf ./nginx.conf
echo "# editado" >> ./nginx.conf
docker cp ./nginx.conf web:/etc/nginx/nginx.conf
# OUT
Successfully copied 3.07kB to ./nginx.conf
Successfully copied 3.07kB to web:/etc/nginx/nginx.conf
```

Ver los cambios respecto a la imagen con `diff`:

```compare
# CMD
docker exec web sh -c 'touch /tmp/marca'
docker diff web
# OUT
C /tmp
A /tmp/marca
C /etc/nginx/nginx.conf
```

Congelar el estado en una imagen con `commit` (para experimentar):

```compare
# CMD
docker commit web web-modificado:v1
docker images web-modificado
# OUT
sha256:<hash>
REPOSITORY        TAG   IMAGE ID       CREATED         SIZE
web-modificado    v1    <hash>         2 seconds ago   78.4MB
```

Renombrar y ajustar recursos en caliente:

```compare
# CMD
docker rename web web-prod
docker update --memory 256m --cpus 1 web-prod
# OUT
web-prod
web-prod
```

## Flags y variantes

| Comando | Flag | Para que sirve |
| --- | --- | --- |
| `docker exec` | `-it` | Shell interactiva con TTY |
| `docker exec` | `-d` | Ejecuta el proceso en segundo plano |
| `docker exec` | `-e CLAVE=val` | Variables de entorno para ese proceso |
| `docker exec` | `-u <usuario>` | Ejecuta como otro usuario |
| `docker exec` | `-w <dir>` | Directorio de trabajo del proceso |
| `docker attach` | `--no-stdin` | No reenvia STDIN |
| `docker attach` | `--detach-keys` | Cambia la secuencia para soltarse |
| `docker cp` | `<cont>:<ruta> <host>` | Del contenedor al host |
| `docker cp` | `<host> <cont>:<ruta>` | Del host al contenedor |
| `docker cp` | `-a` | Conserva permisos/propietario |
| `docker commit` | `-m`, `-a` | Mensaje y autor |
| `docker commit` | `-c "CMD ..."` | Aplica instrucciones de Dockerfile a la imagen |
| `docker commit` | `--pause=false` | No pausar el contenedor durante el commit |
| `docker update` | `--memory`, `--cpus`, `--restart` | Ajusta limites sin recrear |
| `docker rename` | — | `docker rename viejo nuevo` |

## Pruebalo tu

1. Arranca `docker run -d --name web nginx:alpine` y entra con `docker exec -it web sh`.
2. Dentro, crea `/tmp/marca` y sal; comprueba `docker diff web`.
3. Copia `nginx.conf` al host con `docker cp`, editalo y vuelve a copiarlo dentro.
4. Haz `docker commit web web-modificado:v1` y verifica con `docker images`.
5. Renombra a `web-prod` y sube su memoria con `docker update --memory 256m web-prod`.

## Errores comunes

- **Sales de `attach` con `Ctrl+C` y se para el contenedor**: enviaste SIGINT al PID 1. Para soltarte sin matarlo usa `Ctrl+P Ctrl+Q`, o mejor usa `exec`.
- **`docker exec` falla con `executable file not found`**: esa shell o binario no existe en la imagen (ej. imagenes minimas sin `bash`; prueba `sh`).
- **Abusar de `commit`**: las imagenes asi no son reproducibles ni auditables. Sirve para depurar, no para producir; usa Dockerfile.
- **`docker cp` y permisos**: el fichero llega con el UID original; si la app corre como otro usuario, ajusta con `-a` o `chown` dentro.

> Idea clave: usa `exec` para entrar a depurar (proceso aparte, salida segura), `cp` para mover ficheros, `diff` para ver cambios y `update` para ajustar recursos en caliente. `commit` solo para experimentar: lo reproducible se hace con Dockerfile.
