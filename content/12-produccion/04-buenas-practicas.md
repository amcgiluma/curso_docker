---
title: "Buenas practicas y 12-factor en contenedores"
slug: "buenas-practicas"
order: 4
summary: "Checklist de buenas practicas e ideas 12-factor aplicadas a Docker."
---

# Buenas practicas y 12-factor en contenedores

Antes de llevar una imagen a produccion conviene pasar un checklist. Aqui reunimos las buenas practicas del curso y como encajan con la metodologia **12-factor**, que encaja casi de forma natural con los contenedores.

## Teoria

La metodologia [12-factor](https://12factor.net) describe como construir apps portables y escalables. Estas son las ideas que mas impactan al contenerizar:

| Factor 12-factor | Como se aplica en Docker |
| --- | --- |
| III. Config | Configuracion via **variables de entorno**, no ficheros hardcodeados |
| VI. Procesos | El contenedor es **sin estado**; los datos van a volumenes/servicios externos |
| VII. Port binding | La app **expone un puerto** y se basta a si misma (no depende de un servidor externo) |
| IX. Desechabilidad | Arranque rapido y **apagado limpio** ante SIGTERM (ver leccion de PID 1) |
| XI. Logs | Tratar los logs como un **flujo a stdout/stderr**, no escribir ficheros |
| X. Paridad dev/prod | La **misma imagen** en dev y prod, cambiando solo configuracion |

Buenas practicas concretas de imagen y ejecucion:

- **Imagen pequena y multi-stage**: separa build de runtime; copia solo artefactos.
- **Usuario sin privilegios**: `USER` no-root con UID/GID propios.
- **Tags inmutables**: fija versiones (`python:3.13-slim`), evita depender de `latest`.
- **`.dockerignore`**: reduce el contexto de build y evita filtrar secretos.
- **Sin secretos en la imagen**: nada de claves en `ENV` ni en capas; usa secrets/variables en runtime.
- **Healthcheck y restart policy**: para que el orquestador sepa el estado y reaccione.
- **Limites de recursos**: `cpus`/`memory` para evitar que un contenedor ahogue al host.

> Nota: una buena senal de salud es que puedas borrar y recrear cualquier contenedor sin perder datos ni configuracion. Si no puedes, te falta externalizar estado o config.

## Manos a la obra

Verifica que tu contenedor **no** corre como root (mala senal si ves `uid=0`):

```compare
# CMD
docker run --rm curso-docker/backend:latest id
# OUT
uid=1001(appuser) gid=1001(appgroup) groups=1001(appgroup)
```

Revisa el tamano y la historia de capas para detectar grasa (build tools que no deberian estar en runtime):

```compare
# CMD
docker images curso-docker/backend:latest
docker history --no-trunc curso-docker/backend:latest | head -4
# OUT
REPOSITORY                    TAG      IMAGE ID       SIZE
curso-docker/backend          latest   a1b2c3d4e5f6   168MB
IMAGE          CREATED         CREATED BY                                      SIZE
a1b2c3d4e5f6   2 minutes ago   CMD ["uvicorn" "app.main:app" ...]              0B
...
```

Pasa una config distinta sin tocar la imagen (paridad dev/prod via entorno):

```compare
# CMD
docker run --rm -e CORS_ORIGINS=http://localhost:8080 curso-docker/backend:latest \
  python -c "import os; print(os.environ['CORS_ORIGINS'])"
# OUT
http://localhost:8080
```

Escanea vulnerabilidades antes de publicar (si tienes Docker Scout):

```compare
# CMD
docker scout quickview curso-docker/backend:latest
# OUT
Target     curso-docker/backend:latest
  0C  1H  3M  8L
# (criticas/altas/medias/bajas; varia segun la imagen base)
```

## Flags y variantes

| Practica | Como se materializa |
| --- | --- |
| Usuario no-root | `RUN useradd ... && USER 1001` en el Dockerfile |
| Imagen minima | Bases `-slim`/`-alpine`/distroless + multi-stage |
| Config por entorno | `-e VAR=valor`, `env_file`, o `environment:` en Compose |
| Sin secretos en capas | Docker/Compose `secrets`, o variables en runtime |
| Reducir contexto | `.dockerignore` con `node_modules`, `.git`, `__pycache__`... |
| Limites de recursos | `--memory`, `--cpus` o `deploy.resources.limits` |
| Solo lectura | `--read-only` + `tmpfs` para directorios escribibles |
| Salud y resiliencia | `HEALTHCHECK` + `--restart unless-stopped` |
| Auditar imagen | `docker history`, `docker scout`, `docker image inspect` |

Ejemplo de `.dockerignore` tipico:

```output
.git
node_modules
__pycache__
*.pyc
.env
dist
.venv
```

## Pruebalo tu

1. Comprueba el usuario de tus imagenes: `docker run --rm <imagen> id`. Si ves `uid=0`, anade un `USER` no-root.
2. Mira el tamano con `docker images` y la historia con `docker history <imagen>`; busca capas con build tools que sobren en runtime.
3. Lanza la misma imagen con dos configuraciones distintas via `-e` y confirma que no necesitas reconstruir.
4. Crea un `.dockerignore` y reconstruye; compara el "Sending build context" antes y despues.
5. Arranca con limites: `docker run --memory=128m --cpus=0.5 <imagen>` y observalo con `docker stats`.
6. Reto: ejecuta la imagen con `--read-only` y un `--tmpfs /tmp`, y comprueba que la app sigue funcionando (o descubre que escribe donde no debe).

## Errores comunes

- **App que corre como root "porque funciona"**: aumenta el impacto de cualquier vulnerabilidad. Crea un usuario sin privilegios.
- **Secretos en `ENV`/Dockerfile**: quedan en las capas y se ven con `docker history`. Pasalos en runtime o via secrets.
- **Imagen distinta en dev y prod**: rompe la paridad y aparecen bugs "solo en produccion". Usa la misma imagen y cambia solo la config.
- **Estado dentro del contenedor**: si guardas datos en la capa de escritura, los pierdes al recrear. Usa volumenes o servicios externos.
- **Sin limites de recursos**: un contenedor con fuga de memoria puede tumbar el host. Define `memory`/`cpus`.

> Idea clave: una imagen lista para produccion es pequena, sin secretos, corre como usuario no-root, externaliza estado y config (12-factor), loggea a stdout y trae healthcheck, restart policy y limites de recursos. Si puedes borrar y recrear cualquier contenedor sin miedo, vas por buen camino.
