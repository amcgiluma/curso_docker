---
title: "Logging drivers y rotacion de logs"
slug: "logging-drivers"
order: 3
summary: "json-file, local y otros drivers, mas rotacion para que los logs no llenen el disco."
---

# Logging drivers y rotacion de logs

Por defecto Docker guarda los logs como JSON sin limite de tamano: en produccion eso llena el disco tarde o temprano. Aqui veras los **logging drivers** y como configurar la **rotacion**.

## Teoria

Un **logging driver** decide que hace Docker con el stdout/stderr de tus contenedores. El driver por defecto es **`json-file`**.

| Driver | Que hace | `docker logs` |
| --- | --- | --- |
| `json-file` | Guarda JSON en el host (por defecto) | si |
| `local` | Formato binario optimizado, con rotacion por defecto | si |
| `journald` | Envia a `systemd-journald` | si (via journald) |
| `syslog` | Envia a un syslog (local o remoto) | no |
| `gelf` | Envia a Graylog/Logstash (GELF) | no |
| `fluentd` | Envia a Fluentd/Fluent Bit | no |
| `awslogs` | Envia a CloudWatch Logs | no |
| `none` | Descarta los logs | no |

Punto critico de produccion: con `json-file` **sin rotacion**, el fichero crece indefinidamente. La solucion son las opciones `max-size` y `max-file`.

> Nota: el driver **`local`** ya aplica rotacion por defecto (100 MB, 5 ficheros) y es mas eficiente en disco. Para muchos casos es mejor opcion que `json-file`.

Puedes configurar el driver a tres niveles:

1. **Global** (daemon): en `/etc/docker/daemon.json` para todos los contenedores nuevos.
2. **Por contenedor**: con `--log-driver` y `--log-opt`.
3. **En Compose**: bloque `logging:` del servicio.

## Manos a la obra

Arranca un contenedor con `json-file` y rotacion (max 10 MB por fichero, 3 ficheros):

```compare
# CMD
docker run -d --name web \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  nginx:1.27-alpine
docker inspect --format '{{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}' web
# OUT
json-file {"max-file":"3","max-size":"10m"}
```

Configura la rotacion **global** para que aplique a todos los contenedores nuevos en `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Tras editarlo, recarga el daemon (`sudo systemctl restart docker`). En Compose se declara por servicio:

```yaml
services:
  web:
    image: nginx:1.27-alpine
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

Comprueba el driver activo del daemon:

```compare
# CMD
docker info --format 'Logging Driver: {{.LoggingDriver}}'
# OUT
Logging Driver: json-file
```

## Flags y variantes

| Opcion | Para que sirve |
| --- | --- |
| `--log-driver <driver>` | Elige el driver del contenedor |
| `--log-opt max-size=10m` | Tamano maximo por fichero antes de rotar |
| `--log-opt max-file=3` | Numero de ficheros rotados a conservar |
| `--log-opt compress=true` | Comprime los ficheros rotados (json-file/local) |
| `--log-opt tag="{{.Name}}"` | Etiqueta los mensajes (util en syslog/gelf/fluentd) |
| `--log-driver none` | Desactiva los logs de ese contenedor |
| `docker info --format '{{.LoggingDriver}}'` | Muestra el driver por defecto del daemon |

> Nota: `docker logs` solo funciona con drivers que guardan localmente (`json-file`, `local`, `journald`). Con `syslog`/`gelf`/`fluentd` debes mirar los logs en el destino. Cambiar el driver de un contenedor requiere recrearlo (no es editable en caliente).

## Pruebalo tu

1. Arranca un contenedor con rotacion: `docker run -d --name web --log-opt max-size=1m --log-opt max-file=3 nginx:1.27-alpine`.
2. Verifica la config: `docker inspect --format '{{json .HostConfig.LogConfig}}' web`.
3. Genera trafico (`docker exec web sh -c "for i in $(seq 1 100000); do echo log $i; done"`) y observa la rotacion en `/var/lib/docker/containers/<id>/`.
4. Consulta el driver del daemon con `docker info --format '{{.LoggingDriver}}'`.
5. Prueba el driver `local`: `docker run -d --name web2 --log-driver local nginx:1.27-alpine` y compara.
6. Reto: edita `/etc/docker/daemon.json` (o Docker Desktop -> Docker Engine) con `max-size`/`max-file`, reinicia Docker y comprueba que los contenedores nuevos heredan la rotacion.

## Errores comunes

- **El disco se llena de JSON de logs**: usabas `json-file` sin rotacion. Anade `max-size`/`max-file` o cambia a `local`.
- **`docker logs` da error tras cambiar el driver**: pusiste `syslog`/`gelf`/etc. Esos no permiten `docker logs`; consulta el destino.
- **Cambie el driver pero el contenedor sigue igual**: el driver se fija al crear el contenedor. Hay que recrearlo (los cambios en `daemon.json` solo afectan a los nuevos).
- **`max-size` sin unidad**: usa sufijos (`k`, `m`, `g`). `max-size=10` se interpreta en bytes y rotara constantemente.

> Idea clave: en produccion nunca dejes `json-file` sin rotacion: configura `max-size`/`max-file` (o usa el driver `local`, que ya rota) a nivel de daemon, contenedor o Compose, y recuerda que solo los drivers locales permiten `docker logs`.
