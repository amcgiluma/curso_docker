---
title: "Secret y SSH mounts en el build"
slug: "secret-ssh-mounts"
order: 3
summary: "Usar RUN --mount=type=secret y type=ssh para builds seguros sin filtrar credenciales."
---

# Secret y SSH mounts en el build

A veces el build necesita una credencial: un token para descargar un paquete privado o una clave SSH para clonar un repo. BuildKit permite inyectarlos con `RUN --mount=type=secret` y `RUN --mount=type=ssh` **sin** que queden en la imagen ni en la cache.

## Teoría

El problema clásico: para clonar un repo privado o instalar dependencias privadas, necesitas credenciales en el build. Si las pasas con `ARG`/`ENV` o las copias con `COPY`, quedan grabadas en alguna capa.

BuildKit lo resuelve montando el secreto **solo durante ese `RUN`**:

- **`type=secret`**: monta un fichero (o variable) en `/run/secrets/<id>` durante el `RUN`. No se persiste en la imagen.
- **`type=ssh`**: reenvía tu **agente SSH** al build, de modo que comandos como `git clone git@...` funcionen usando tus claves, sin copiarlas a la imagen.

Ambos requieren BuildKit (motor por defecto) y declarar el secreto/agente al ejecutar `docker build`.

> El secreto solo existe dentro de ese `RUN`. Despues no está en el sistema de ficheros de la imagen, ni en `docker history`. Es la forma correcta de manejar credenciales de build.

## Manos a la obra

**Secret mount**: usar un token sin que quede en la imagen:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.20
RUN --mount=type=secret,id=npm_token \
    sh -c 'TOKEN=$(cat /run/secrets/npm_token); echo "token recibido (len=${#TOKEN})"'
```

```compare
# CMD
echo "npm_xxx_token_secreto" > token.txt
docker build --secret id=npm_token,src=token.txt -t demo-token .
# OUT
 => [2/2] RUN --mount=type=secret,id=npm_token sh -c 'TOKEN=$(cat /run/secrets/npm_token); echo "token recibido (len=${#TOKEN})"'
 => => # token recibido (len=21)
```

También puedes pasarlo desde una variable de entorno (sin fichero):

```compare
# CMD
docker build --secret id=npm_token,env=NPM_TOKEN -t demo-token .
# OUT
 => => # token recibido (len=<n>)
```

**SSH mount**: clonar un repo privado usando tu agente SSH:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.20
RUN apk add --no-cache git openssh-client
RUN mkdir -p ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN --mount=type=ssh \
    git clone git@github.com:<usuario>/<repo-privado>.git /app
```

```compare
# CMD
ssh-add ~/.ssh/id_ed25519
docker build --ssh default -t demo-ssh .
# OUT
 => [4/4] RUN --mount=type=ssh git clone git@github.com:<usuario>/<repo-privado>.git /app
 => => # Cloning into '/app'...
```

## Flags y variantes

| Elemento | Qué hace |
| --- | --- |
| `RUN --mount=type=secret,id=<id>` | Monta el secreto en `/run/secrets/<id>` durante el `RUN` |
| `RUN --mount=type=secret,id=<id>,target=<ruta>` | Monta el secreto en una ruta concreta |
| `RUN --mount=type=secret,id=<id>,required=true` | Falla si no se proporciona el secreto |
| `--secret id=<id>,src=<fichero>` | Pasa el secreto desde un fichero |
| `--secret id=<id>,env=<VAR>` | Pasa el secreto desde una variable de entorno |
| `RUN --mount=type=ssh` | Reenvía el agente SSH al `RUN` |
| `RUN --mount=type=ssh,id=<id>` | Usa un socket SSH concreto |
| `--ssh default` | Reenvía el agente SSH por defecto (`$SSH_AUTH_SOCK`) |
| `--ssh <id>=<ruta-al-socket-o-clave>` | Reenvía un socket/clave SSH concreto |

## Pruébalo tú

1. Crea `token.txt` con un valor y el `Dockerfile` del secret mount.
2. Construye con `docker build --secret id=npm_token,src=token.txt -t demo-token .` y comprueba que imprime la longitud.
3. Verifica que el token NO está en la imagen: `docker run --rm demo-token cat /run/secrets/npm_token` debe fallar (no existe en runtime).
4. Para SSH: arranca el agente (`ssh-add`), usa el `Dockerfile` de `type=ssh` apuntando a un repo privado tuyo y construye con `docker build --ssh default -t demo-ssh .`.
5. Revisa `docker history --no-trunc demo-token`: la credencial no debe aparecer.

## Errores comunes

- **`failed to get secret: secret <id> not found`**: no pasaste el `--secret` al `docker build`, o el `id` no coincide con el del `--mount`.
- **`type=secret` no reconocido**: falta `# syntax=docker/dockerfile:1` o no usas BuildKit.
- **`Permission denied (publickey)` con `type=ssh`**: el agente SSH no está corriendo o la clave no está cargada. Ejecuta `ssh-add` y verifica con `ssh-add -l`; recuerda añadir el host a `known_hosts`.
- **Copiar la clave con `COPY id_rsa`**: NUNCA lo hagas; la clave queda en una capa. Usa `--mount=type=ssh`.

> Idea clave: para credenciales de build usa `RUN --mount=type=secret` (tokens) y `RUN --mount=type=ssh` (clonar repos privados con tu agente); el secreto vive solo durante ese `RUN` y nunca queda en la imagen.
