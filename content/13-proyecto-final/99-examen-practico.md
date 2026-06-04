---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Reto final para dockerizar, levantar y revisar la plataforma completa del curso."
---

# Examen práctico

Este examen comprueba si puedes aplicar el curso completo a la propia plataforma: FastAPI, React, nginx, Compose, contenido montado y entorno de producción.

## Retos

### Reto 1: valida los ficheros Compose

```compare
# CMD
docker compose config
docker compose -f docker-compose.dev.yml config
# OUT
name: <proyecto>
services:
  backend:
    ...
name: <proyecto>
services:
  backend:
    ...
```

Explica una diferencia importante entre dev y producción.

### Reto 2: levanta producción

```compare
# CMD
docker compose up --build -d
docker compose ps
# OUT
[+] Running ...
NAME                  IMAGE                 SERVICE    STATUS
<proyecto>-backend-1  <imagen>              backend    Up ... (healthy)
<proyecto>-frontend-1 <imagen>              frontend   Up ...
```

Abre `http://localhost:8080` y confirma que ves el curso.

### Reto 3: revisa decisiónes de Dockerfile

```compare
# CMD
docker compose exec backend id
docker compose exec frontend nginx -v
docker compose logs --tail 20 backend
# OUT
uid=1001(appuser) gid=1001(appgroup) groups=1001(appgroup)
nginx version: nginx/<version>
...
```

Explica qué decisiónes del curso ves aplicadas en backend, frontend y Compose.

## Checklist de autoevalúación

- Sé levantar dev y producción con Compose.
- Sé explicar multi-stage en backend y frontend.
- Sé justificar usuario no-root, healthchecks, proxy `/api`, mounts `:ro` y perfil opcional de base de datos.
- Sé comprobar logs, salud, puertos, redes y volúmenes del stack completo.
- Sé proponer al menos tres mejoras de CI/CD, seguridad u operación para el siguiente paso.

## Limpieza

```bash
docker compose down
```

> Resultado esperado: puedes explicar y operar la dockerización completa del proyecto que contiene el curso.
