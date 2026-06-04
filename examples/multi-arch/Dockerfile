# syntax=docker/dockerfile:1
FROM alpine:3.20

# ARGs automáticos que buildx rellena según la plataforma destino.
# Hay que declararlos para poder usarlos.
ARG TARGETPLATFORM
ARG TARGETARCH
ARG TARGETOS
ARG BUILDPLATFORM

# Mensaje en tiempo de build (visible en los logs de cada plataforma)
RUN echo "Construyendo en ${BUILDPLATFORM} para ${TARGETPLATFORM}"

# Pasamos los valores a variables de entorno para verlos en runtime
ENV TARGETPLATFORM=${TARGETPLATFORM} \
    TARGETARCH=${TARGETARCH} \
    TARGETOS=${TARGETOS}

# Al ejecutar, imprime la arquitectura objetivo y la real del contenedor
CMD ["sh", "-c", "echo \"TARGETPLATFORM=${TARGETPLATFORM} | TARGETOS=${TARGETOS} | TARGETARCH=${TARGETARCH}\" && echo \"uname -m: $(uname -m)\""]
