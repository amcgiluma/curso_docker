---
title: "Redes, volumenes y variables de entorno"
slug: "redes-volumenes-env"
order: 3
summary: "networks, volumes, environment, env_file y la interpolacion de variables."
---

# Redes, volumenes y variables de entorno

Compose conecta los servicios con redes, les da almacenamiento con volumes y los configura con variables de entorno. Tambien interpola variables del shell o de un fichero `.env` dentro del propio YAML.

## Teoria

**Redes**: Compose crea una red `default` por proyecto y conecta todos los servicios; por eso se ven por nombre. Puedes declarar redes adicionales en `networks:` para segmentar (p. ej. `frontend` y `backend`).

**Volumes**: declara volumes nombrados en el bloque `volumes:` de nivel superior y montalos en cada servicio. Tambien puedes usar bind mounts con rutas relativas al fichero.

**Variables de entorno**, dos planos distintos:

1. **Dentro de los contenedores**: `environment` (lista o mapa) y `env_file` (carga variables desde un fichero). Estas variables las ve el proceso de la app.
2. **Interpolacion en el YAML**: `${VARIABLE}` se sustituye al leer el fichero, usando variables del shell o del `.env` situado junto al `compose.yaml`. Sirve para parametrizar imagenes, puertos, etc.

> No confundas los dos planos: el `.env` junto al `compose.yaml` alimenta la **interpolacion** del YAML; `env_file:` dentro de un servicio inyecta variables **al contenedor**. Pueden apuntar a ficheros distintos.

## Manos a la obra

Un `compose.yaml` con dos redes, un volume y variables interpoladas:

```yaml
services:
  web:
    image: nginx:${NGINX_TAG:-alpine}
    ports:
      - "${WEB_PORT:-8080}:80"
    networks:
      - frontend
  db:
    image: postgres:16-alpine
    env_file:
      - db.env
    environment:
      POSTGRES_DB: ${DB_NAME:-app}
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true

volumes:
  db-data:
```

Con un `.env` junto al fichero:

```yaml
# .env (mismo directorio que compose.yaml)
NGINX_TAG: alpine
WEB_PORT: "9090"
DB_NAME: tienda
```

Comprueba como queda la interpolacion con `config`:

```compare
# CMD
docker compose config | grep -E "image:|published:"
# OUT
    image: nginx:alpine
        published: "9090"
    image: postgres:16-alpine
```

Verifica las variables dentro del contenedor:

```compare
# CMD
docker compose up -d
docker compose exec db printenv POSTGRES_DB
# OUT
tienda
```

## Flags y variantes

| Clave / sintaxis | Que hace |
| --- | --- |
| `networks:` (top-level) | Declara redes del proyecto |
| `networks: [frontend, backend]` (servicio) | Conecta el servicio a esas redes |
| `internal: true` | Red sin salida a Internet |
| `volumes:` (top-level) | Declara volumes nombrados |
| `- db-data:/ruta` | Monta un volume nombrado en el servicio |
| `- ./local:/ruta` | Bind mount con ruta relativa al `compose.yaml` |
| `environment: KEY: valor` | Variable inyectada al contenedor (mapa) |
| `environment: - KEY=valor` | Igual, en forma de lista |
| `env_file: [archivo.env]` | Carga variables al contenedor desde ficheros |
| `${VAR}` | Interpolacion; falla si `VAR` no esta definida |
| `${VAR:-defecto}` | Usa `defecto` si `VAR` esta vacia o sin definir |
| `${VAR:?mensaje}` | Error con `mensaje` si `VAR` falta |

## Pruebalo tu

1. Crea `compose.yaml` con el servicio `web` usando `image: nginx:${NGINX_TAG:-alpine}` y `ports: ["${WEB_PORT:-8080}:80"]`.
2. Crea un `.env` con `WEB_PORT=9090` y ejecuta `docker compose config`: veras `9090` interpolado.
3. Arranca con `docker compose up -d` y entra a `http://localhost:9090`.
4. Crea `db.env` con `POSTGRES_PASSWORD=secreto`, anadelo a un servicio `db` con `env_file: [db.env]` y comprueba con `docker compose exec db printenv POSTGRES_PASSWORD`.
5. Declara un volume `db-data` y verifica con `docker volume ls` que aparece como `<proyecto>_db-data`.

## Errores comunes

- **Mezclar los dos planos de variables**: poner credenciales en el `.env` de interpolacion no las mete en el contenedor a menos que las referencies en `environment`. Usa `env_file` para inyectarlas.
- **`WARN The "VAR" variable is not set. Defaulting to a blank string`**: usaste `${VAR}` sin definirla y sin valor por defecto. Define la variable o usa `${VAR:-defecto}`.
- **El volume "se borra" entre `up`**: comprueba que esta declarado en `volumes:` de nivel superior (nombrado); un bind mount apunta a tu host, un volume anonimo puede perderse.
- **La red `internal` impide actualizar paquetes**: una red `internal: true` no tiene salida; es esperado. Pon ese servicio en una red con salida si necesita Internet.

> Idea clave: segmenta con `networks`, persiste con `volumes`, y distingue los dos planos de variables: la interpolacion `${...}` con `.env` actua sobre el YAML, mientras `environment`/`env_file` inyectan variables al contenedor.
