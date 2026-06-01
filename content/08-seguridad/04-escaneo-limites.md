---
title: "Escaneo de vulnerabilidades y limites de recursos"
slug: "escaneo-limites"
order: 4
summary: "Escanear imagenes con docker scout y trivy, y limitar memoria, CPU, PIDs y ulimits."
---

# Escaneo de vulnerabilidades y limites de recursos

Una imagen segura debe estar **escaneada** (sin vulnerabilidades criticas conocidas) y un contenedor robusto debe tener **limites de recursos** para que un proceso descontrolado no tumbe el host.

## Teoria

**Escaneo de vulnerabilidades**: las imagenes incluyen paquetes del sistema y dependencias con CVEs conocidos. Herramientas como **Docker Scout** (integrada en Docker) y **Trivy** (de Aqua Security) analizan las capas y reportan vulnerabilidades por severidad. Integrarlo en CI evita publicar imagenes con fallos criticos.

**Limites de recursos**: por defecto un contenedor puede consumir toda la CPU y memoria del host. Conviene acotar:

- **`--memory`**: maximo de RAM. Si lo supera, el contenedor recibe un *OOM kill*.
- **`--cpus`**: fraccion de CPU (p. ej. `1.5` = una CPU y media).
- **`--pids-limit`**: numero maximo de procesos/hilos (mitiga *fork bombs*).
- **`--ulimit`**: limites del kernel (descriptores de fichero `nofile`, etc.).

> Sin `--memory`, un fallo de la app (fuga de memoria) puede agotar la RAM del host y afectar a todos los contenedores. Los limites son tanto seguridad como estabilidad.

## Manos a la obra

Escanea una imagen con Docker Scout (vista rapida):

```compare
# CMD
docker scout quickview nginx:alpine
# OUT
    Target     │  nginx:alpine
      digest   │  <sha256>
    Packages   │  <n>
  Vulnerabilities │  0C  0H  <n>M  <n>L
# (los numeros varian segun la version de la imagen)
```

Con Trivy (via contenedor, sin instalar nada):

```compare
# CMD
docker run --rm aquasec/trivy image --severity HIGH,CRITICAL nginx:alpine
# OUT
nginx:alpine (alpine 3.x)
Total: <n> (HIGH: <n>, CRITICAL: <n>)
# (la tabla detalla cada CVE, paquete y version corregida)
```

Aplica limites de memoria, CPU y PIDs:

```compare
# CMD
docker run -d --name limitado \
  --memory 256m \
  --cpus 1.5 \
  --pids-limit 100 \
  nginx:alpine
docker inspect -f 'mem={{.HostConfig.Memory}} pids={{.HostConfig.PidsLimit}}' limitado
# OUT
mem=268435456 pids=100
```

## Flags y variantes

| Flag / comando | Que hace |
| --- | --- |
| `docker scout quickview <img>` | Resumen de vulnerabilidades de la imagen |
| `docker scout cves <img>` | Detalle de CVEs encontradas |
| `docker scout recommendations <img>` | Sugerencias de imagen base mas segura |
| `trivy image <img>` | Escaneo completo con Trivy |
| `trivy image --severity HIGH,CRITICAL <img>` | Filtra por severidad |
| `trivy image --exit-code 1 <img>` | Falla (exit 1) si hay vulnerabilidades (util en CI) |
| `--memory 256m` | Limite de RAM (acepta `b`, `k`, `m`, `g`) |
| `--memory-swap` | Limite de memoria + swap |
| `--cpus 1.5` | Fraccion de CPUs asignadas |
| `--cpu-shares 512` | Peso relativo de CPU (no es un limite duro) |
| `--pids-limit 100` | Numero maximo de procesos/hilos |
| `--ulimit nofile=1024:2048` | Limite soft:hard de descriptores de fichero |

## Pruebalo tu

1. Ejecuta `docker scout quickview nginx:alpine` (si no esta disponible, usa Trivy).
2. Escanea con Trivy: `docker run --rm aquasec/trivy image --severity HIGH,CRITICAL nginx:alpine`.
3. Compara con una imagen mas pesada (p. ej. `node:18`) y observa cuantas mas CVEs aparecen.
4. Lanza un contenedor con `--memory 256m --cpus 1.5 --pids-limit 100` y verifica con `docker inspect`.
5. Comprueba el `--pids-limit` provocando muchos procesos: dentro del contenedor, un bucle que lance procesos sera cortado al llegar al limite.

## Errores comunes

- **`docker scout` no esta**: en algunos entornos no viene activado. Activa el plugin o usa Trivy via contenedor como alternativa.
- **El contenedor muere con `OOMKilled`**: supero el `--memory`. Comprueba con `docker inspect -f '{{.State.OOMKilled}}' <c>`; sube el limite o arregla la fuga de memoria.
- **`--cpus` no parece limitar**: `--cpu-shares` es solo peso relativo (no limite duro); para un tope real usa `--cpus`.
- **Escaneo sin filtrar severidad**: la salida es enorme. Filtra con `--severity HIGH,CRITICAL` y usa `--exit-code 1` en CI para fallar el pipeline ante vulnerabilidades graves.

> Idea clave: escanea tus imagenes con `docker scout` o `trivy` (filtrando por severidad y fallando en CI ante criticas) y acota cada contenedor con `--memory`, `--cpus`, `--pids-limit` y `--ulimit` por seguridad y estabilidad.
