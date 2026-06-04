---
title: "Ejecutar como usuario no root"
slug: "usuario-no-root"
order: 1
summary: "USER, UID/GID propios y por qué no conviene correr contenedores como root."
---

# Ejecutar como usuario no root

Por defecto, los contenedores corren como **root** (UID 0). Si un atacante escapa del proceso, hereda privilegios de root, y si además escapa del contenedor, puede ser root en el host. La primera regla de hardening es no correr como root.

## Teoría

El usuario del contenedor se mapea al kernel del host (salvo que uses *user namespaces*). Un proceso root dentro del contenedor es, en muchos aspectos, root respecto a los recursos montados (por ejemplo, ficheros de un bind mount).

Para evitarlo:

- Crea un **usuario y grupo dedicados** con UID/GID fijos (p. ej. `10001`), no el root por defecto.
- Cambia a ese usuario con la instruccion **`USER`** antes del `CMD`.
- Asegura que el usuario tenga permisos sobre lo que necesita (usa `COPY --chown`).

Por qué un UID **fijo y alto** (no solo "appuser"): el nombre es cosmetico; lo que importa es el número. Un UID fijo fácilita asignar permisos en volumes y evita colisiones con usuarios del host.

> En Alpine se usa `adduser`/`addgroup`; en Debian/Ubuntu, `useradd`/`groupadd`. El efecto es el mismo: crear un usuario sin privilegios.

## Manos a la obra

Dockerfile que crea un usuario no root y arranca con el:

```dockerfile
FROM alpine:3.20
RUN addgroup -g 10001 -S appgroup \
 && adduser -u 10001 -S appuser -G appgroup
WORKDIR /app
COPY --chown=appuser:appgroup . .
USER appuser
CMD ["id"]
```

Construye y ejecuta: el proceso ya NO es root:

```compare
# CMD
docker build -t demo-nonroot .
docker run --rm demo-nonroot
# OUT
uid=10001(appuser) gid=10001(appgroup) groups=10001(appgroup)
```

Compara con una imagen sin `USER` (corre como root, uid=0):

```compare
# CMD
docker run --rm alpine:3.20 id
# OUT
uid=0(root) gid=0(root) groups=0(root),...
```

También puedes forzar el usuario en tiempo de ejecución sin tocar la imagen:

```compare
# CMD
docker run --rm --user 10001:10001 alpine:3.20 id
# OUT
uid=10001 gid=10001 groups=10001
```

## Flags y variantes

| Elemento | Qué hace |
| --- | --- |
| `USER <usuario>` | Cambia el usuario para las siguientes instrucciones y el `CMD` |
| `USER <uid>:<gid>` | Usa UID/GID numericos (recomendado, no depende de /etc/passwd) |
| `RUN adduser -S -u 10001 ...` | (Alpine) crea usuario de sistema sin contraseña |
| `RUN useradd -u 10001 -r ...` | (Debian/Ubuntu) crea usuario de sistema |
| `COPY --chown=user:group` | Copia ficheros con el propietario adecuado |
| `--user 10001:10001` (run) | Fuerza el usuario al ejecutar, sin cambiar la imagen |
| `--user $(id -u):$(id -g)` | Usa tu UID/GID del host (útil con bind mounts) |

## Pruébalo tú

1. Crea el `Dockerfile` del ejemplo en una carpeta vacía (añade un fichero cualquiera para el `COPY`).
2. Construye: `docker build -t demo-nonroot .`.
3. Ejecuta `docker run --rm demo-nonroot`: debe mostrar `uid=10001`.
4. Comprueba el contraste con `docker run --rm alpine:3.20 id` (uid=0).
5. Prueba la sobrescritura en runtime: `docker run --rm --user 10001:10001 alpine:3.20 id`.

## Errores comunes

- **`Permission denied` al escribir tras poner `USER`**: el usuario no root no tiene permisos sobre el directorio. Usa `COPY --chown` o ajusta permisos con `RUN chown` antes del `USER`.
- **No puede escuchar en puertos < 1024**: como no root, no puedes bindear puertos privilegiados dentro del contenedor. Usa un puerto alto (p. ej. 8080) y publícalo con `-p 80:8080`.
- **El `USER` no aplica a `RUN` posteriores que necesitan root**: coloca las instrucciones que requieren root (instalar paquetes) **antes** del `USER`.
- **Volumes con propietario root**: si montas un volume nuevo, su contenido puede pertenecer a root; ajusta permisos o usa `--user` coherente con el del host.

> Idea clave: no corras como root; crea un usuario con UID/GID fijo y alto, cambia a el con `USER` y usa `COPY --chown`; en runtime puedes forzarlo con `--user`.
