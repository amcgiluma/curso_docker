# Redes definidas por usuario y DNS interno

Dos contenedores (`servidor` con nginx y `cliente` con alpine) en una **red bridge personalizada** (`red-curso`). En redes definidas por el usuario, Docker ofrece **DNS interno**: los contenedores se resuelven por el **nombre del servicio**.

## Que demuestra

- Crear una red custom con Compose.
- Resolver un contenedor por su nombre de servicio (`servidor`) sin exponer puertos al host.
- Inspeccionar la red y ver los contenedores conectados.

## Levantar

```bash
docker compose up -d
```

## Probar la resolucion DNS (por nombre de servicio)

El cliente resuelve `servidor` por DNS interno y le hace una peticion HTTP:

```bash
# HTTP por nombre de servicio (alpine trae wget de BusyBox)
docker exec net-cliente wget -qO- http://servidor

# Ping por nombre de servicio
docker exec net-cliente ping -c 3 servidor

# Ver la IP que resuelve el DNS interno
docker exec net-cliente nslookup servidor
```

## Inspeccionar la red

```bash
# Listar redes
docker network ls

# Ver detalle: subred, gateway y contenedores conectados
docker network inspect red-curso
```

## Demostrar el aíslamiento (opcional)

El nombre `servidor` NO se resuelve fuera de la red `red-curso`. Por eso la red personalizada es necesaria (la red `bridge` por defecto no da DNS por nombre de contenedor).

## Limpiar

```bash
docker compose down
```
