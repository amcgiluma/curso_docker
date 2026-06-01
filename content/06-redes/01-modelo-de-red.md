---
title: "El modelo de red de Docker"
slug: "modelo-de-red"
order: 1
summary: "Drivers de red bridge, host y none, y la bridge por defecto."
---

# El modelo de red de Docker

Docker abstrae la red en **drivers**. Entender los tres basicos (`bridge`, `host`, `none`) y como funciona la red `bridge` por defecto es la base para conectar contenedores entre si y con el exterior.

## Teoria

Cuando arranca, el daemon crea tres redes predefinidas. Las ves con `docker network ls`:

| Driver | Para que sirve |
| --- | --- |
| `bridge` | Red privada virtual en el host; es el driver por defecto para contenedores standalone |
| `host` | El contenedor comparte la pila de red del host (sin aislamiento de red) |
| `none` | El contenedor no tiene interfaz de red (aislamiento total) |
| `overlay` | Red multi-host para Swarm (la veras en "Redes avanzadas") |
| `macvlan` | Da al contenedor una MAC/IP propia en la red fisica (avanzado) |

**Bridge por defecto (`bridge`)**: si no indicas red, el contenedor se conecta a esta red. Docker crea una interfaz `docker0` en el host y asigna a cada contenedor una IP privada (tipica `172.17.0.0/16`). Importante: en la red `bridge` por defecto **no hay resolucion DNS por nombre de contenedor**; los contenedores solo se ven por IP. Para resolver por nombre necesitas una red definida por usuario (siguiente leccion).

**host**: el contenedor usa directamente los puertos e interfaces del host. No necesitas `-p` porque no hay traduccion de puertos. Solo funciona de forma nativa en Linux (en Docker Desktop su comportamiento es limitado).

**none**: el contenedor solo tiene `loopback`. Util para tareas que no necesitan red o para anadir tu propia configuracion.

> La aislacion de la red `bridge` la proporciona un *network namespace* por contenedor; el trafico hacia fuera pasa por NAT/`iptables` que gestiona el daemon.

## Manos a la obra

Lista las redes que crea Docker de fabrica:

```compare
# CMD
docker network ls
# OUT
NETWORK ID     NAME      DRIVER    SCOPE
<id>           bridge    bridge    local
<id>           host      host      local
<id>           none      null      local
```

Mira la IP que recibe un contenedor en la red bridge por defecto:

```compare
# CMD
docker run -d --name web nginx:alpine
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
# OUT
172.17.0.2
```

Compara con un contenedor en modo `host` (en Linux, comparte la red del host):

```compare
# CMD
docker run --rm --network host alpine ip -o addr show | grep -v "127.0.0.1"
# OUT
# (veras las interfaces reales del host, no una 172.17.x.x)
1: lo    inet 127.0.0.1/8 ...
2: eth0  inet <ip-del-host>/24 ...
```

## Flags y variantes

| Flag / comando | Que hace |
| --- | --- |
| `docker network ls` | Lista las redes existentes |
| `docker network inspect <red>` | Detalle de una red (subred, gateway, contenedores) |
| `--network bridge` | Conecta a la bridge por defecto (es el valor implicito) |
| `--network host` | Usa la pila de red del host (Linux) |
| `--network none` | Sin red, solo loopback |
| `docker inspect -f '{{...}}' <contenedor>` | Extrae campos concretos, p. ej. la IP |
| `docker network rm <red>` | Borra una red (no las predefinidas en uso) |

## Pruebalo tu

1. Ejecuta `docker network ls` y localiza `bridge`, `host` y `none`.
2. Lanza `docker run -d --name c1 nginx:alpine` y consulta su IP con `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' c1`.
3. Lanza un segundo contenedor `c2` igual y, desde el, haz `docker exec c2 ping -c2 <ip-de-c1>`: responde por IP.
4. Ahora prueba `docker exec c2 ping -c2 c1`: en la bridge **por defecto** falla la resolucion por nombre (lo arreglaras en la siguiente leccion).
5. Limpia: `docker rm -f c1 c2 web`.

## Errores comunes

- **`ping: bad address 'c1'`** en la bridge por defecto: es esperado, no hay DNS interno. Crea una red definida por usuario para resolver por nombre.
- **`--network host` no expone mi puerto en Docker Desktop**: en macOS/Windows el modo host no funciona como en Linux. Usa `-p` con la red bridge.
- **Dos contenedores no se ven**: comprueba que estan en la **misma** red con `docker inspect`. Estar ambos en bridge por defecto los aisla por nombre, no por IP.

> Idea clave: Docker trae `bridge` (por defecto, conecta por IP pero sin DNS), `host` (sin aislamiento de red, solo Linux) y `none` (sin red); para comunicacion comoda por nombre necesitaras redes definidas por usuario.
