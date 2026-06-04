---
title: "Publicar en Docker Hub: tag, push y pull"
slug: "push-pull-tag"
order: 1
summary: "docker login, tag, push y pull para distribuir tus imágenes en Docker Hub."
---

# Publicar en Docker Hub: tag, push y pull

Una imagen solo te sirve a ti hasta que la **publicas** en un registro. En esta lección subes una imagen propia a Docker Hub y la vuelves a descargar, entendiendo cómo se forma el nombre completo de cada imagen.

## Teoría

Un **registro** (registry) es un servidor que almacena y distribuye imágenes. Docker Hub es el registro por defecto, pero hay muchos otros (GHCR, GitLab, ECR, registros privados...).

El nombre completo de una imagen tiene esta forma:

```output
[registro/]usuario/repositorio:tag
```

Si omites partes, Docker rellena los huecos:

| Lo que escribes | Cómo lo interpreta Docker |
| --- | --- |
| `nginx` | `docker.io/library/nginx:latest` |
| `nginx:1.27` | `docker.io/library/nginx:1.27` |
| `juanm/api:2.0` | `docker.io/juanm/api:2.0` |
| `ghcr.io/juanm/api:2.0` | registro `ghcr.io`, sin valor por defecto |

Puntos importantes:

- El `tag` por defecto es `latest`, pero **`latest` no significa "la más reciente"**: es solo el tag que se usa cuando no especificas ninguno. Versiona siempre con tags explícitos (`1.2.0`, `1.2`, `sha-<commit>`).
- Para subir a `docker.io/<usuario>/...` necesitas que el repositorio empiece por tu **usuario** de Docker Hub.
- `push` y `pull` suben/bajan solo las **capas** que faltan, no la imagen entera cada vez.

> Nota: una imagen puede tener varios tags apuntando al mismo ID (mismo `IMAGE ID`). Un tag es solo una etiqueta legible sobre un digest.

## Manos a la obra

Primero autenticate. `docker login` sin argumentos apunta a Docker Hub:

```compare
# CMD
docker login
# OUT
Username: <tu-usuario>
Password:
Login Succeeded
```

Construye una imagen local sencilla y etiquetala con tu usuario:

```compare
# CMD
docker build -t hola-api:1.0 .
docker tag hola-api:1.0 <tu-usuario>/hola-api:1.0
docker images <tu-usuario>/hola-api
# OUT
REPOSITORY              TAG   IMAGE ID       CREATED         SIZE
<tu-usuario>/hola-api   1.0   3f1a9c2b7d10   5 seconds ago   142MB
```

`docker tag` no copia nada: crea un segundo nombre que apunta al mismo `IMAGE ID`. Ahora subela:

```compare
# CMD
docker push <tu-usuario>/hola-api:1.0
# OUT
The push refers to repository [docker.io/<tu-usuario>/hola-api]
5f70bf18a086: Pushed
a1b2c3d4e5f6: Pushed
1.0: digest: sha256:<digest> size: 1786
```

Comprueba que se descarga desde cero borrando la copia local y haciendo `pull`:

```compare
# CMD
docker rmi <tu-usuario>/hola-api:1.0
docker pull <tu-usuario>/hola-api:1.0
# OUT
1.0: Pulling from <tu-usuario>/hola-api
Digest: sha256:<digest>
Status: Downloaded newer image for <tu-usuario>/hola-api:1.0
docker.io/<tu-usuario>/hola-api:1.0
```

## Flags y variantes

| Comando / flag | Para qué sirve |
| --- | --- |
| `docker login` | Autentica contra Docker Hub (registro por defecto) |
| `docker login ghcr.io` | Autentica contra otro registro |
| `docker login -u <usuario> --password-stdin` | Pasa la contraseña por stdin (mejor para scripts/CI) |
| `docker tag <origen> <destino>` | Crea un nombre/tag nuevo apuntando a la misma imagen |
| `docker push <imagen>:<tag>` | Sube la imagen al registro |
| `docker push --all-tags <repo>` | Sube todos los tags del repositorio |
| `docker pull <imagen>:<tag>` | Descarga la imagen del registro |
| `docker pull <imagen>@sha256:<digest>` | Descarga por digest exacto (inmutable) |
| `docker logout [registro]` | Cierra sesion y borra las credenciales guardadas |

> Nota: las credenciales se guardan en `~/.docker/config.json`. En producción conviene usar un *credential helper* en vez de dejar la contraseña en texto plano.

## Pruébalo tú

1. Crea una cuenta en [hub.docker.com](https://hub.docker.com) si no la tienes y ejecuta `docker login`.
2. Construye cualquier imagen local, por ejemplo `docker build -t demo:1.0 .` (o reusa una existente).
3. Etiquetala con tu usuario: `docker tag demo:1.0 <tu-usuario>/demo:1.0`.
4. Subela con `docker push <tu-usuario>/demo:1.0` y mira el repositorio en la web de Docker Hub.
5. Borra la imagen local (`docker rmi <tu-usuario>/demo:1.0`) y recuperala con `docker pull`.
6. Reto: añade también el tag `latest` (`docker tag <tu-usuario>/demo:1.0 <tu-usuario>/demo:latest`) y sube ambos con `docker push --all-tags <tu-usuario>/demo`.

## Errores comunes

- **`denied: requested access to the resource is denied`**: el repositorio no empieza por tu usuario o no has hecho `docker login`. El nombre debe ser `<tu-usuario>/imagen`.
- **`unauthorized: incorrect username or password`**: credenciales mal o token caducado. Vuelve a hacer `docker login`. En Docker Hub conviene usar un *Access Token* en vez de la contraseña.
- **Subir todo como `latest`**: dificulta los rollbacks. Usa tags de versión y trata `latest` como un alias móvil, nunca como tu única referencia.
- **`push` muy lento siempre**: si reconstruyes cambiando capas tempranas, invalidas la cache y subes capas grandes cada vez. Ordena el Dockerfile para que lo que cambia poco quede abajo.

> Idea clave: una imagen se identifica por `[registro/]usuario/repositorio:tag`. `tag` crea nombres sin copiar datos, y `push`/`pull` mueven solo las capas que faltan contra el registro (Docker Hub por defecto).
