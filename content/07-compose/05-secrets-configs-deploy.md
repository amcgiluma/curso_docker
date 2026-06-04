---
title: "Secrets, configs y deploy"
slug: "secrets-configs-deploy"
order: 5
summary: "secrets y configs como ficheros, y deploy con réplicas, resources y scale."
---

# Secrets, configs y deploy

Compose puede inyectar **secretos** y **ficheros de configuración** sin meterlos en variables de entorno ni en la imagen, y declarar parámetros de despliegue (`deploy`) como réplicas y límites de recursos.

## Teoría

**`secrets`**: monta datos sensibles (contraseñas, tokens) como ficheros en `/run/secrets/<nombre>` dentro del contenedor. Es más seguro que `environment` porque las variables de entorno se filtran fácilmente (en `docker inspect`, logs, `/proc`). Muchas imágenes oficiales aceptan la variante `_FILE` (p. ej. `POSTGRES_PASSWORD_FILE`) para leer el secreto desde fichero.

**`configs`**: igual que secrets pero para configuración no sensible (un `nginx.conf`, un `.json`). Se monta como fichero dentro del contenedor.

**`deploy`**: agrupa parámetros de despliegue. En Swarm controla `replicas`, `resources`, `restart_policy`, etc. Con `docker compose` en un solo host, Compose respeta `deploy.resources.limits` (CPU/memoria) y `deploy.replicas`; otras claves de `deploy` son especificas de Swarm.

**`scale`**: escala un servicio a N réplicas en caliente, sin editar el fichero.

> En un host normal con `docker compose`, los límites de `deploy.resources.limits` se aplican; pero la replicación con balanceo real (VIP) y `restart_policy` avanzada son de Swarm. Para un solo host, `--scale` y los límites cubren la mayoría de casos.

## Manos a la obra

Un `compose.yaml` con un secreto de fichero y límites de recursos:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
        reservations:
          cpus: "0.25"
          memory: 128M

secrets:
  db_password:
    file: ./db_password.txt
```

Crea el fichero del secreto y levanta; comprueba que el secreto está como fichero, no como env:

```compare
# CMD
echo "S3cr3to!" > db_password.txt
docker compose up -d
docker compose exec db cat /run/secrets/db_password
# OUT
S3cr3to!
```

Verifica el límite de memoria aplicado:

```compare
# CMD
docker inspect -f '{{.HostConfig.Memory}}' $(docker compose ps -q db)
# OUT
268435456
```

Escala un servicio web a 3 réplicas en caliente:

```compare
# CMD
docker compose up -d --scale web=3
docker compose ps --services | sort
# OUT
db
web
```

```compare
# CMD
docker compose ps web
# OUT
NAME              IMAGE          SERVICE   STATUS         PORTS
proyecto-web-1    nginx:alpine   web       Up 3 seconds   80/tcp
proyecto-web-2    nginx:alpine   web       Up 3 seconds   80/tcp
proyecto-web-3    nginx:alpine   web       Up 3 seconds   80/tcp
```

## Flags y variantes

| Clave / flag | Qué hace |
| --- | --- |
| `secrets:` (top-level) `file: ./x` | Define un secreto desde un fichero del host |
| `secrets:` (top-level) `environment: VAR` | Define un secreto desde una variable (Compose v2) |
| `secrets: [db_password]` (servicio) | Monta el secreto en `/run/secrets/<nombre>` |
| `configs:` (top-level) `file: ./conf` | Define un fichero de configuración |
| `configs:` (servicio) con `target:` | Monta la config en una ruta concreta |
| `deploy.replicas: N` | Número de réplicas del servicio |
| `deploy.resources.limits.cpus/memory` | Limite duro de CPU/memoria |
| `deploy.resources.reservations` | Recursos reservados (garantizados) |
| `--scale <svc>=N` | Escala a N réplicas en caliente |
| `VARIABLE_FILE` (en imágenes oficiales) | Lee el valor desde un fichero (patrón `_FILE`) |

## Pruébalo tú

1. Crea `db_password.txt` con una contraseña y un `compose.yaml` con el `secrets` del ejemplo.
2. Ejecuta `docker compose up -d` y comprueba el secreto con `docker compose exec db cat /run/secrets/db_password`.
3. Verifica que NO está como variable: `docker compose exec db printenv | grep POSTGRES_PASSWORD` solo debe mostrar `POSTGRES_PASSWORD_FILE`, no la contraseña.
4. Añade un servicio `web: image: nginx:alpine` (sin `ports`, para poder replicar) y escala con `docker compose up -d --scale web=3`.
5. Comprueba el límite de memoria con `docker inspect -f '{{.HostConfig.Memory}}' $(docker compose ps -q db)`.

## Errores comunes

- **`secret "db_password" not found`**: el fichero indicado en `secrets.<nombre>.file` no existe o la ruta es incorrecta. Crealo antes del `up`.
- **No puedo escalar porque el puerto choca**: si el servicio publica un puerto fijo (`8080:80`), no puede tener varias réplicas en el mismo host. Quita el `ports` fijo o usa un rango.
- **`deploy.replicas` ignorado**: fuera de Swarm, `docker compose up` no replica solo con `deploy.replicas`; usa `--scale`. Sí se respetan los `limits`.
- **Meter el secreto en `environment`**: derrota el propósito; usa el patrón `_FILE` con `secrets` para que no aparezca en `docker inspect`.

> Idea clave: inyecta datos sensibles con `secrets` (montados como fichero en `/run/secrets`) y configuración con `configs`; usa `deploy.resources.limits` para acotar CPU/memoria y `--scale` para replicar en un solo host.
