---
title: "Builds multi-stage"
slug: "multi-stage-builds"
order: 1
summary: "Separar build y runtime con varias etapas, targets y COPY --from."
---

# Builds multi-stage

Un build multi-stage usa **varias etapas `FROM`** en un mismo Dockerfile: una (o varias) para compilar y otra, minima, para ejecutar. Asi tu imagen final no carga con compiladores, SDKs ni codigo fuente.

## Teoria

La idea: en la etapa de build instalas todo lo necesario para compilar; en la etapa final copias **solo el artefacto** resultante con `COPY --from`. Las etapas intermedias no acaban en la imagen publicada.

```dockerfile
# Etapa 1: construir
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/app ./cmd/app

# Etapa 2: runtime minimo
FROM alpine:3.20
COPY --from=build /bin/app /usr/local/bin/app
ENTRYPOINT ["app"]
```

Conceptos:

- **`FROM ... AS nombre`**: nombra una etapa para referirte a ella.
- **`COPY --from=build <origen> <destino>`**: copia desde otra etapa (o incluso desde una imagen externa, `--from=nginx:alpine`).
- **`--target`**: construye **hasta** una etapa concreta (`docker build --target build`), util para depurar o para una imagen de tests.
- BuildKit solo construye las etapas de las que dependa el objetivo: si la final no usa una etapa, no se ejecuta.

> Beneficio doble: imagen final pequena (sin toolchain) y mas segura (menor superficie de ataque, sin compiladores ni codigo fuente).

## Manos a la obra

Compara el tamano de una imagen "todo en uno" frente a la multi-stage. La final solo lleva el binario:

```compare
# CMD
docker build -t app:multi .
docker images app:multi --format "{{.Repository}}:{{.Tag}} {{.Size}}"
# OUT
[+] Building 22.4s (14/14) FINISHED
...
app:multi 12.8MB
```

Una imagen monolitica con `golang:1.23` rondaria los 800 MB; la multi-stage baja a ~13 MB.

Construye solo la etapa de build (para inspeccionar o testear) con `--target`:

```compare
# CMD
docker build --target build -t app:builder .
docker run --rm app:builder ls -la /bin/app
# OUT
[+] Building 18.9s ...
-rwxr-xr-x 1 root root 7340032 Jun  1 14:00 /bin/app
```

Puedes copiar desde una imagen externa sin definirla como etapa:

```dockerfile
FROM alpine:3.20
COPY --from=nginx:alpine /etc/nginx/nginx.conf /tmp/nginx.conf
```

```compare
# CMD
docker build -t fromimg .
docker run --rm fromimg head -1 /tmp/nginx.conf
# OUT
user  nginx;
```

## Flags y variantes

| Elemento | Forma / flag | Para que sirve |
| --- | --- | --- |
| Nombrar etapa | `FROM img AS build` | Referencia legible para `--from`/`--target` |
| Copiar de etapa | `COPY --from=build /ruta /ruta` | Trae solo el artefacto |
| Copiar de imagen | `COPY --from=nginx:alpine ...` | Reutiliza ficheros de otra imagen |
| Copiar por indice | `COPY --from=0 ...` | Referencia la etapa por su orden (0,1,...) |
| Construir hasta | `docker build --target build` | Para una etapa concreta (debug/tests) |
| Propietario | `COPY --from=build --chown=1001 ...` | Asigna UID al copiar |
| Etapa base comun | `FROM base AS x` reutilizada | Comparte preparacion entre etapas |

## Pruebalo tu

1. Crea el Dockerfile Go (o adapta a tu lenguaje: Node, Java, Rust...) con dos etapas.
2. Construye `docker build -t app:multi .` y mira el tamano con `docker images`.
3. Construye solo la etapa de build con `--target build` y entra a inspeccionar el artefacto.
4. Comenta la etapa final y construye una version "monolitica"; compara tamanos.
5. Prueba `COPY --from=nginx:alpine ...` para traer un fichero de otra imagen sin descargarla aparte.

## Errores comunes

- **`COPY --from` con ruta equivocada**: el origen es una ruta **dentro de la etapa**, no de tu host. Verifica donde dejaste el artefacto en la etapa de build.
- **Copiar de mas y arrastrar el toolchain**: si copias `/src` entero en vez del binario, pierdes la ventaja. Copia solo el artefacto.
- **Olvidar `CGO_ENABLED=0` (Go) o el flag de binario estatico**: el binario depende de libs que no estan en Alpine y falla con `not found`. Compila estatico o usa una base con esas libs.
- **`--target` y esperar la imagen final**: `--target build` para en esa etapa; no incluye lo de la etapa de runtime.

> Idea clave: separa "compilar" de "ejecutar" en etapas. Instala el toolchain en la etapa de build y copia con `COPY --from` solo el artefacto a una base minima. Resultado: imagenes pequenas, rapidas de desplegar y mas seguras.
