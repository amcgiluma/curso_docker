---
title: "docker run a fondo"
slug: "docker-run-a-fondo"
order: 2
summary: "Los flags mas utiles de docker run: -d, -it, --rm, -p, -e, -v, recursos y mas."
---

# docker run a fondo

`docker run` es el comando que mas vas a usar y el que mas flags admite. Aqui tienes los que de verdad usaras a diario, con ejemplos reales y los matices que suelen confundir.

## Teoria

La forma general es:

```bash
docker run [OPCIONES] IMAGEN[:TAG] [COMANDO] [ARGS...]
```

Todo lo que va **despues** del nombre de la imagen sustituye al `CMD` por defecto de la imagen. Las opciones van **antes**.

Grupos de flags que conviene memorizar:

- **Ejecucion**: `-d` (segundo plano), `-it` (interactivo + TTY), `--rm` (autolimpieza), `--name`.
- **Red y puertos**: `-p host:contenedor`, `--network`, `-P` (publica todos los EXPOSE).
- **Entorno**: `-e CLAVE=valor`, `--env-file`.
- **Datos**: `-v` / `--mount` (volumenes y bind mounts).
- **Identidad y rutas**: `-w` (workdir), `-u` (usuario), `--entrypoint`.
- **Recursos**: `--memory`, `--cpus`, `--restart`.

> Diferencia importante: `-p` (minuscula) mapea puertos concretos; `-P` (mayuscula) publica todos los puertos `EXPOSE` en puertos aleatorios del host. Y la sintaxis es `-p HOST:CONTENEDOR`, facil de invertir por error.

## Manos a la obra

Modo detached con publicacion de puerto y nombre:

```compare
# CMD
docker run -d --name web -p 8080:80 nginx:alpine
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080
# OUT
<container-id>
200
```

Modo interactivo con TTY (una shell dentro del contenedor):

```compare
# CMD
docker run -it --rm alpine sh
# OUT
/ # echo "estoy dentro"
estoy dentro
/ # exit
```

Variables de entorno y workdir, sobreescribiendo el comando por defecto:

```compare
# CMD
docker run --rm -e SALUDO=hola -w /tmp alpine sh -c 'echo "$SALUDO desde $(pwd)"'
# OUT
hola desde /tmp
```

Limites de recursos y comprobacion:

```compare
# CMD
docker run -d --name lim --memory 128m --cpus 0.5 nginx:alpine
docker inspect --format 'mem={{.HostConfig.Memory}} cpus={{.HostConfig.NanoCpus}}' lim
# OUT
<container-id>
mem=134217728 cpus=500000000
```

`134217728` son 128 MiB y `500000000` nanocpus equivalen a 0.5 nucleos.

## Flags y variantes

| Flag | Ejemplo | Para que sirve |
| --- | --- | --- |
| `-d`, `--detach` | `-d` | Ejecuta en segundo plano |
| `-it` | `-it` | `-i` mantiene STDIN abierto, `-t` asigna un TTY (shells) |
| `--rm` | `--rm` | Borra el contenedor al terminar |
| `--name` | `--name web` | Nombre legible |
| `-p`, `--publish` | `-p 8080:80` | Mapea puerto host:contenedor |
| `-P` | `-P` | Publica todos los puertos `EXPOSE` en puertos aleatorios |
| `-e`, `--env` | `-e ENV=prod` | Define una variable de entorno |
| `--env-file` | `--env-file .env` | Carga variables desde un fichero |
| `-v`, `--volume` | `-v datos:/var/lib/app` | Monta volumen o bind mount |
| `--mount` | `--mount type=bind,src=...,dst=...` | Sintaxis explicita de montaje |
| `--network` | `--network mired` | Conecta a una red concreta |
| `--restart` | `--restart unless-stopped` | Politica de reinicio |
| `-w`, `--workdir` | `-w /app` | Directorio de trabajo |
| `-u`, `--user` | `-u 1000:1000` | UID:GID con el que corre el proceso |
| `--entrypoint` | `--entrypoint /bin/sh` | Sustituye el ENTRYPOINT de la imagen |
| `--memory`, `-m` | `--memory 256m` | Limite de RAM |
| `--cpus` | `--cpus 1.5` | Equivalente en nucleos |
| `--cpuset-cpus` | `--cpuset-cpus 0,1` | Fija a CPUs concretas |
| `-h`, `--hostname` | `-h api01` | Hostname dentro del contenedor |
| `--read-only` | `--read-only` | Sistema de ficheros raiz de solo lectura |

## Pruebalo tu

1. Arranca `docker run -d --name web -p 8080:80 nginx:alpine` y abre `http://localhost:8080`.
2. Crea un fichero `.env` con `SALUDO=hola` y prueba `docker run --rm --env-file .env alpine env | grep SALUDO`.
3. Entra en una shell interactiva con `docker run -it --rm alpine sh` y sal con `exit`.
4. Lanza un contenedor con `--memory 128m --cpus 0.5` y verifica los limites con `docker stats`.
5. Prueba `-P` con una imagen que tenga `EXPOSE` y mira el puerto aleatorio con `docker port`.

## Errores comunes

- **`Bind for 0.0.0.0:8080 failed: port is already allocated`**: ese puerto del host ya esta ocupado; usa otro o libera el anterior.
- **Invertir `-p`**: recuerda `HOST:CONTENEDOR`. `-p 80:8080` publica el 80 del host hacia el 8080 del contenedor.
- **`-it` con `-d` a la vez sin sentido**: si quieres una shell usa `-it`; si quieres background usa `-d`. Combinar `-dit` solo tiene sentido para dejar una shell viva en background.
- **`the input device is not a TTY`**: usaste `-t` en un entorno sin terminal (CI, pipe). Quita `-t`.
- **Variables del `.env` no se cargan**: `--env-file` espera `CLAVE=valor` por linea, sin `export` ni comillas alrededor del valor.

> Idea clave: las opciones van antes de la imagen y el comando va despues (y sustituye al CMD). Domina `-d`, `-it`, `--rm`, `-p HOST:CONTENEDOR`, `-e`/`--env-file`, `-v` y los limites `--memory`/`--cpus`: con eso cubres el 90% de los casos.
