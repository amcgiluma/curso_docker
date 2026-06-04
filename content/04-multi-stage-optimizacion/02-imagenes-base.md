---
title: "Elegir imagen base: alpine, distroless, scratch y slim"
slug: "imagenes-base"
order: 2
summary: "Cuándo usar cada base según tamaño, herramientas y depuración."
---

# Elegir imagen base: alpine, distroless, scratch y slim

La imagen base marca el tamaño, la seguridad y lo fácil que será depurar. No hay una "mejor": hay una adecuada para cada caso. Vamos a comparar las opciones típicas usando el ejemplo `examples/go-multi-stage/`.

## Teoría

| Base | Tamaño aprox. | Tiene shell/herramientas | Cuándo usarla |
| --- | --- | --- | --- |
| `*-slim` (ej. `debian:12-slim`, `python:3.12-slim`) | decenas de MB | Sí (apt, shell) | Equilibrio: compatible y cómodo, más ligero que la full |
| `alpine` | ~5-8 MB | Sí (`sh`, `apk`) | Imágenes pequeñas con shell para depurar |
| `distroless` (gcr.io/distroless) | ~20-50 MB | No (solo runtime + libs) | Producción segura con runtime gestionado |
| `scratch` | 0 MB | No (vacía del todo) | Binarios estáticos (Go, Rust) ultra mínimos |

Matices que importan:

- **Alpine usa musl libc** (no glibc). La mayoría de cosas funcionan, pero algún binario compilado contra glibc puede fallar. También usa `apk` en vez de `apt`.
- **Distroless** no trae shell ni gestor de paquetes: menos superficie de ataque, pero **no puedes hacer `docker exec ... sh`** para depurar (existen variantes `:debug`).
- **scratch** es literalmente vacía: solo sirve si tu binario es **estático** y autosuficiente. Ni siquiera hay certificados TLS ni `/etc/passwd`.

> Regla práctica: empieza por `slim` o `alpine` mientras desarrollas; pasa a `distroless`/`scratch` para producción cuando busques mínimo tamaño y máxima seguridad.

## Manos a la obra

Entra en el ejemplo Go:

```bash
cd examples/go-multi-stage
```

Construye la variante Alpine:

```compare
# CMD
docker build -t curso/go-base:alpine .
docker run --rm curso/go-base:alpine
# OUT
hola desde Go en Docker
arch=amd64 os=linux
# (la arquitectura puede variar según tu máquina)
```

Construye la variante `scratch`, que solo contiene el binario y certificados TLS:

```compare
# CMD
docker build -f Dockerfile.scratch -t curso/go-base:scratch .
docker run --rm curso/go-base:scratch
# OUT
hola desde Go en Docker
arch=amd64 os=linux
```

Compara tamaños:

```compare
# CMD
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep "curso/go-base"
# OUT
curso/go-base:scratch 4.5MB
curso/go-base:alpine  10.5MB
# (los tamaños varían según tu binario y versiones base)
```

Comprueba que en `scratch` no hay shell:

```compare
# CMD
docker run --rm --entrypoint sh curso/go-base:scratch
# OUT
docker: Error response from daemon: failed to create task for container: ...
exec: "sh": executable file not found in $PATH
```

En Alpine sí tienes shell para depurar, pero recuerda `apk` y musl:

```compare
# CMD
docker run --rm alpine:3.20 sh -c "cat /etc/os-release | head -1"
# OUT
NAME="Alpine Linux"
```

## Flags y variantes

| Base / acción | Detalle | Nota |
| --- | --- | --- |
| `debian:12-slim` | Quita docs y locales | Buen punto medio con glibc |
| `python:3.12-slim` | Variante slim oficial | Evita la full salvo que necesites compiladores |
| `alpine:3.20` | `apk add --no-cache <pkg>` | `--no-cache` evita dejar el índice de apk |
| `gcr.io/distroless/base` | Sin shell ni gestor | Variante `:debug` trae busybox para depurar |
| `gcr.io/distroless/static` | Para binarios estáticos | Incluye certs y tzdata |
| `scratch` | Vacía | Copia tú mismo los `ca-certificates.crt` si haces TLS |
| Cualquier base | `--platform` | Asegura la arquitectura correcta |

## Pruébalo tú

1. Entra en `examples/go-multi-stage`.
2. Construye `curso/go-base:alpine` con el `Dockerfile` principal.
3. Construye `curso/go-base:scratch` con `Dockerfile.scratch`.
4. Compara tamaños con `docker images`.
5. Intenta abrir shell en `scratch` con `docker run --rm --entrypoint sh curso/go-base:scratch`.
6. En Alpine, instala algo temporalmente con `docker run --rm alpine:3.20 sh -c "apk add --no-cache curl && curl --versión"`.

## Errores comunes

- **TLS roto en `scratch`**: faltan los certificados raíz. Copia `/etc/ssl/certs/ca-certificates.crt` desde la etapa de build.
- **Binario que no arranca en Alpine**: fue compilado contra glibc y Alpine usa musl. Compila estático o usa una base con glibc (`slim`).
- **No poder depurar en distroless/scratch**: no hay shell; usa una variante `:debug`, un sidecar o una imagen temporal con herramientas.
- **Usar la imagen `full` en producción**: arrastra compiladores y paquetes innecesarios. Cambia a `slim`/`alpine`/`distroless`.
- **`apk` sin `--no-cache`**: deja el índice de paquetes en la capa; usa `apk add --no-cache`.

> Idea clave: `slim` para comodidad, `alpine` para pequeño con shell, `distroless` para producción segura sin shell, y `scratch` para binarios estáticos mínimos. Cuánto más mínima la base, menos peso y riesgo, pero menos podrás depurar dentro.
