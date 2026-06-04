---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre redes bridge, DNS interno, publicación de puertos y aíslamiento."
---

# Examen práctico

Este examen comprueba si entiendes la red de Docker desde dentro y desde fuera del host.

## Retos

### Reto 1: red definida por usuario

```compare
# CMD
docker network create examen-net
docker run -d --name examen-nginx --network examen-net nginx:alpine
docker run --rm --network examen-net alpine sh -c "wget -qO- http://examen-nginx | head -1"
# OUT
examen-net
<container-id>
<!DOCTYPE html>
```

Explica por qué `examen-nginx` resuelve por DNS dentro de esa red.

### Reto 2: publicar un puerto

```compare
# CMD
docker rm -f examen-nginx
docker run -d --name examen-nginx -p 8088:80 nginx:alpine
docker port examen-nginx
# OUT
examen-nginx
<container-id>
80/tcp -> 0.0.0.0:8088
```

Abre `http://localhost:8088` y confirma que responde nginx.

### Reto 3: inspección de red

```compare
# CMD
docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' examen-nginx
docker network inspect bridge --format '{{len .Containers}}'
# OUT
<ip-contenedor>
<número>
```

Explica qué IP es interna y qué puerto es accesible desde el host.

## Checklist de autoevalúación

- Sé diferenciar red bridge por defecto y redes definidas por usuario.
- Sé explicar DNS interno por nombre de contenedor/servicio.
- Sé publicar puertos con `-p host:container` sin confundirlo con `EXPOSE`.
- Sé inspeccionar redes, IPs y conectividad.

## Limpieza

```bash
docker rm -f examen-nginx 2>/dev/null || true
docker network rm examen-net 2>/dev/null || true
```

> Resultado esperado: puedes conectar contenedores entre sí por red interna y exponer solo lo necesario al host.
