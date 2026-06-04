---
title: "Repaso final y siguientes pasos"
slug: "repaso-final"
order: 2
summary: "Mapa de todo el curso y por donde seguir: Kubernetes, CI/CD y Swarm."
---

# Repaso final y siguientes pasos

Has recorrido Docker desde los internals hasta dockerizar una app real. Esta lección ata los cabos del curso y te señala el camino: orquestación, automatización y operación a escala.

## Teoría

Mapa mental de lo aprendido, agrupado por bloques:

| Bloque | Ideas que ya dominas |
| --- | --- |
| Fundamentos | Contenedor = proceso aislado (namespaces) y limitado (cgroups); capas de imagen |
| Imágenes | Dockerfile, capas, cache, multi-stage, `.dockerignore` |
| Ejecución | `run`, `exec`, ciclo de vida, puertos, variables de entorno |
| Datos | Volumenes vs bind mounts, persistencia, solo lectura |
| Redes | Bridge, DNS interno por nombre de servicio, aíslamiento |
| Compose | Definir stacks declarativos, `depends_on`, perfiles |
| Registries | `tag`/`push`/`pull`, registros privados, multi-arch |
| Observabilidad | `logs`, `events`, `inspect`, `stats`, debugging |
| Producción | PID 1 y señales, healthchecks, restart policies, logging, 12-factor |
| Proyecto | La plataforma del curso dockerizada en dev y prod |

Lo esencial que deberías llevarte:

- Una imagen reproducible **no depende del entorno**: lo que cambia entre dev y prod es la **config**, no la imagen.
- **Estado fuera del contenedor** (volúmenes/servicios), procesos **desechables** y logs a **stdout**.
- **Seguridad por defecto**: usuario no-root, imagen mínima, sin secretos en capas.
- **Salud y resiliencia**: healthchecks + restart policies + límites de recursos.

> Nota: Docker te da la **unidad** (la imagen/el contenedor). El siguiente nivel es **operar muchas** de esas unidades de forma fiable: ahí entran los orquestadores.

## Manos a la obra

Antes de pasar a lo siguiente, haz una limpieza y una foto del estado de tu Docker:

```compare
# CMD
docker system df
# OUT
TYPE            TOTAL   ACTIVE   SIZE      RECLAIMABLE
Images          14      5        3.1GB     2.0GB (64%)
Build Cache     40      0        780MB     780MB (100%)
```

Recupera espacio de lo que ya no usas (cuidado: borra contenedores parados y cache):

```compare
# CMD
docker system prune
# OUT
WARNING! This will remove:
  - all stopped containers
  - all networks not used by at least one container
  - all dangling images
  - unused build cache
Are you sure you want to continue? [y/N] y
Total reclaimed space: 2.43GB
```

Comprueba tu versión y entorno como punto de partida para lo siguiente:

```compare
# CMD
docker version --format 'Client {{.Client.Version}} / Server {{.Server.Version}}'
# OUT
Client 27.3.1 / Server 27.3.1
```

## Flags y variantes: por donde seguir

| Siguiente paso | Que resuelve | Por donde empezar |
| --- | --- | --- |
| **Docker Compose avanzado** | Multiples ficheros, `override`, `env_file`, `secrets` | `docker compose -f base.yml -f prod.yml up` |
| **Docker Swarm** | Orquestación sencilla con el propio Docker (réplicas, rolling updates) | `docker swarm init`, `docker stack deploy` |
| **Kubernetes** | Orquestación estándar a escala: pods, services, deployments, ingress | `minikube` / `kind` en local, luego `kubectl` |
| **CI/CD** | Build, test y push automáticos de imágenes | GitHub Actions con `docker/build-push-action` |
| **Buildx / multi-arch** | Imágenes para amd64 y arm64 desde el pipeline | `docker buildx build --platform ... --push` |
| **Seguridad** | Escaneo y firma de imágenes | `docker scout`, Trivy, cosign |
| **Observabilidad** | Metricas y logs centralizados | Prometheus + Grafana, Loki, OpenTelemetry |

Concepto que une todo: cuando pasas de Docker a un orquestador, dejas de decir "arranca **este** contenedor" y empiezas a declarar "quiero **N réplicas** sanas de este servicio", y el orquestador se encarga de reconciliar el estado real con el deseado.

## Pruébalo tú

1. Ejecuta `docker system df` y anota cuánto espacio es reclaimable.
2. Limpia con `docker system prune` (añade `-a` solo si quieres borrar también imágenes sin usar).
3. Vuelve al proyecto final y levanta el stack de producción una última vez: `docker compose up --build -d`.
4. Como salto a orquestación local, prueba `docker swarm init` y `docker stack deploy -c docker-compose.yml curso` (requiere imágenes construidas o publicadas).
5. Esboza un workflow de CI: build de la imagen, `docker compose config` para validar, y `push` al registro.
6. Reto: instala `kind` o `minikube` y despliega un nginx (`kubectl create deployment web --image=nginx`); compara el modelo declarativo con lo que ya conoces de Compose.

## Errores comunes

- **`docker system prune -a` borra más de lo esperado**: con `-a` elimina **todas** las imágenes sin contenedor asociado, no solo las dangling. Úsalo a conciencia.
- **Querer Kubernetes para todo**: para una app pequeña, Compose o Swarm suelen bastar. No anadas complejidad sin necesidad.
- **Saltar a orquestación sin imágenes limpias**: si tu imagen no es reproducible, no corre como no-root o no tiene healthcheck, esos problemas se multiplican a escala. Consolida primero las bases del curso.
- **Olvidar versiónar las imágenes en CI/CD**: publicar siempre `latest` complica los rollbacks. Etiqueta con la versión o el SHA del commit.

> Idea clave: ya sabes construir, ejecutar, depurar y operar contenedores siguiendo buenas prácticas. El siguiente nivel es la **orquestación declarativa** (Swarm o Kubernetes) y la **automatización** (CI/CD): mismas imágenes, ahora gestionadas a escala y reconciliando el estado deseado.
