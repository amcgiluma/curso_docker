---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos para comprobar que entiendes procesos, namespaces, cgroups, capas y arquitectura Docker."
---

# Examen práctico

Este examen comprueba si puedes explicar Docker desde sus piezas internas y verificarlo con comandos reales.

## Retos

### Reto 1: contenedor como proceso

```compare
# CMD
docker run -d --name examen-proceso nginx:alpine
docker inspect --format '{{.State.Pid}}' examen-proceso
docker top examen-proceso
# OUT
<pid>
UID                 PID                 PPID                C                   STIME               TTY                 TIME                CMD
root                <pid>               <ppid>              0                   <hora>              ?                   00:00:00            nginx: master process nginx -g daemon off;
```

Explica por qué ese PID demuestra que el contenedor no es una máquina virtual completa.

### Reto 2: aíslamiento de red y hostname

```compare
# CMD
docker exec examen-proceso hostname
docker exec examen-proceso ip addr
# OUT
<container-id>
...
inet <ip-contenedor>/<mask> brd <broadcast> scope global eth0
```

Identifica qué namespace explica cada diferencia frente al host.

### Reto 3: capas y escritura efímera

```compare
# CMD
docker exec examen-proceso sh -c "echo examen > /tmp/marca"
docker diff examen-proceso
docker rm -f examen-proceso
docker run --rm nginx:alpine test -f /tmp/marca || echo "no existe"
# OUT
C /tmp
A /tmp/marca
examen-proceso
no existe
```

Explica dónde vivía `/tmp/marca` y por qué desaparece.

## Checklist de autoevalúación

- Sé distinguir daemon, cliente, imagen, contenedor y registry.
- Sé explicar qué aíslan namespaces y qué limitan cgroups.
- Sé leer `docker inspect`, `docker top`, `docker diff` y `docker history` para justificar una respuesta.
- Sé explicar por qué las capas de imagen son de solo lectura y la capa del contenedor es efímera.

## Limpieza

```bash
docker rm -f examen-proceso 2>/dev/null || true
```

> Resultado esperado: puedes defender con comandos que un contenedor es un proceso aislado y limitado por el kernel, con una vista de filesystem compuesta por capas.
