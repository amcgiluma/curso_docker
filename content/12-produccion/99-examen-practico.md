---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre PID 1, señales, healthchecks, restart policies, logs y checklist de producción."
---

# Examen práctico

Este examen comprueba si puedes decidir si una imagen está lista para producción.

## Retos

### Reto 1: healthcheck

```compare
# CMD
docker run -d --name examen-health \
  --health-cmd "wget -qO- http://localhost/ >/dev/null || exit 1" \
  --health-interval 5s \
  --health-retries 3 \
  nginx:alpine
docker inspect --format '{{.State.Health.Status}}' examen-health
# OUT
<container-id>
starting
```

Espera unos segundos y vuelve a consultar hasta ver `healthy`.

### Reto 2: restart policy

```compare
# CMD
docker run -d --name examen-restart --restart on-failure:3 alpine:3.20 sh -c "exit 1"
docker inspect --format '{{.RestartCount}} {{.State.Status}}' examen-restart
# OUT
<container-id>
<n> restarting
```

Explica qué condición activa el reinicio.

### Reto 3: checklist de imagen

```compare
# CMD
docker run --rm nginx:alpine id
docker history nginx:alpine --format "{{.Size}}\t{{.CreatedBy}}" | head
docker inspect --format '{{json .Config.Healthcheck}}' examen-health
# OUT
uid=0(root) gid=0(root) groups=0(root)
<size>  <created-by>
{"Test":["CMD-SHELL","wget -qO- http://localhost/ >/dev/null || exit 1"],...}
```

Identifica al menos dos mejoras de producción para una app propia.

## Checklist de autoevalúación

- Sé explicar PID 1, señales, `STOPSIGNAL`, exec form y apagado limpio.
- Sé definir healthchecks y entender `starting`, `healthy` y `unhealthy`.
- Sé elegir restart policies y sus límites.
- Sé configurar rotación de logs y evitar imágenes con secretos o toolchains innecesarios.
- Sé revisar usuario, tamaño, capas, configuración externa, límites y modo read-only.

## Limpieza

```bash
docker rm -f examen-health examen-restart 2>/dev/null || true
```

> Resultado esperado: puedes auditar una imagen y un contenedor con criterios de operación real, no solo porque "arranca".
