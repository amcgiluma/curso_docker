# syntax=docker/dockerfile:1

FROM alpine:3.20
ARG TARGETPLATFORM
ARG BUILDPLATFORM
RUN echo "Construyendo app en ${BUILDPLATFORM} para ${TARGETPLATFORM}"
CMD ["sh", "-c", "echo app lista en $(uname -m)"]
