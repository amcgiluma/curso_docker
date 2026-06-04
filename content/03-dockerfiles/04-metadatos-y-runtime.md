---
title: "Metadatos y runtime: EXPOSE, VOLUME, USER, LABEL, HEALTHCHECK y mas"
slug: "metadatos-y-runtime"
order: 4
summary: "Instrucciones que documentan y configuran el comportamiento en ejecución."
---

# Metadatos y runtime: EXPOSE, VOLUME, USER, LABEL, HEALTHCHECK y mas

Más alla de construir, hay instrucciones que **documentan** la imagen y **configuran** cómo se comporta al ejecutarse: qué puertos usa, con qué usuario corre, cómo sabe Docker si está sana, etc.

## Teoría

| Instruccion | Qué hace | Matiz importante |
| --- | --- | --- |
| `EXPOSE` | Documenta los puertos qué escucha | **No** publica nada; sigues necesitando `-p` |
| `VOLUME` | Declara un punto de montaje persistente | Crea un volumen anónimo si no montas uno tu |
| `USER` | Usuario/UID con el que corren las instrucciones siguientes y el contenedor | Clave para no correr como root |
| `LABEL` | Metadatos clave=valor (autor, versión, fuente) | Se consultan con `inspect` |
| `HEALTHCHECK` | Comando que decide si el contenedor está `healthy` | Aparece en `docker ps` |
| `STOPSIGNAL` | Señal usada al parar (por defecto SIGTERM) | Útil si tu app espera otra |
| `SHELL` | Cambia la shell de la forma shell de `RUN`/`CMD` | Ej. usar PowerShell en Windows |
| `ONBUILD` | Instruccion diferida que se ejecuta al usar esta imagen como base | Para imágenes "plantilla" |

> Seguridad: declarar `USER` con un UID no root es de lo más efectivo que puedes hacer. Crea el usuario antes (`adduser`/`useradd`) y dale propiedad de las carpetas que necesite.

## Manos a la obra

Un Dockerfile que junta varias de estas instrucciones:

```dockerfile
FROM nginx:alpine
LABEL org.opencontainers.image.authors="equipo@ejemplo.com" \
      org.opencontainers.image.version="1.0"
RUN addgroup -g 1001 -S web && adduser -S web -u 1001 -G web
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
STOPSIGNAL SIGQUIT
```

Construye y arranca; mira cómo aparece el estado de salud en `docker ps`:

```compare
# CMD
docker build -t healthy .
docker run -d --name web -p 8080:80 healthy
docker ps --format "{{.Names}}\t{{.Status}}"
# OUT
[+] Building 3.1s ... 
<container-id>
web   Up 8 seconds (health: starting)
```

Tras pasar el intervalo, el estado cambia a `healthy`:

```compare
# CMD
docker ps --format "{{.Names}}\t{{.Status}}"
# OUT
web   Up 40 seconds (healthy)
```

Consulta los LABEL con inspect:

```compare
# CMD
docker inspect --format '{{json .Config.Labels}}' healthy
# OUT
{"org.opencontainers.image.authors":"equipo@ejemplo.com","org.opencontainers.image.version":"1.0"}
```

Comprueba que el contenedor puede correr como usuario no root:

```compare
# CMD
docker run --rm --user 1001 healthy id
# OUT
uid=1001 gid=1001 groups=1001
```

## Flags y variantes

| Instruccion | Forma / opción | Nota |
| --- | --- | --- |
| `EXPOSE` | `EXPOSE 80 443` | Varios puertos; solo documenta |
| `EXPOSE` | `EXPOSE 53/udp` | Puedes indicar el protocolo |
| `VOLUME` | `VOLUME ["/data"]` | Punto de montaje persistente |
| `USER` | `USER 1001:1001` o `USER web` | UID:GID o nombre |
| `LABEL` | claves `org.opencontainers.image.*` | Estandar OCI recomendado |
| `HEALTHCHECK` | `--interval`, `--timeout`, `--retries`, `--start-period` | Ajusta el sondeo |
| `HEALTHCHECK` | `HEALTHCHECK NONE` | Desactiva el de la imagen base |
| `STOPSIGNAL` | `STOPSIGNAL SIGQUIT` | Señal de parada (nginx prefiere SIGQUIT) |
| `SHELL` | `SHELL ["powershell","-Command"]` | Cambia la shell por defecto |
| `ONBUILD` | `ONBUILD COPY . /app` | Se dispara al usar la imagen como base |

## Pruébalo tú

1. Construye la imagen `healthy` del ejemplo y arrancala publicando el puerto 80.
2. Observa con `docker ps` cómo pasa de `health: starting` a `healthy`.
3. Rompe el healthcheck (apaga nginx con `docker exec web nginx -s stop`) y mira cómo pasa a `unhealthy`.
4. Consulta los LABEL con `docker inspect --format '{{json .Config.Labels}}' healthy`.
5. Ejecuta `docker run --rm --user 1001 healthy id` y confirma que no es root.

## Errores comunes

- **`EXPOSE` no publica el puerto**: sigue siendo necesario `-p 8080:80`. `EXPOSE` es solo documentación/metadato.
- **`VOLUME` crea volúmenes anónimos "fantasma"**: si declaras `VOLUME /data` y no montas uno con nombre, cada `run` crea un volumen anónimo que se acumula. Monta uno explicito o limpia con `docker volume prune`.
- **HEALTHCHECK que da falsos negativos**: `--timeout` demasiado corto o falta `--start-period` para apps que tardan en arrancar. Ajusta los tiempos.
- **Poner `USER` y luego fallar al escribir**: el usuario no tiene permisos sobre las carpetas. Haz `chown` o crea las rutas antes del `USER`.
- **Healthcheck con `curl` en imagen sin curl**: usa una herramienta que exista en la imagen (`wget` en Alpine, por ejemplo).

> Idea clave: estas instrucciones documentan y endurecen la imagen. `EXPOSE` y `LABEL` informan; `USER` y `HEALTHCHECK` cambian el comportamiento real (seguridad y salud). Recuerda: `EXPOSE` no abre puertos, eso lo hace `-p`.
