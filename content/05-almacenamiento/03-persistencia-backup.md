---
title: "Persistencia, backup y restore de volumes"
slug: "persistencia-backup"
order: 3
summary: "Estrategias de persistencia y cómo hacer backup y restore de un volume."
---

# Persistencia, backup y restore de volumes

Persistir datos es solo la mitad del trabajo: también necesitas poder **copiarlos** y **restaurarlos**. Aquí verás el patrón clásico para hacer backup de un volume usando un contenedor auxiliar.

## Teoría

Un volume vive en el host, pero no siempre es cómodo (ni portable) copiar `/var/lib/docker/volumes` a mano. El patrón recomendado es lanzar un **contenedor temporal** que:

1. Monta el volume que quieres respaldar (en solo lectura, por seguridad).
2. Monta una carpeta del host donde dejar el archivo de backup.
3. Comprime el contenido a un `.tar.gz`.

Para restaurar haces lo inverso: montas el volume destino y el tar, y descomprimes dentro.

Buenas prácticas de persistencia:

- Un volume **por servicio con estado** (una base de datos, un servidor de ficheros, etc.).
- Backups **consistentes**: para bases de datos, lo ideal es parar el contenedor o usar el dump nativo del motor (p. ej. `pg_dump`) en vez de copiar ficheros en caliente.
- Versiona y prueba tus backups: un backup que no sabes restaurar no es un backup.

> El truco de usar `alpine` con `tar` funciona en cualquier host porque no depende de herramientas instaladas en tu máquina, solo de Docker.

## Manos a la obra

Prepara datos en un volume de ejemplo:

```compare
# CMD
docker volume create db-data
docker run --rm -v db-data:/data alpine sh -c "echo registro-1 > /data/datos.txt"
# OUT
db-data
```

**Backup** del volume `db-data` a un `backup.tar.gz` en tu carpeta actual:

```compare
# CMD
docker run --rm \
  -v db-data:/data:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/backup.tar.gz -C /data .
ls
# OUT
backup.tar.gz
```

**Restore**: crea un volume nuevo y descomprime el backup dentro:

```compare
# CMD
docker volume create db-data-restaurado
docker run --rm \
  -v db-data-restaurado:/data \
  -v "$(pwd)":/backup \
  alpine sh -c "tar xzf /backup/backup.tar.gz -C /data"
docker run --rm -v db-data-restaurado:/data alpine cat /data/datos.txt
# OUT
db-data-restaurado
registro-1
```

## Flags y variantes

| Elemento | Qué hace |
| --- | --- |
| `-v db-data:/data:ro` | Monta el volume de origen en solo lectura para el backup |
| `-v "$(pwd)":/backup` | Carpeta del host donde se guarda/lee el `.tar.gz` |
| `tar czf <archivo> -C /data .` | Comprime el contenido del volume (`-C` cambia de directorio) |
| `tar xzf <archivo> -C /data` | Extrae el backup dentro del volume destino |
| `docker run --rm` | El contenedor auxiliar se autodestruye al terminar |
| `pg_dump` / `mysqldump` | Para bases de datos, dump lógico más seguro que copiar ficheros |

### Variante: copiar ficheros sueltos con `docker cp`

Para extraer o meter ficheros puntuales en un contenedor (no en un volume directamente) puedes usar:

```bash
docker cp <contenedor>:/ruta/dentro ./destino-host
docker cp ./fichero-host <contenedor>:/ruta/dentro
```

## Pruébalo tú

1. Crea el volume y mete datos: `docker volume create vol-test && docker run --rm -v vol-test:/data alpine sh -c "echo hola > /data/f.txt"`.
2. Haz backup: `docker run --rm -v vol-test:/data:ro -v "$(pwd)":/backup alpine tar czf /backup/vol-test.tar.gz -C /data .`.
3. Simula un desastre: `docker volume rm vol-test`.
4. Restaura en un volume nuevo: `docker volume create vol-test && docker run --rm -v vol-test:/data -v "$(pwd)":/backup alpine sh -c "tar xzf /backup/vol-test.tar.gz -C /data"`.
5. Verifica: `docker run --rm -v vol-test:/data alpine cat /data/f.txt` debe imprimir `hola`.

## Errores comunes

- **Backup de base de datos corrupto**: copiar los ficheros de datos con el motor en marcha puede dar un backup inconsistente. Para BBDD usa el dump nativo (`pg_dump`, `mysqldump`) o para el contenedor antes.
- **`tar: backup.tar.gz: Cannot open: Permission denied`**: la carpeta del host montada en `/backup` no tiene permisos de escritura para el usuario del contenedor. Ajusta permisos o usa otra ruta.
- **Restaurar sobre datos existentes**: si extraes el tar en un volume que ya tiene datos, los puedes sobrescribir o mezclar. Restaura siempre en un volume limpio y luego cambia el montaje.
- **Olvidar `-C /data`**: sin `-C`, `tar` guarda rutas absolutas y al restaurar no caen donde esperas.

> Idea clave: el patrón "contenedor `alpine` + `tar` + dos montajes (volume y carpeta del host)" te permite backup y restore portables de cualquier volume; para bases de datos prefiere el dump nativo del motor.
