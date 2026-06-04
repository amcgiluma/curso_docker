---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre usuario no-root, capabilities, filesystem de solo lectura, secretos y límites."
---

# Examen práctico

Este examen comprueba si puedes reducir privilegios sin romper el contenedor.

## Retos

### Reto 1: usuario no-root

```compare
# CMD
docker run --rm alpine:3.20 id
docker run --rm --user 1000:1000 alpine:3.20 id
# OUT
uid=0(root) gid=0(root) groups=0(root),...
uid=1000 gid=1000
```

Explica qué cambia y qué problemas de permisos podrían aparecer.

### Reto 2: filesystem de solo lectura

```compare
# CMD
docker run --rm --read-only alpine:3.20 sh -c "echo x > /tmp/x"
docker run --rm --read-only --tmpfs /tmp alpine:3.20 sh -c "echo x > /tmp/x && cat /tmp/x"
# OUT
sh: can't create /tmp/x: Read-only file system
x
```

Explica por qué `--tmpfs /tmp` arregla el caso sin abrir todo el filesystem.

### Reto 3: capabilities y límites

```compare
# CMD
docker run --rm --cap-drop ALL alpine:3.20 sh -c "id && echo ok"
docker run --rm --memory 64m --pids-limit 64 alpine:3.20 sh -c "cat /sys/fs/cgroup/memory.max 2>/dev/null || true"
# OUT
uid=0(root) gid=0(root) groups=0(root),...
ok
67108864
```

La salida de cgroups puede variar según Docker Desktop, Linux y cgroups v1/v2.

## Checklist de autoevalúación

- Sé ejecutar como usuario no-root y preparar permisos para ese usuario.
- Sé usar `--read-only`, `--tmpfs`, `--cap-drop`, `--cap-add`, `--security-opt` y límites de recursos.
- Sé explicar por qué los secretos no deben ir en capas ni en variables si puedes evitarlas.
- Sé interpretar un escaneo básico y priorizar vulnerabilidades críticas/altas.

## Limpieza

No quedan recursos persistentes si ejecutaste los comandos con `--rm`.

> Resultado esperado: puedes endurecer un contenedor y justificar cada restricción por impacto y compatibilidad.
