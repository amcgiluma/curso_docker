---
title: "Arquitectura de Docker: del CLI a runc"
slug: "arquitectura-docker"
order: 2
summary: "Cómo encajan docker CLI, dockerd, containerd, shim y runc."
---

# Arquitectura de Docker: del CLI a runc

Cuando escribes `docker run`, no es un único programa el qué hace el trabajo: hay una cadena de componentes que se reparten responsabilidades. Conocerla te ayuda a depurar (ej. "el daemon está caído", "containerd no responde") y a entender por qué un contenedor sobrevive a un reinicio del daemon.

## Teoría

La pila de ejecución, de arriba a abajo:

| Componente | Qué es | Responsabilidad |
| --- | --- | --- |
| `docker` (CLI) | Cliente de línea de comandos | Traduce tus comandos a llamadas a la API REST del daemon |
| `dockerd` | El daemon de Docker | Gestiona imágenes, redes, volúmenes y build; orquesta lo demás |
| `containerd` | Runtime de contenedores (estándar CNCF) | Ciclo de vida del contenedor: pull de imágenes, supervisar, snapshots |
| `containerd-shim` | Proceso "puente" por contenedor | Mantiene vivo el contenedor aunque dockerd/containerd se reinicien |
| `runc` | Runtime de bajo nivel (OCI) | Crea de verdad el proceso con sus namespaces y cgroups, y termina |

El flujo de un `docker run`:

1. El **CLI** manda una peticion HTTP al socket del daemon (`/var/run/docker.sock`).
2. **dockerd** prepara la imagen y delega la ejecución en **containerd**.
3. **containerd** lanza un **shim** y le pide que ejecute el contenedor.
4. El shim invoca **runc**, que configura namespaces + cgroups y hace el `exec` del proceso.
5. `runc` **termina** una vez creado el proceso; el **shim** se queda como padre del contenedor.

> Por qué importa el shim: cómo `runc` se va y el shim queda, puedes reiniciar `dockerd` sin matar tus contenedores en ejecución. El shim también recoge el código de salida y mantiene los STDIO.

Todo esto se apoya en estándares **OCI** (Open Container Initiative): la *image-spec* (formato de imagen) y la *runtime-spec* (cómo ejecutarla). Por eso puedes cambiar `runc` por otro runtime compatible.

## Manos a la obra

Comprueba la separacion cliente/servidor: `docker version` muestra dos bloques, Client y Server (Engine).

```compare
# CMD
docker version
# OUT
Client:
 Version:           27.3.1
 API version:       1.47
 ...
Server: Docker Engine - Community
 Engine:
  Version:          27.3.1
  API version:      1.47 (minimum version 1.24)
 containerd:
  Version:          1.7.22
 runc:
  Version:          1.1.14
 ...
```

Mira la arquitectura completa con `docker info` (storage driver, runtime por defecto, etc.):

```compare
# CMD
docker info --format 'Runtime={{.DefaultRuntime}} Driver={{.Driver}} Root={{.DockerRootDir}}'
# OUT
Runtime=runc Driver=overlay2 Root=/var/lib/docker
```

Observa la jerarquia de procesos: con un contenedor corriendo, su padre es un `shim`, no `dockerd`:

```compare
# CMD
docker run -d --name web nginx:alpine
ps -o pid,ppid,cmd --ppid 1 | grep shim
# OUT
<container-id>
  2451     1 /usr/bin/containerd-shim-runc-v2 -namespace moby -id <hash> ...
# (PIDs y hash varían según tu entorno)
```

## Flags y variantes

| Comando | Para qué sirve |
| --- | --- |
| `docker version` | Versiones de Client y Server (incluye containerd y runc) |
| `docker info` | Estado del daemon: runtime, storage driver, num. de contenedores |
| `docker info --format '...'` | Extrae campos concretos con plantillas Go |
| `docker system info` | Alias de `docker info` |
| `ctr` | CLI de bajo nivel de containerd (avanzado, fuera de Docker) |
| `dockerd --debug` | Arranca el daemon con logs detallados (diagnóstico) |
| `systemctl status docker` | Estado del servicio del daemon en hosts con systemd |

## Pruébalo tú

1. Ejecuta `docker version` y localiza las versiones de `containerd` y `runc` en el bloque Server.
2. Lanza `docker info` y anota tu `Storage Driver` y `Default Runtime`.
3. Arranca `docker run -d --name web nginx:alpine` y luego `docker top web` para ver el proceso.
4. En Linux, prueba `ps aux | grep shim` para encontrar el `containerd-shim` de tu contenedor.
5. Limpia con `docker rm -f web`.

## Errores comunes

- **`Cannot connect to the Docker daemon ... Is the docker daemon running?`**: el CLI funciona pero `dockerd` está parado. Arráncalo (`systemctl start docker` o abre Docker Desktop).
- **`permission denied while trying to connect to the Docker daemon socket`**: tu usuario no está en el grupo `docker`. Añádelo o usa `sudo`.
- **Pensar que dockerd ejecuta el contenedor directamente**: no; delega en containerd -> shim -> runc. Útil al leer logs.

> Idea clave: `docker` solo habla con `dockerd`; este delega en `containerd`, que lanza un `shim` por contenedor, y `runc` crea el proceso real y se va. El shim es lo que mantiene vivos tus contenedores aunque reinicies el daemon.
