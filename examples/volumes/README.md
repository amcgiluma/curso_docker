# Volumes nombrados vs bind mounts y persistencia

Un contenedor `escritor` (alpine) escribe en dos sitios a la vez:

- **Volumen nombrado** `datos-app` montado en `/data` -> lo gestiona Docker, persiste fuera del ciclo de vida del contenedor.
- **Bind mount** `./bind` montado en `/bind` -> carpeta del host; los ficheros aparecen directamente en este directorio.

## Que demuestra

- Diferencia entre volumen nombrado (gestionado por Docker) y bind mount (ruta del host).
- La **persistencia**: el volumen nombrado conserva los datos aunque se recree el contenedor.

## Levantar

```bash
docker compose up -d
```

El contenedor añade una línea a `/data/registro.log` cada 5 segundos.

## Comprobar el bind mount (en el host)

Mira el fichero creado por el contenedor directamente en tu disco:

```bash
# El fichero aparece en ./bind/inicios.txt
type bind\inicios.txt      # PowerShell / CMD
# cat bind/inicios.txt     # en Linux/macOS
```

## Inspeccionar el volumen nombrado

```bash
# Listar volúmenes
docker volume ls

# Ver detalle: driver y Mountpoint (donde lo guarda Docker)
docker volume inspect volumes_datos-app

# Leer el contenido del volumen desde el propio contenedor
docker exec vol-escritor cat /data/registro.log
```

> El nombre real del volumen lleva el prefijo del proyecto Compose (la carpeta): `volumes_datos-app`. Confirmalo con `docker volume ls`.

## Probar la PERSISTENCIA (recrear el contenedor)

```bash
# 1) Cuenta cuantas líneas hay ahora
docker exec vol-escritor wc -l /data/registro.log

# 2) Destruye el contenedor (SIN borrar el volumen)
docker compose down

# 3) Vuelve a levantarlo
docker compose up -d

# 4) El registro sigue ahí y continua creciendo -> datos PERSISTIDOS
docker exec vol-escritor cat /data/registro.log
```

## Demostrar que el bind mount NO se borra con el volumen

```bash
# Borra contenedor Y volumen nombrado
docker compose down -v

# El volumen 'datos-app' desaparece, pero ./bind/inicios.txt sigue en el host
docker volume ls
type bind\inicios.txt
```

## Limpiar

```bash
docker compose down -v
```
