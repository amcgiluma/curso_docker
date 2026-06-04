---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre volumes, bind mounts, tmpfs, persistencia, backup y restore."
---

# Examen práctico

Este examen comprueba si sabes decidir dónde viven los datos y cómo protegerlos.

## Retos

### Reto 1: persistencia con volume

```compare
# CMD
docker volume create examen-data
docker run --rm -v examen-data:/data alpine sh -c "date > /data/marca.txt"
docker run --rm -v examen-data:/data alpine cat /data/marca.txt
# OUT
examen-data
<fecha>
```

Explica por qué el dato sobrevivió al primer contenedor.

### Reto 2: bind mount de solo lectura

```compare
# CMD
mkdir examen-bind
echo hola > examen-bind\index.txt
docker run --rm -v ${PWD}\examen-bind:/data:ro alpine cat /data/index.txt
docker run --rm -v ${PWD}\examen-bind:/data:ro alpine sh -c "echo fallo > /data/x"
# OUT
hola
sh: can't create /data/x: Read-only file system
```

En Linux/macOS usa `$(pwd)/examen-bind:/data:ro`.

### Reto 3: backup y restore

```compare
# CMD
docker run --rm -v examen-data:/data:ro -v ${PWD}:/backup alpine tar czf /backup/examen-data.tgz -C /data .
docker volume create examen-restore
docker run --rm -v examen-restore:/data -v ${PWD}:/backup alpine tar xzf /backup/examen-data.tgz -C /data
docker run --rm -v examen-restore:/data alpine cat /data/marca.txt
# OUT
examen-restore
<fecha>
```

## Checklist de autoevalúación

- Sé elegir entre volume, bind mount y tmpfs.
- Sé montar en solo lectura cuando el contenedor no necesita escribir.
- Sé hacer backup/restore con un contenedor auxiliar.
- Sé explicar por qué no conviene copiar a mano rutas internas de Docker.

## Limpieza

```bash
docker volume rm examen-data examen-restore 2>/dev/null || true
Remove-Item -Recurse -Force .\examen-bind -ErrorAction SilentlyContinue
Remove-Item .\examen-data.tgz -ErrorAction SilentlyContinue
```

> Resultado esperado: puedes conservar, montar y respaldar datos sin confundir filesystem efímero con almacenamiento persistente.
