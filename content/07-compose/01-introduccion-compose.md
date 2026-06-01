---
title: "Introduccion a Docker Compose"
slug: "introduccion-compose"
order: 1
summary: "Estructura del compose.yaml y comandos CLI: up, down, ps, logs, exec, build, config."
---

# Introduccion a Docker Compose

Docker Compose define una aplicacion multi-contenedor en un solo fichero YAML y la gestiona con comandos sencillos. En lugar de lanzar `docker run` con docenas de flags, declaras los servicios y dejas que Compose los levante juntos.

## Teoria

Compose moderno es un **plugin** de la CLI: se invoca como `docker compose` (con espacio), no como el antiguo binario `docker-compose`. El fichero por defecto es `compose.yaml` (tambien acepta `docker-compose.yml`).

Estructura basica del fichero:

- **`services`**: cada servicio es un contenedor (o conjunto de replicas) con su imagen, puertos, volumenes, etc.
- **`networks`**: redes definidas por usuario (Compose crea una por defecto para el proyecto).
- **`volumes`**: volumes nombrados compartidos por los servicios.

Compose agrupa todo bajo un **proyecto** (por defecto, el nombre de la carpeta). Crea automaticamente una red para que los servicios se vean por su nombre (DNS interno).

> El campo `version:` al principio del fichero es **obsoleto** en Compose v2 y solo genera un aviso. Puedes omitirlo.

## Manos a la obra

Un `compose.yaml` minimo con dos servicios:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
  cache:
    image: redis:alpine
```

Levanta la aplicacion en segundo plano y mira el estado:

```compare
# CMD
docker compose up -d
docker compose ps
# OUT
[+] Running 3/3
 ✔ Network proyecto_default    Created
 ✔ Container proyecto-cache-1  Started
 ✔ Container proyecto-web-1    Started
NAME                IMAGE          COMMAND                  SERVICE   STATUS         PORTS
proyecto-cache-1    redis:alpine   "docker-entrypoint.s…"   cache     Up 2 seconds   6379/tcp
proyecto-web-1      nginx:alpine   "/docker-entrypoint.…"   web       Up 2 seconds   0.0.0.0:8080->80/tcp
```

Valida y muestra la configuracion ya resuelta (interpolada):

```compare
# CMD
docker compose config
# OUT
name: proyecto
services:
  cache:
    image: redis:alpine
    networks:
      default: null
  web:
    image: nginx:alpine
    networks:
      default: null
    ports:
      - mode: ingress
        target: 80
        published: "8080"
        protocol: tcp
networks:
  default:
    name: proyecto_default
```

Para todo y borra red/contenedores:

```compare
# CMD
docker compose down
# OUT
[+] Running 3/3
 ✔ Container proyecto-web-1    Removed
 ✔ Container proyecto-cache-1  Removed
 ✔ Network proyecto_default    Removed
```

## Flags y variantes

| Comando | Que hace |
| --- | --- |
| `docker compose up` | Crea y arranca los servicios (en primer plano) |
| `docker compose up -d` | Igual, pero en segundo plano (detached) |
| `docker compose up --build` | Reconstruye las imagenes antes de arrancar |
| `docker compose down` | Para y elimina contenedores y la red del proyecto |
| `docker compose down -v` | Ademas borra los volumes nombrados del proyecto |
| `docker compose ps` | Lista los contenedores del proyecto |
| `docker compose logs -f` | Sigue los logs de todos los servicios |
| `docker compose logs -f web` | Logs solo del servicio `web` |
| `docker compose exec web sh` | Abre una shell en un contenedor en marcha |
| `docker compose run --rm web <cmd>` | Lanza un contenedor puntual del servicio |
| `docker compose build` | Construye las imagenes con `build:` |
| `docker compose config` | Valida e imprime la configuracion final |
| `docker compose config --services` | Lista solo los nombres de servicio |
| `docker compose stop` / `start` | Para / arranca sin borrar |

## Pruebalo tu

1. Crea una carpeta `mi-app` y dentro el `compose.yaml` del ejemplo.
2. Ejecuta `docker compose up -d` y abre `http://localhost:8080`.
3. Comprueba el estado con `docker compose ps` y los logs con `docker compose logs web`.
4. Entra al contenedor web con `docker compose exec web sh` y sal con `exit`.
5. Valida la config con `docker compose config` y por ultimo `docker compose down`.

## Errores comunes

- **`docker-compose: command not found`**: usa la sintaxis moderna `docker compose` (con espacio); el binario antiguo con guion puede no estar instalado.
- **`no configuration file provided: not found`**: no estas en la carpeta del `compose.yaml` o el fichero tiene otro nombre. Usa `-f <fichero>` o situate en el directorio correcto.
- **Aviso `the attribute 'version' is obsolete`**: elimina la linea `version:` del fichero.
- **El puerto no responde**: revisa el mapeo `ports:` y que el servicio escuche en `0.0.0.0` dentro del contenedor.

> Idea clave: Compose declara tu app multi-contenedor en `compose.yaml` y la maneja con `up`, `down`, `ps`, `logs`, `exec`, `build` y `config`; usa la sintaxis moderna `docker compose` y valida siempre con `config`.
