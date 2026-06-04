---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre logs, events, inspect, stats y técnicas de debugging."
---

# Examen práctico

Este examen comprueba si puedes diagnosticar contenedores vivos y contenedores que fallan al arrancar.

## Retos

### Reto 1: logs y eventos

```compare
# CMD
docker run -d --name examen-logs nginx:alpine
docker logs --tail 5 examen-logs
docker events --since 1m --until 1s --filter container=examen-logs
# OUT
<container-id>
...
<fecha> container create <container-id> (image=nginx:alpine, name=examen-logs)
<fecha> container start <container-id> (image=nginx:alpine, name=examen-logs)
```

### Reto 2: inspect con formato

```compare
# CMD
docker inspect --format '{{.Name}} {{.State.Status}} {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' examen-logs
docker stats --no-stream examen-logs
# OUT
/examen-logs running <ip>
CONTAINER ID   NAME          CPU %     MEM USAGE / LIMIT
...
```

### Reto 3: contenedor que no arranca

```compare
# CMD
docker run --name examen-fallo alpine:3.20 sh -c "echo antes && exit 42"
docker ps -a --filter name=examen-fallo --format "{{.Names}} {{.Status}}"
docker logs examen-fallo
docker inspect --format '{{.State.ExitCode}}' examen-fallo
# OUT
antes
examen-fallo Exited (42) ...
antes
42
```

Explica por qué `docker exec` no sirve si el contenedor ya terminó.

## Checklist de autoevalúación

- Sé usar `logs`, `events`, `inspect --format`, `stats`, `system df` y `exec`.
- Sé distinguir fallo de arranque, fallo de healthcheck y consumo excesivo.
- Sé entrar como root con `docker exec -u 0` cuando hace falta inspeccionar permisos.
- Sé depurar imágenes sin shell usando sidecars, namespaces compartidos o `docker debug` si está disponible.

## Limpieza

```bash
docker rm -f examen-logs examen-fallo 2>/dev/null || true
```

> Resultado esperado: puedes formular una hipótesis de fallo y comprobarla con comandos de observabilidad, no por intuición.
