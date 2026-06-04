---
title: "Redes definidas por usuario y DNS interno"
slug: "redes-definidas-usuario"
order: 2
summary: "Crear redes bridge propias, resolucion por nombre y conectar/desconectar contenedores."
---

# Redes definidas por usuario y DNS interno

La forma correcta de comunicar varios contenedores es crear tu propia red `bridge`. A diferencia de la bridge por defecto, las **redes definidas por usuario** incluyen un **DNS interno** que resuelve los contenedores por su nombre.

## Teoría

Cuando creas una red con `docker network create`, obtienes una red `bridge` aislada con una característica clave: un **servidor DNS embebido** (en `127.0.0.11` dentro del contenedor) que resuelve nombres de contenedor y *aliases* a sus IPs.

Ventajas frente a la bridge por defecto:

- **DNS automático**: `web` puede conectar a `db` usando el nombre `db`, sin saber su IP.
- **Aislamiento**: solo los contenedores de esa red se ven entre si.
- **Aliases de red**: un contenedor puede tener varios nombres con `--network-alias`.
- **Conexion/desconexión en caliente**: puedes adjuntar un contenedor a varias redes.

Esta es la base de cómo funciona Docker Compose: crea una red por proyecto y los servicios se llaman por su nombre.

> El DNS interno solo resuelve dentro de la misma red definida por usuario. Si dos contenedores están en redes distintas, no se resuelven por nombre aunque corran en el mismo host.

## Manos a la obra

Crea una red y lanza dos contenedores en ella:

```compare
# CMD
docker network create app-net
docker run -d --name db --network app-net redis:alpine
docker run -d --name api --network app-net alpine sleep 3600
# OUT
<id-de-red>
<id-contenedor-db>
<id-contenedor-api>
```

Desde `api`, resuelve y conecta a `db` **por nombre** (no por IP):

```compare
# CMD
docker exec api ping -c2 db
# OUT
PING db (172.18.0.2): 56 data bytes
64 bytes from 172.18.0.2: seq=0 ttl=64 time=0.085 ms
64 bytes from 172.18.0.2: seq=1 ttl=64 time=0.072 ms

--- db ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
```

Conecta `api` a una segúnda red sin reiniciarlo y comprueba qué está en ambas:

```compare
# CMD
docker network create otra-net
docker network connect otra-net api
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' api
# OUT
app-net otra-net
```

## Flags y variantes

| Comando / flag | Qué hace |
| --- | --- |
| `docker network create <red>` | Crea una red bridge definida por usuario |
| `docker network create -d bridge <red>` | Indica el driver explicitamente |
| `docker run --network <red>` | Arranca el contenedor ya conectado a la red |
| `docker run --network-alias <alias>` | Añade un nombre DNS adicional al contenedor |
| `docker network connect <red> <contenedor>` | Conecta un contenedor en marcha a otra red |
| `docker network connect --alias <alias> <red> <contenedor>` | Conecta con un alias DNS |
| `docker network disconnect <red> <contenedor>` | Lo desconecta de esa red |
| `docker network inspect <red>` | Lista contenedores conectados, subred y gateway |
| `docker network rm <red>` | Borra la red (debe estar vacía) |
| `docker network prune` | Borra todas las redes sin usar |

## Pruébalo tú

1. Crea la red: `docker network create demo-net`.
2. Lanza un Redis: `docker run -d --name cache --network demo-net redis:alpine`.
3. Lanza un cliente y resuelve por nombre: `docker run --rm --network demo-net redis:alpine redis-cli -h cache ping` debe devolver `PONG`.
4. Crea `demo-net2`, conecta `cache` con `docker network connect demo-net2 cache` y verifica con `docker network inspect demo-net2`.
5. Desconecta con `docker network disconnect demo-net2 cache` y limpia con `docker rm -f cache` y `docker network rm demo-net demo-net2`.

## Errores comunes

- **`could not resolve host: db`**: los contenedores no están en la **misma** red definida por usuario, o estás en la bridge por defecto (que no tiene DNS). Crea una red propia y conecta ambos.
- **`Error response from daemon: network <red> has active endpoints`**: intentas borrar una red con contenedores aún conectados. Desconectalos o borralos primero.
- **El nombre antiguo sigue resolviendo**: si renombras o recreas un contenedor, el DNS interno tarda en actualizar el cache; recrea el cliente o usa el nombre nuevo.
- **Conflicto de nombres**: no puede haber dos contenedores con el mismo `--name` en el host, aunque estén en redes distintas.

> Idea clave: crea redes definidas por usuario con `docker network create` para obtener DNS interno y comunicar contenedores por nombre; `network connect/disconnect` permite adjuntarlos a varias redes en caliente.
