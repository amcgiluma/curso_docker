---
title: "Elegir imagen base: alpine, distroless, scratch y slim"
slug: "imagenes-base"
order: 2
summary: "Cuando usar cada base segun tamano, herramientas y depuracion."
---

# Elegir imagen base: alpine, distroless, scratch y slim

La imagen base marca el tamano, la seguridad y lo facil que sera depurar. No hay una "mejor": hay una adecuada para cada caso. Vamos a comparar las cuatro opciones tipicas.

## Teoria

| Base | Tamano aprox. | Tiene shell/herramientas | Cuando usarla |
| --- | --- | --- | --- |
| `*-slim` (ej. `debian:12-slim`, `python:3.12-slim`) | decenas de MB | Si (apt, shell) | Equilibrio: compatible y comodo, mas ligero que la full |
| `alpine` | ~5-8 MB | Si (`sh`, `apk`) | Imagenes pequenas con shell para depurar |
| `distroless` (gcr.io/distroless) | ~20-50 MB | No (solo runtime + libs) | Produccion segura con runtime gestionado |
| `scratch` | 0 MB | No (vacia del todo) | Binarios estaticos (Go, Rust) ultra minimos |

Matices que importan:

- **Alpine usa musl libc** (no glibc). La mayoria de cosas funcionan, pero algun binario compilado contra glibc puede fallar. Tambien usa `apk` en vez de `apt`.
- **Distroless** no trae shell ni gestor de paquetes: menos superficie de ataque, pero **no puedes hacer `docker exec ... sh`** para depurar (existen variantes `:debug`).
- **scratch** es literalmente vacia: solo sirve si tu binario es **estatico** y autosuficiente. Ni siquiera hay certificados TLS ni `/etc/passwd`.

> Regla practica: empieza por `slim` o `alpine` mientras desarrollas; pasa a `distroless`/`scratch` para produccion cuando busques minimo tamano y maxima seguridad.

## Manos a la obra

Compara el tamano de la misma app sobre distintas bases. Con un binario Go estatico, `scratch` es imbatible:

```dockerfile
# scratch: solo el binario
FROM scratch
COPY --from=build /bin/app /app
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/app"]
```

```compare
# CMD
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep app
# OUT
app:scratch 7.01MB
app:distroless 28.3MB
app:alpine 12.8MB
app:slim 84.6MB
# (los tamanos varian segun tu binario)
```

Comprueba que en `scratch`/`distroless` no hay shell (no puedes entrar a depurar):

```compare
# CMD
docker run --rm app:scratch sh
# OUT
docker: Error response from daemon: failed to create task for container: ...
exec: "sh": executable file not found in $PATH
```

En Alpine si tienes shell para depurar, pero recuerda `apk` y musl:

```compare
# CMD
docker run --rm alpine:3.20 sh -c "cat /etc/os-release | head -1"
# OUT
NAME="Alpine Linux"
```

## Flags y variantes

| Base / accion | Detalle | Nota |
| --- | --- | --- |
| `debian:12-slim` | Quita docs y locales | Buen punto medio con glibc |
| `python:3.12-slim` | Variante slim oficial | Evita la full salvo que necesites compiladores |
| `alpine:3.20` | `apk add --no-cache <pkg>` | `--no-cache` evita dejar el indice de apk |
| `gcr.io/distroless/base` | Sin shell ni gestor | Variante `:debug` trae busybox para depurar |
| `gcr.io/distroless/static` | Para binarios estaticos | Incluye certs y tzdata |
| `scratch` | Vacia | Copia tu mismo los `ca-certificates.crt` si haces TLS |
| Cualquier base | `--platform` | Asegura la arquitectura correcta |

## Pruebalo tu

1. Construye tu app (o un binario Go de ejemplo) sobre `scratch`, `alpine` y `debian:12-slim`.
2. Compara tamanos con `docker images`.
3. Intenta `docker run --rm app:scratch sh` y observa el error de "no shell".
4. En Alpine, instala algo con `apk add --no-cache curl` y comprueba que `apt` no existe.
5. Si haces peticiones HTTPS desde `scratch`, prueba sin copiar los certificados y observa el error TLS; luego copialos y verifica que funciona.

## Errores comunes

- **TLS roto en `scratch`**: faltan los certificados raiz. Copia `/etc/ssl/certs/ca-certificates.crt` desde la etapa de build.
- **Binario que no arranca en Alpine**: compilado contra glibc y Alpine usa musl. Compila estatico o usa una base con glibc (`slim`).
- **No poder depurar en distroless**: no hay shell; usa la etiqueta `:debug` o copia un binario estatico de busybox temporalmente.
- **Usar la imagen `full` en produccion**: arrastra compiladores y paquetes innecesarios. Cambia a `slim`/`alpine`/`distroless`.
- **`apk` sin `--no-cache`**: deja el indice de paquetes en la capa; usa `apk add --no-cache`.

> Idea clave: `slim` para comodidad, `alpine` para pequeno con shell, `distroless` para produccion segura sin shell, y `scratch` para binarios estaticos minimos. Cuanto mas minima la base, menos peso y riesgo, pero menos podras depurar dentro.
