# Go multi-stage

Aplicación Go mínima para prácticar builds multi-stage, elección de imagen base y builds multi-arquitectura.

## Qué demuestra

- Separar compilación y runtime con `COPY --from`.
- Construir solo la etapa de build con `--target`.
- Comparar una imagen final con Alpine frente a una imagen final con `scratch`.
- Ejecutar un binario Go estático sin instalar Go en la imagen runtime.

## Build con Alpine

```bash
docker build -t curso/go-multi-stage:alpine .
docker run --rm curso/go-multi-stage:alpine
```

Salida esperada:

```text
hola desde Go en Docker
arch=amd64 os=linux
```

La arquitectura puede variar según tu máquina.

## Inspeccionar la etapa de build

```bash
docker build --target build -t curso/go-multi-stage:builder .
docker run --rm curso/go-multi-stage:builder ls -lh /bin/app
```

## Build con scratch

```bash
docker build -f Dockerfile.scratch -t curso/go-multi-stage:scratch .
docker run --rm curso/go-multi-stage:scratch
```

## Probar como servidor HTTP

```bash
docker run --rm -p 8080:8080 curso/go-multi-stage:alpine serve
curl http://localhost:8080/health
```
