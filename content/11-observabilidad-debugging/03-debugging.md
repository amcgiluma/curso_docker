---
title: "Depurar contenedores por dentro"
slug: "debugging"
order: 3
summary: "exec sh/bash, contenedores distroless, nsenter y debug de red y arranque."
---

# Depurar contenedores por dentro

Tarde o temprano necesitaras "entrar" a un contenedor para entender por que no arranca o por que no llega a la red. Aqui veras como, incluso cuando la imagen no trae shell (distroless).

## Teoria

La herramienta diaria es `docker exec`: lanza un **proceso nuevo** dentro de un contenedor **en marcha**. No reinicia nada; se cuela en sus namespaces.

Pero hay casos dificiles:

- **El contenedor no arranca**: no puedes `exec` en algo que ya murio. Hay que inspeccionar logs/estado o arrancar una shell sobreescribiendo el comando.
- **Imagenes distroless o `scratch`**: no traen `sh`, `bash`, ni utilidades. No puedes hacer `exec sh` porque no existe.

Tecnicas segun el caso:

| Situacion | Tecnica |
| --- | --- |
| Contenedor vivo con shell | `docker exec -it <c> sh` |
| Contenedor vivo sin shell (distroless) | `docker debug` o un *sidecar* que comparte namespaces |
| Contenedor que no arranca | `docker logs`, `docker inspect`, o `docker run` sobrescribiendo `--entrypoint` |
| Inspeccionar la red de otro contenedor | Contenedor extra con `--network container:<c>` |
| Acceso de bajo nivel desde el host | `nsenter` sobre el PID del contenedor |

> Nota: muchas imagenes Alpine traen `sh` pero **no** `bash`. Si `docker exec -it c bash` falla, prueba `sh`.

## Manos a la obra

Entra a un contenedor en marcha con una shell interactiva:

```compare
# CMD
docker run -d --name web nginx:1.27-alpine
docker exec -it web sh
# OUT
/ # whoami
root
/ # cat /etc/os-release | head -1
NAME="Alpine Linux"
/ # exit
```

Para una imagen **distroless** (sin shell), comparte sus namespaces desde un contenedor con herramientas:

```compare
# CMD
docker run -d --name api gcr.io/distroless/static-debian12 sleep 600
docker run --rm -it \
  --pid container:api \
  --network container:api \
  nicolaka/netshoot sh -c "ps aux && netstat -tlnp"
# OUT
PID   USER   COMMAND
1     65532  sleep 600
... (ves los procesos y puertos del contenedor distroless) ...
```

Si un contenedor **no arranca**, no hagas `exec`: mira por que murio y luego abre una shell saltandote el entrypoint:

```compare
# CMD
docker logs roto
docker run --rm -it --entrypoint sh <tu-usuario>/roto:1.0
# OUT
exec /app/start.sh: no such file or directory
# (con --entrypoint sh ya estas dentro para revisar la imagen)
/ # ls -l /app
```

Desde el host (Linux), entra a los namespaces con `nsenter` usando el PID real:

```compare
# CMD
PID=$(docker inspect --format '{{.State.Pid}}' web)
sudo nsenter --target $PID --pid --net --mount sh
# OUT
# (shell dentro de los namespaces del contenedor, util si no hay docker exec)
```

## Flags y variantes

| Comando / flag | Para que sirve |
| --- | --- |
| `docker exec -it <c> sh` | Shell interactiva en un contenedor vivo |
| `docker exec -u 0 <c> sh` | Entra como root aunque la app corra sin privilegios |
| `docker exec -w /ruta <c> ...` | Ejecuta en un directorio de trabajo concreto |
| `docker exec -e VAR=valor <c> ...` | Define variables para ese proceso |
| `docker run --entrypoint sh <img>` | Sobrescribe el entrypoint para depurar la imagen |
| `docker run --network container:<c> ...` | Comparte la pila de red de otro contenedor |
| `docker run --pid container:<c> ...` | Comparte los procesos de otro contenedor |
| `docker debug <c>` | Adjunta una shell con herramientas a CUALQUIER imagen (Docker Desktop) |
| `nsenter --target <pid> --net --pid --mount` | Entra a los namespaces desde el host |
| `nicolaka/netshoot` | Imagen "navaja suiza" para depurar red |

> Nota: `docker debug` forma parte de Docker Desktop / Docker Pro y funciona incluso con distroless, porque inyecta sus propias herramientas sin modificar la imagen.

## Pruebalo tu

1. Arranca `docker run -d --name web nginx:1.27-alpine` y entra con `docker exec -it web sh`.
2. Dentro, prueba `wget -qO- http://localhost/` para ver el HTML que sirve.
3. Lanza un netshoot adjunto a su red: `docker run --rm -it --network container:web nicolaka/netshoot curl -s http://localhost/`.
4. Simula un contenedor roto: `docker run --name roto alpine /noexiste`; mira `docker logs roto` y abre `docker run --rm -it --entrypoint sh alpine`.
5. (Linux) Obten el PID con `docker inspect --format '{{.State.Pid}}' web` y entra con `sudo nsenter --target <pid> --net --pid --mount sh`.
6. Reto: arranca una imagen distroless con `sleep 600` y comprueba que `docker exec -it <c> sh` falla, pero el sidecar con `--pid container:` si te deja inspeccionarla.

## Errores comunes

- **`exec: "bash": executable file not found`**: la imagen (Alpine, distroless) no tiene bash. Usa `sh`, o un sidecar/`docker debug` si no hay ninguna shell.
- **`Error: No such container` al hacer exec**: el contenedor ya no esta vivo. Para los que no arrancan, depura con `logs`, `inspect` y `--entrypoint`, no con `exec`.
- **`permission denied` dentro del contenedor**: la app corre como usuario sin privilegios. Reentra con `docker exec -u 0` para mirar como root.
- **`nsenter: command not found` o permiso denegado**: necesitas `util-linux` y privilegios; en Docker Desktop (Mac/Windows) el host es una VM, asi que `docker debug` o un sidecar suelen ser mejores opciones.

> Idea clave: `docker exec -it <c> sh` es tu entrada habitual; para imagenes sin shell comparte namespaces con un sidecar (`--pid`/`--network container:`) o usa `docker debug`, y para contenedores que no arrancan depura con `logs`, `inspect` y `--entrypoint`.
