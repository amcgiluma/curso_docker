---
title: "Builds multi-stage"
slug: "multi-stage-builds"
order: 1
summary: "Separar build y runtime con varias etapas, targets y COPY --from."
---

# Builds multi-stage

Un build multi-stage usa **varias etapas `FROM`** en un mismo Dockerfile: una para compilar y otra, mínima, para ejecutar. Así tu imagen final no carga compiladores, SDKs ni código fuente.

## Teoría

La idea: en la etapa de build instalas todo lo necesario para compilar; en la etapa final copias **solo el artefacto** resultante con `COPY --from`. Las etapas intermedias no acaban en la imagen publicada.

Tienes dos formas de preparar el ejemplo:

**Opción A: clonar el repositorio del curso en tu máquina de pruebas.**

```bash
git clone https://github.com/amcgiluma/curso_docker.git
cd curso_docker/examples/go-multi-stage
```

**Opción B: usar esta misma copia del curso.** Si ya tienes el repositorio descargado, entra directamente en la carpeta del ejemplo:

```bash
cd examples/go-multi-stage
```

Si prefieres no clonar nada, copia estos archivos en una carpeta vacía. Primero crea `go.mod`:

```text
module example.com/curso-docker/go-multi-stage

go 1.23
```

Luego crea `cmd/app/main.go`:

```go
package main

import (
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "serve" {
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "hola desde Go en Docker\narch=%s os=%s\n", runtime.GOARCH, runtime.GOOS)
		})
		http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			fmt.Fprintln(w, "ok")
		})
		server := &http.Server{
			Addr:              ":8080",
			ReadHeaderTimeout: 5 * time.Second,
		}
		if err := server.ListenAndServe(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	fmt.Printf("hola desde Go en Docker\narch=%s os=%s\n", runtime.GOARCH, runtime.GOOS)
}
```

El `Dockerfile` principal compila la aplicación Go y deja en runtime solo Alpine + el binario:

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /bin/app ./cmd/app

FROM alpine:3.20
COPY --from=build /bin/app /usr/local/bin/app
EXPOSE 8080
ENTRYPOINT ["app"]
```

Conceptos:

- **`FROM ... AS nombre`**: nombra una etapa para referirte a ella.
- **`COPY --from=build <origen> <destino>`**: copia desde otra etapa o incluso desde una imagen externa, por ejemplo `--from=nginx:alpine`.
- **`--target`**: construye **hasta** una etapa concreta (`docker build --target build`), útil para depurar o para una imagen de tests.
- BuildKit solo construye las etapas de las que dependa el objetivo: si la final no usa una etapa, no se ejecuta.

> Beneficio doble: imagen final pequeña (sin toolchain) y más segura (menor superficie de ataque, sin compiladores ni código fuente).

## Manos a la obra

Construye el ejemplo Go multi-stage desde la carpeta del ejemplo:

```compare
# CMD
cd examples/go-multi-stage
docker build -t curso/go-multi-stage:alpine .
docker run --rm curso/go-multi-stage:alpine
# OUT
[+] Building ...
hola desde Go en Docker
arch=amd64 os=linux
# (la arquitectura puede variar según tu máquina)
```

Compara el tamaño de la imagen final: la imagen publicada solo lleva Alpine y el binario, no el SDK de Go.

```compare
# CMD
docker images curso/go-multi-stage:alpine --format "{{.Repository}}:{{.Tag}} {{.Size}}"
# OUT
curso/go-multi-stage:alpine 10.5MB
# (el tamaño varía según la versión de Go y Alpine)
```

Construye solo la etapa de build con `--target` para inspeccionar el artefacto:

```compare
# CMD
docker build --target build -t curso/go-multi-stage:builder .
docker run --rm curso/go-multi-stage:builder ls -lh /bin/app
# OUT
[+] Building ...
-rwxr-xr-x    1 root     root        4.2M <fecha> /bin/app
```

Puedes copiar desde una imagen externa sin definirla como etapa:

```dockerfile
FROM alpine:3.20
COPY --from=nginx:alpine /etc/nginx/nginx.conf /tmp/nginx.conf
CMD ["head", "-1", "/tmp/nginx.conf"]
```

```compare
# CMD
docker build -t curso/fromimg -f Dockerfile.fromimg .
docker run --rm curso/fromimg
# OUT
user  nginx;
```

## Flags y variantes

| Elemento | Forma / flag | Para qué sirve |
| --- | --- | --- |
| Nombrar etapa | `FROM img AS build` | Referencia legible para `--from`/`--target` |
| Copiar de etapa | `COPY --from=build /ruta /ruta` | Trae solo el artefacto |
| Copiar de imagen | `COPY --from=nginx:alpine ...` | Reútiliza ficheros de otra imagen |
| Copiar por índice | `COPY --from=0 ...` | Referencia la etapa por su orden (0, 1, ...) |
| Construir hasta | `docker build --target build` | Para una etapa concreta (debug/tests) |
| Propietario | `COPY --from=build --chown=1001 ...` | Asigna UID al copiar |
| Etapa base común | `FROM base AS x` reútilizada | Comparte preparación entre etapas |

## Pruébalo tú

1. Prepara el ejemplo con una de las dos opciones: `git clone https://github.com/amcgiluma/curso_docker.git && cd curso_docker/examples/go-multi-stage`, o copia los archivos de esta lección en una carpeta vacía.
2. Construye `docker build -t curso/go-multi-stage:alpine .`.
3. Ejecuta `docker run --rm curso/go-multi-stage:alpine`.
4. Construye solo la etapa de build con `docker build --target build -t curso/go-multi-stage:builder .`.
5. Inspecciona el binario con `docker run --rm curso/go-multi-stage:builder ls -lh /bin/app`.
6. Crea un `Dockerfile.fromimg` con el ejemplo de `COPY --from=nginx:alpine` y comprueba que puedes copiar ficheros desde otra imagen.

## Errores comunes

- **`COPY --from` con ruta equivocada**: el origen es una ruta **dentro de la etapa**, no de tu host. Verifica dónde dejaste el artefacto en la etapa de build.
- **Copiar de más y arrastrar el toolchain**: si copias `/src` entero en vez del binario, pierdes la ventaja. Copia solo el artefacto.
- **Olvidar `CGO_ENABLED=0` (Go) o el flag de binario estático**: el binario depende de libs que no están en Alpine y falla con `not found`. Compila estático o usa una base con esas libs.
- **`--target` y esperar la imagen final**: `--target build` para en esa etapa; no incluye lo de la etapa de runtime.

> Idea clave: separa "compilar" de "ejecutar" en etapas. Instala el toolchain en la etapa de build y copia con `COPY --from` solo el artefacto a una base mínima. Resultado: imágenes pequeñas, rápidas de desplegar y más seguras.
