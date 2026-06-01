---
title: "Capabilities, read-only y no-new-privileges"
slug: "capabilities-readonly"
order: 2
summary: "Reducir capabilities, sistema de ficheros de solo lectura y bloquear escalada de privilegios."
---

# Capabilities, read-only y no-new-privileges

Aunque el contenedor corra como no root, conviene reducir aun mas lo que puede hacer: quitarle **capabilities** que no use, montar el sistema de ficheros en **solo lectura** y bloquear la **escalada de privilegios**.

## Teoria

**Capabilities**: Linux divide los privilegios de root en piezas (capabilities) como `NET_BIND_SERVICE` (bindear puertos bajos) o `CHOWN`. Docker arranca con un conjunto por defecto razonable, pero la buena practica es **quitarlas todas y anadir solo las imprescindibles**.

**`--read-only`**: monta el sistema de ficheros raiz del contenedor en solo lectura. Si la app necesita escribir en algun sitio concreto (cache, `/tmp`), montas ahi un `tmpfs` o un volume escribible. Esto reduce el dano de una intrusion: el atacante no puede modificar binarios ni dejar payloads.

**`no-new-privileges`**: impide que un proceso gane privilegios via binarios `setuid`/`setgid` (evita escaladas tipo `sudo`/`su` dentro del contenedor).

> Combinar las tres (`--cap-drop ALL`, `--read-only` + tmpfs, `--security-opt no-new-privileges`) endurece mucho el contenedor con muy poco esfuerzo.

## Manos a la obra

Quita todas las capabilities y anade solo la necesaria para bindear el puerto 80:

```compare
# CMD
docker run -d --name web-hardened \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  nginx:alpine
docker inspect -f '{{.HostConfig.CapDrop}} | {{.HostConfig.CapAdd}}' web-hardened
# OUT
[ALL] | [NET_BIND_SERVICE]
```

Sistema de ficheros de solo lectura con un `tmpfs` para lo escribible:

```compare
# CMD
docker run --rm --read-only --tmpfs /tmp alpine sh -c "touch /tmp/ok && touch /no.txt"
# OUT
touch: /no.txt: Read-only file system
```

Bloquea la escalada de privilegios:

```compare
# CMD
docker run --rm --security-opt no-new-privileges alpine sh -c "echo proceso-restringido"
# OUT
proceso-restringido
```

## Flags y variantes

| Flag | Que hace |
| --- | --- |
| `--cap-drop ALL` | Quita todas las capabilities |
| `--cap-add <CAP>` | Anade una capability concreta (p. ej. `NET_BIND_SERVICE`) |
| `--cap-drop <CAP>` | Quita una capability concreta |
| `--read-only` | Monta el rootfs del contenedor en solo lectura |
| `--tmpfs /tmp` | Da una ruta escribible en RAM (combina con `--read-only`) |
| `--security-opt no-new-privileges` | Impide ganar privilegios via setuid/setgid |
| `--security-opt seccomp=<perfil>` | Aplica un perfil seccomp personalizado |
| `--privileged` | (EVITAR) da casi todos los privilegios; rompe el aislamiento |

### Equivalente en Compose

```yaml
services:
  web:
    image: nginx:alpine
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
```

## Pruebalo tu

1. Lanza nginx con `--cap-drop ALL --cap-add NET_BIND_SERVICE` y verifica con `docker inspect -f '{{.HostConfig.CapDrop}}' <contenedor>`.
2. Prueba `--read-only`: `docker run --rm --read-only alpine touch /x` debe fallar con *Read-only file system*.
3. Anade `--tmpfs /tmp` y comprueba que `touch /tmp/ok` sí funciona.
4. Ejecuta un contenedor con `--security-opt no-new-privileges` y, dentro, intenta usar un binario setuid: no debe poder escalar.
5. Pasa la misma configuracion a un `compose.yaml` usando `cap_drop`, `read_only`, `tmpfs` y `security_opt`.

## Errores comunes

- **La app deja de arrancar tras `--cap-drop ALL`**: necesita alguna capability concreta. Identificala (p. ej. `NET_BIND_SERVICE`, `CHOWN`, `SETUID`) y anadela con `--cap-add`.
- **`--read-only` rompe la aplicacion**: la app escribe en rutas como `/tmp`, `/var/run` o cache. Monta `tmpfs`/volumes en esas rutas concretas.
- **Usar `--privileged` "para que funcione"**: desactiva casi todo el aislamiento y es un riesgo grave. Casi nunca es necesario; busca la capability concreta que falta.
- **`no-new-privileges` y sudo**: dentro del contenedor no podras escalar con setuid; es justo lo que buscamos. No lo uses si dependes de un binario setuid legitimo (raro en contenedores).

> Idea clave: endurece con `--cap-drop ALL` + `--cap-add` solo lo necesario, `--read-only` con `tmpfs` para lo escribible y `--security-opt no-new-privileges`; evita `--privileged`.
