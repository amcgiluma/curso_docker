---
title: "Gestión de secretos"
slug: "secretos"
order: 3
summary: "Build secrets, secrets de Compose y por qué no usar variables de entorno."
---

# Gestión de secretos

Contraseñas, tokens y claves nunca deberían quedar grabados en la imagen ni expuestos en variables de entorno. Docker ofrece **build secrets** (durante la construcción) y **secrets de Compose** (en ejecución) para manejarlos de forma segura.

## Teoría

Por qué **no** usar `ENV`/`ARG` para secretos:

- **`ENV`**: queda en la imagen y aparece en `docker inspect`, en `docker history` y en la lista de variables de cualquier proceso. Cualquiera con la imagen lo ve.
- **`ARG`**: aunque no persiste como variable en runtime, su valor puede quedar en la cache de capas y en `docker history` según cómo se use.
- Las variables de entorno se filtran con fácilidad: logs, volcados de error, `/proc/<pid>/environ`, herramientas de monitorizacion.

Mecanismos correctos:

- **Build secrets (BuildKit)**: `RUN --mount=type=secret,id=...` expone el secreto solo durante ese `RUN`, montado en `/run/secrets/<id>`, y **no** queda en la imagen final. Lo verás a fondo en el módulo de Build avanzado.
- **Secrets en runtime (Compose)**: se montan como ficheros en `/run/secrets/<nombre>`; el proceso los lee del fichero, no del entorno.

> Patron `_FILE`: muchas imágenes oficiales (postgres, mysql, etc.) aceptan `VAR_FILE` apuntando a un fichero de secreto, en vez de `VAR` con el valor en claro. Combina perfecto con los secrets de Compose.

## Manos a la obra

Build secret: usa una clave durante el build sin que quede en la imagen:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.20
RUN --mount=type=secret,id=api_key \
    sh -c 'echo "usando clave de longitud: $(wc -c < /run/secrets/api_key)"'
```

```compare
# CMD
echo "clave-super-secreta" > api_key.txt
docker build --secret id=api_key,src=api_key.txt -t demo-secret .
# OUT
 => [2/2] RUN --mount=type=secret,id=api_key sh -c 'echo "usando clave de longitud: $(wc -c < /run/secrets/api_key)"'
 => => # usando clave de longitud: 20
```

Comprueba que el secreto NO quedo en la imagen:

```compare
# CMD
docker history --no-trunc demo-secret | grep -i "clave-super-secreta" || echo "no aparece el secreto"
# OUT
no aparece el secreto
```

Secret en runtime con Compose (patrón `_FILE`):

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./db_password.txt
```

```compare
# CMD
echo "P@ssw0rd-fichero" > db_password.txt
docker compose up -d
docker compose exec db cat /run/secrets/db_password
# OUT
P@ssw0rd-fichero
```

## Flags y variantes

| Mecanismo | Qué hace |
| --- | --- |
| `RUN --mount=type=secret,id=<id>` | Monta un secreto solo durante ese `RUN` (build) |
| `docker build --secret id=<id>,src=<fichero>` | Pasa el fichero de secreto al build |
| `docker build --secret id=<id>,env=<VAR>` | Pasa el secreto desde una variable de entorno |
| `secrets:` (Compose, top-level) `file:` | Define un secreto desde un fichero |
| `secrets:` (Compose, top-level) `environment:` | Define un secreto desde una variable |
| `secrets: [<nombre>]` (servicio) | Lo monta en `/run/secrets/<nombre>` |
| `VAR_FILE` (imágenes oficiales) | Lee el secreto desde fichero en vez de env |

## Pruébalo tú

1. Crea `api_key.txt` con un valor y el `Dockerfile` con `--mount=type=secret`.
2. Construye con `docker build --secret id=api_key,src=api_key.txt -t demo-secret .`.
3. Verifica que el secreto no aparece: `docker history --no-trunc demo-secret` no debe contener el valor.
4. Crea un `compose.yaml` con `secrets` (patrón `_FILE`) y `db_password.txt`.
5. Comprueba con `docker compose exec db printenv POSTGRES_PASSWORD` que NO existe la variable con el valor (solo `..._FILE`).

## Errores comunes

- **`ENV API_KEY=...` en el Dockerfile**: el secreto queda visible en la imagen y en `docker history`. Usa build secrets o secrets de runtime.
- **`--mount=type=secret` da error de sintaxis**: falta la cabecera `# syntax=docker/dockerfile:1` o no usas BuildKit. En Docker moderno BuildKit es el motor por defecto.
- **El fichero del secreto en el repo**: nunca subas `db_password.txt`/`api_key.txt` al control de versiones. Añadelos a `.gitignore` y a `.dockerignore`.
- **Confiar en `ARG` para secretos**: el valor puede acabar en cache o en `history`. `ARG` es para configuración no sensible.

> Idea clave: nunca metas secretos en `ENV`/`ARG` ni en la imagen; usa **build secrets** (`--mount=type=secret`) durante la construcción y **secrets de Compose** con el patrón `_FILE` en ejecución.
