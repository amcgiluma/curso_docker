---
title: "Profiles, multiples ficheros y override"
slug: "profiles-override"
order: 4
summary: "profiles, varios -f, override automático, extends y separar dev de prod."
---

# Profiles, multiples ficheros y override

Una misma aplicación suele necesitar configuraciones distintas para desarrollo y producción. Compose ofrece tres mecanismos para ello: **profiles** (activar servicios opcionales), **multiples ficheros** combinados con `-f`, y `extends` para reútilizar definiciónes.

## Teoría

**Profiles**: marcas un servicio con `profiles: [debug]` y solo se levanta si activas ese perfil (`--profile debug` o variable `COMPOSE_PROFILES`). Útil para herramientas opcionales (un Adminer, un debugger) que no quieres en el `up` normal.

**Multiples ficheros (`-f`)**: Compose puede fusionar varios YAML. Las claves del fichero posterior **sobrescriben o se añaden** a las del anterior. Esto permite tener una base común y capas por entorno.

**Override automático**: si existen `compose.yaml` y `compose.override.yaml`, Compose carga ambos por defecto (sin `-f`). Patron tipico: base en `compose.yaml`, ajustes de desarrollo en `compose.override.yaml`.

**`extends`**: un servicio puede heredar la definición de otro (en el mismo o en otro fichero) y luego ajustar lo que cambie.

> Reglas de fusion: las **listas** (como `ports` o `volumes`) se concatenan; los **mapas** (como `environment`) se combinan clave a clave; los **escalares** (como `image`) los reemplaza el último fichero.

## Manos a la obra

Base `compose.yaml` con un servicio opcional bajo profile:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
  adminer:
    image: adminer
    ports:
      - "8081:8080"
    profiles:
      - tools
```

Por defecto `adminer` NO arranca; con el perfil `tools` si:

```compare
# CMD
docker compose up -d
docker compose ps --services
# OUT
web
```

```compare
# CMD
docker compose --profile tools up -d
docker compose ps --services
# OUT
adminer
web
```

Combina base + override de producción con `-f`:

```yaml
# compose.prod.yaml
services:
  web:
    image: nginx:1.27-alpine
    restart: always
    ports: []
    environment:
      ENV: production
```

```compare
# CMD
docker compose -f compose.yaml -f compose.prod.yaml config | grep -E "image:|ENV:|restart:"
# OUT
    image: nginx:1.27-alpine
    restart: always
      ENV: production
```

## Flags y variantes

| Mecanismo / flag | Qué hace |
| --- | --- |
| `profiles: [nombre]` | Marca un servicio como opcional bajo ese perfil |
| `--profile <nombre>` | Activa un perfil al ejecutar |
| `COMPOSE_PROFILES=a,b` | Activa perfiles via variable de entorno |
| `-f a.yaml -f b.yaml` | Fusiona ficheros (el último gana en escalares) |
| `compose.override.yaml` | Se carga automáticamente junto a `compose.yaml` |
| `COMPOSE_FILE=a.yaml:b.yaml` | Define la lista de ficheros via variable |
| `extends.file` / `extends.service` | Hereda la definición de otro servicio |
| `docker compose config` | Muestra el resultado final ya fusionado |

### Ejemplo de `extends`

```yaml
# common.yaml
services:
  base-app:
    image: miapp:latest
    environment:
      LOG_LEVEL: info
```

```yaml
# compose.yaml
services:
  app:
    extends:
      file: common.yaml
      service: base-app
    ports:
      - "3000:3000"
```

## Pruébalo tú

1. Crea el `compose.yaml` con `web` y `adminer` (este último con `profiles: [tools]`).
2. Ejecuta `docker compose up -d` y comprueba con `docker compose ps --services` que solo está `web`.
3. Ahora `docker compose --profile tools up -d`: ya aparece `adminer`.
4. Crea `compose.prod.yaml` que cambie `image` y anada `restart: always`, y ejecuta `docker compose -f compose.yaml -f compose.prod.yaml config` para ver la fusion.
5. Renombra `compose.prod.yaml` a `compose.override.yaml` y observa que `docker compose config` (sin `-f`) ya lo aplica automáticamente.

## Errores comunes

- **Un servicio "opcional" arranca siempre**: olvidaste el `profiles:` o lo activaste con `--profile`. Sin perfil activo, los servicios con profile no se levantan.
- **El override no se aplica**: el orden de `-f` importa; el último fichero gana. Revisa el resultado con `docker compose config`.
- **Listas que se duplican**: al fusionar, `ports`/`volumes` se concatenan. Si quieres reemplazar puertos, pon `ports: []` en el override para vacíarlos antes (como en el ejemplo).
- **`extends` con `depends_on`**: `extends` no copia `depends_on`, `volumes_from` ni `links`; defínelos en el servicio final.

> Idea clave: usa `profiles` para servicios opcionales, varios `-f` (o `compose.override.yaml`) para capas por entorno y `extends` para reútilizar; valida siempre la fusion con `docker compose config`.
