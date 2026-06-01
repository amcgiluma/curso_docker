---
title: "Redes avanzadas"
slug: "redes-avanzadas"
order: 4
summary: "Drivers overlay y macvlan, y flags de network create como --subnet o --internal."
---

# Redes avanzadas

Mas alla de la bridge, Docker ofrece drivers para escenarios concretos: **overlay** para conectar contenedores en varios hosts y **macvlan** para darles una IP propia en tu red fisica. Tambien puedes controlar el direccionamiento con flags de `network create`.

## Teoria

| Driver | Cuando usarlo |
| --- | --- |
| `overlay` | Comunicar contenedores en **varios hosts** (Docker Swarm). Crea una red virtual que cruza la red fisica entre nodos |
| `macvlan` | Dar a cada contenedor una **MAC e IP propias** en tu LAN, como si fuera una maquina mas. Util para servicios que deben aparecer en la red fisica |
| `ipvlan` | Similar a macvlan pero comparte la MAC del host; util cuando el switch limita MACs |

**overlay**: requiere Swarm (`docker swarm init`). Usa una red de control (VXLAN) para encapsular el trafico entre nodos. Los servicios de Swarm la usan para descubrirse por nombre a traves de hosts.

**macvlan**: el contenedor obtiene una IP del mismo rango que tu red fisica y es visible directamente en la LAN. Necesitas indicar la subred, el gateway y la interfaz fisica padre (`parent`).

Ademas, en cualquier red bridge/overlay puedes fijar el direccionamiento con `--subnet`, `--gateway` y `--ip-range`, o aislarla del exterior con `--internal`.

> Una red `--internal` no tiene acceso de salida (sin ruta a Internet ni al host por NAT). Es ideal para la capa de base de datos: la app habla con la BBDD, pero la BBDD no sale a Internet.

## Manos a la obra

Crea una red bridge con subred y gateway fijos, y comprueba la subred:

```compare
# CMD
docker network create \
  --driver bridge \
  --subnet 172.28.0.0/16 \
  --gateway 172.28.0.1 \
  backend
docker network inspect -f '{{range .IPAM.Config}}{{.Subnet}} {{.Gateway}}{{end}}' backend
# OUT
<id-de-red>
172.28.0.0/16 172.28.0.1
```

Crea una red **interna** (sin salida a Internet) y verifica el flag:

```compare
# CMD
docker network create --internal datos-net
docker network inspect -f '{{.Internal}}' datos-net
# OUT
<id-de-red>
true
```

Asigna una IP fija a un contenedor dentro de la subred definida:

```compare
# CMD
docker run -d --name fija --network backend --ip 172.28.5.10 nginx:alpine
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' fija
# OUT
172.28.5.10
```

Para overlay, primero inicializa Swarm:

```bash
docker swarm init
docker network create --driver overlay --attachable mi-overlay
```

## Flags y variantes

| Flag de `docker network create` | Que hace |
| --- | --- |
| `--driver bridge\|overlay\|macvlan` | Elige el tipo de red |
| `--subnet <CIDR>` | Define la subred (p. ej. `172.28.0.0/16`) |
| `--gateway <ip>` | Fija el gateway de la red |
| `--ip-range <CIDR>` | Restringe el rango de IPs asignables |
| `--internal` | Red sin acceso de salida (aislada del exterior) |
| `--attachable` | Permite conectar contenedores standalone a una red overlay |
| `-o parent=<iface>` | (macvlan) interfaz fisica padre, p. ej. `eth0` |
| `--aux-address` | Reserva IPs para que Docker no las asigne |
| `docker run --ip <ip>` | Asigna IP fija (requiere red con `--subnet`) |

### Ejemplo macvlan

```bash
docker network create -d macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  -o parent=eth0 \
  lan-net
```

## Pruebalo tu

1. Crea una red con subred fija: `docker network create --subnet 172.30.0.0/16 lab-net`.
2. Lanza un contenedor con IP fija: `docker run -d --name ip-fija --network lab-net --ip 172.30.0.50 nginx:alpine`.
3. Comprueba la IP con `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ip-fija`.
4. Crea una red interna `docker network create --internal sin-salida` y lanza un contenedor en ella; intenta `docker run --rm --network sin-salida alpine ping -c2 8.8.8.8`: debe fallar (sin salida).
5. Limpia: `docker rm -f ip-fija` y `docker network rm lab-net sin-salida`.

## Errores comunes

- **`This node is not a swarm manager`** al crear overlay: `overlay` necesita Swarm. Ejecuta `docker swarm init` antes.
- **`Pool overlaps with other one on this address space`**: la `--subnet` elegida choca con otra red existente. Usa un rango distinto.
- **macvlan no funciona en Docker Desktop**: macvlan depende de acceso directo a la interfaz fisica del host Linux; no es compatible con Docker Desktop (macOS/Windows) de forma estandar.
- **`--ip` ignorado o error**: solo puedes fijar IP en redes creadas con `--subnet`; en la bridge por defecto no se permite.

> Idea clave: usa `overlay` para multi-host con Swarm y `macvlan` para dar IP de LAN a contenedores; controla el direccionamiento con `--subnet`/`--gateway`/`--ip-range` y aisla la salida con `--internal`.
