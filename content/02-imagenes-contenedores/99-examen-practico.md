---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre ciclo de vida, docker run, logs, exec, cp y gestión de imágenes."
---

# Examen práctico

Este examen comprueba si controlas el ciclo de vida de contenedores e imágenes sin depender de la UI de Docker Desktop.

## Retos

### Reto 1: ciclo de vida completo

```compare
# CMD
docker create --name examen-web nginx:alpine
docker ps -a --filter name=examen-web --format "{{.Names}} {{.Status}}"
docker start examen-web
docker ps --filter name=examen-web --format "{{.Names}} {{.Status}}"
# OUT
examen-web Created
examen-web
examen-web Up <tiempo>
```

Explica la diferencia entre `create`, `start` y `run`.

### Reto 2: inspección, logs y copia

```compare
# CMD
docker logs examen-web --tail 3
docker exec examen-web sh -c "echo examen > /usr/share/nginx/html/examen.txt"
docker cp examen-web:/usr/share/nginx/html/examen.txt ./examen.txt
type examen.txt
# OUT
...
examen
```

En Linux/macOS usa `cat examen.txt` en vez de `type examen.txt`.

### Reto 3: tags e imágenes

```compare
# CMD
docker commit examen-web curso/examen-web:1.0
docker image ls curso/examen-web --format "{{.Repository}}:{{.Tag}} {{.ID}}"
docker tag curso/examen-web:1.0 curso/examen-web:estable
docker image ls curso/examen-web --format "{{.Repository}}:{{.Tag}} {{.ID}}"
# OUT
curso/examen-web:1.0 <image-id>
curso/examen-web:1.0 <image-id>
curso/examen-web:estable <image-id>
```

Explica por qué los dos tags apuntan al mismo `IMAGE ID`.

## Checklist de autoevalúación

- Sé crear, arrancar, parar, matar, borrar y listar contenedores.
- Sé usar `--name`, `--rm`, `-d`, `-it`, `-p`, `-v`, `--env`, `--entrypoint` y filtros básicos.
- Sé leer logs, ejecutar comandos dentro del contenedor y copiar ficheros.
- Sé diferenciar imagen, tag e ID de imagen.

## Limpieza

```bash
docker rm -f examen-web 2>/dev/null || true
docker image rm curso/examen-web:1.0 curso/examen-web:estable 2>/dev/null || true
Remove-Item .\examen.txt -ErrorAction SilentlyContinue
```

> Resultado esperado: puedes operar contenedores e imágenes con fluidez desde CLI y explicar qué estado cambia cada comando.
