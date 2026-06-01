# Sitio estatico con nginx:alpine

Sirve un `index.html` estatico usando la imagen oficial `nginx:alpine`.

## Que demuestra

- Servir contenido estatico copiando ficheros a `/usr/share/nginx/html`.
- Personalizar la config de nginx (`nginx.conf`) anadiendo un endpoint `/health`.
- **Mapeo de puertos**: el contenedor expone el `80`; lo publicamos en el host.
- HEALTHCHECK con `wget` (incluido en BusyBox dentro de la imagen alpine).

## Construir

```bash
docker build -t curso/nginx .
```

## Ejecutar (mapeo de puertos)

Formato `-p HOST:CONTENEDOR`. Aqui mapeamos el `8080` del host al `80` del contenedor:

```bash
docker run --rm -p 8080:80 --name web curso/nginx
```

- Sitio: http://localhost:8080
- Health: http://localhost:8080/health  -> `ok`

Para usar el puerto 80 del host directamente:

```bash
docker run --rm -p 80:80 --name web curso/nginx
# -> http://localhost
```

## Que observar

```bash
# Ver el mapeo de puertos activo
docker port web

# Estado del healthcheck
docker ps
```

Para parar: `Ctrl+C` (o `docker stop web`).
