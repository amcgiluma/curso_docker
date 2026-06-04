---
title: "Reducir el tamaño de la imagen"
slug: "reducir-tamano"
order: 3
summary: "Consolidar capas, limpiar caches en la misma capa y medir con history y dive."
---

# Reducir el tamaño de la imagen

Imágenes más pequeñas se descargan antes, arrancan antes y exponen menos. Aquí van las técnicas que más bajan el peso y cómo **medir** donde se va el espacio.

## Teoría

Principios para adelgazar una imagen:

- **Limpia en la misma capa**: borrar ficheros en un `RUN` posterior **no** reduce el peso, porque siguen en la capa anterior. Instala y limpia en la **misma** instruccion.
- **Consolida `RUN`**: agrupa comandos relacionados con `&&` para no crear capas de más (sin exagerar: la legibilidad también cuenta).
- **`--no-install-recommends`** (Debian) y **`--no-cache`** (Alpine) evitan paquetes y caches innecesarios.
- **Copia solo lo necesario**: con multi-stage, lleva solo el artefacto.
- **`.dockerignore`** para no meter basura via `COPY . .`.

> El error clásico: `RUN apt-get install ...` en una capa y `RUN apt-get clean` en otra. El cache de apt ya quedo "fosilizado" en la primera capa. Hay que limpiar en la misma.

### Medir donde está el peso

- **`docker history`**: tamaño por capa y que comando la creo.
- **`docker images`**: tamaño total.
- **`dive`** (herramienta externa): explora capa a capa que ficheros se añaden y cuánto espacio se "desperdicia".

## Manos a la obra

Mal y bien al instalar paquetes. La versión "bien" limpia en la misma capa:

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

Compara el total antes y después de aplicar las técnicas:

```compare
# CMD
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep app
# OUT
app:bien 86.0MB
app:mal  121.4MB
# (los valores varian)
```

Explora con `dive` qué espacio se desaprovecha (si lo tienes instalado):

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

| Técnica | Cómo | Efecto |
| --- | --- | --- |
| Limpiar en la misma capa | `RUN install && rm -rf cache` | El cache no queda en la imagen |
| Sin recomendados (Debian) | `apt-get install -y --no-install-recommends` | Menos paquetes |
| Sin cache de apk (Alpine) | `apk add --no-cache <pkg>` | No deja el índice de apk |
| Limpiar pip | `pip install --no-cache-dir -r req.txt` | Sin cache de pip |
| Multi-stage | `COPY --from=build /art ...` | Sin toolchain en la final |
| Medir capas | `docker history --no-trunc` | Ver tamaño y comando de cada capa |
| Auditar espacio | `dive <imagen>` | Eficiencia y bytes desperdiciados |
| Ver espacio global | `docker system df -v` | Detalle de imágenes, capas y volúmenes |

## Pruébalo tú

1. Crea dos imágenes (la "mal" y la "bien" del ejemplo) y compara su tamaño con `docker images`.
2. Inspecciona ambas con `docker history` y localiza la capa donde quedo el cache de apt en la "mal".
3. Añade `--no-install-recommends` y vuelve a medir.
4. Si puedes, instala `dive` y ejecuta `dive app:bien` para ver la eficiencia.
5. Aplica `pip install --no-cache-dir` (o el equivalente de tu stack) y comprueba la reducción.

## Errores comunes

- **Limpiar en una capa distinta**: `rm -rf` posterior no baja el peso; lo que ya está en una capa, ahí se queda. Limpia en el mismo `RUN`.
- **Borrar y esperar milagros con `docker image prune`**: prune borra imágenes enteras no usadas, no adelgaza una imagen mal construida.
- **Demasiada consolidacion**: meter todo en un único `RUN` gigante perjudica la cache y la legibilidad. Equilibra.
- **Olvidar `--no-install-recommends`/`--no-cache`**: arrastras paquetes e índices que no necesitas.
- **`COPY . .` sin `.dockerignore`**: metes artefactos locales y secretos que inflan la imagen.

> Idea clave: el peso se decide capa a capa. Instala y limpia en la **misma** instruccion, evita paquetes/caches innecesarios, copia solo el artefacto (multi-stage) y mide con `docker history` o `dive` para saber donde recortar.
