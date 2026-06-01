---
title: "Reducir el tamano de la imagen"
slug: "reducir-tamano"
order: 3
summary: "Consolidar capas, limpiar caches en la misma capa y medir con history y dive."
---

# Reducir el tamano de la imagen

Imagenes mas pequenas se descargan antes, arrancan antes y exponen menos. Aqui van las tecnicas que mas bajan el peso y como **medir** donde se va el espacio.

## Teoria

Principios para adelgazar una imagen:

- **Limpia en la misma capa**: borrar ficheros en un `RUN` posterior **no** reduce el peso, porque siguen en la capa anterior. Instala y limpia en la **misma** instruccion.
- **Consolida `RUN`**: agrupa comandos relacionados con `&&` para no crear capas de mas (sin exagerar: la legibilidad tambien cuenta).
- **`--no-install-recommends`** (Debian) y **`--no-cache`** (Alpine) evitan paquetes y caches innecesarios.
- **Copia solo lo necesario**: con multi-stage, lleva solo el artefacto.
- **`.dockerignore`** para no meter basura via `COPY . .`.

> El error clasico: `RUN apt-get install ...` en una capa y `RUN apt-get clean` en otra. El cache de apt ya quedo "fosilizado" en la primera capa. Hay que limpiar en la misma.

### Medir donde esta el peso

- **`docker history`**: tamano por capa y que comando la creo.
- **`docker images`**: tamano total.
- **`dive`** (herramienta externa): explora capa a capa que ficheros se anaden y cuanto espacio se "desperdicia".

## Manos a la obra

Mal y bien al instalar paquetes. La version "bien" limpia en la misma capa:

```dockerfile
# MAL: el cache de apt queda en una capa anterior
RUN apt-get update && apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# BIEN: todo en una capa, sin recommends, limpiando al final
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

Mide capa a capa con `history` (la columna SIZE delata las pesadas):

```compare
# CMD
docker history app:bien --format "{{.Size}}\t{{.CreatedBy}}" | head -5
# OUT
0B       CMD ["app"]
8.1MB    RUN apt-get update && apt-get install -y --no-install-recommends curl ...
0B       WORKDIR /app
77.8MB   /bin/sh -c #(nop) ADD file:... in /
0B       /bin/sh -c #(nop) FROM debian:12-slim
```

Compara el total antes y despues de aplicar las tecnicas:

```compare
# CMD
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep app
# OUT
app:bien 86.0MB
app:mal  121.4MB
# (los valores varian)
```

Explora con `dive` que espacio se desaprovecha (si lo tienes instalado):

```compare
# CMD
dive app:bien --ci
# OUT
  efficiency: 98.7 %
  wastedBytes: 1.2 MB
  Result:PASS
# (valores aproximados)
```

## Flags y variantes

| Tecnica | Como | Efecto |
| --- | --- | --- |
| Limpiar en la misma capa | `RUN install && rm -rf cache` | El cache no queda en la imagen |
| Sin recomendados (Debian) | `apt-get install -y --no-install-recommends` | Menos paquetes |
| Sin cache de apk (Alpine) | `apk add --no-cache <pkg>` | No deja el indice de apk |
| Limpiar pip | `pip install --no-cache-dir -r req.txt` | Sin cache de pip |
| Multi-stage | `COPY --from=build /art ...` | Sin toolchain en la final |
| Medir capas | `docker history --no-trunc` | Ver tamano y comando de cada capa |
| Auditar espacio | `dive <imagen>` | Eficiencia y bytes desperdiciados |
| Ver espacio global | `docker system df -v` | Detalle de imagenes, capas y volumenes |

## Pruebalo tu

1. Crea dos imagenes (la "mal" y la "bien" del ejemplo) y compara su tamano con `docker images`.
2. Inspecciona ambas con `docker history` y localiza la capa donde quedo el cache de apt en la "mal".
3. Anade `--no-install-recommends` y vuelve a medir.
4. Si puedes, instala `dive` y ejecuta `dive app:bien` para ver la eficiencia.
5. Aplica `pip install --no-cache-dir` (o el equivalente de tu stack) y comprueba la reduccion.

## Errores comunes

- **Limpiar en una capa distinta**: `rm -rf` posterior no baja el peso; lo que ya esta en una capa, ahi se queda. Limpia en el mismo `RUN`.
- **Borrar y esperar milagros con `docker image prune`**: prune borra imagenes enteras no usadas, no adelgaza una imagen mal construida.
- **Demasiada consolidacion**: meter todo en un unico `RUN` gigante perjudica la cache y la legibilidad. Equilibra.
- **Olvidar `--no-install-recommends`/`--no-cache`**: arrastras paquetes e indices que no necesitas.
- **`COPY . .` sin `.dockerignore`**: metes artefactos locales y secretos que inflan la imagen.

> Idea clave: el peso se decide capa a capa. Instala y limpia en la **misma** instruccion, evita paquetes/caches innecesarios, copia solo el artefacto (multi-stage) y mide con `docker history` o `dive` para saber donde recortar.
