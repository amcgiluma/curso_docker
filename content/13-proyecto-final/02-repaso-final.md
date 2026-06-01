---
title: "Repaso final y siguientes pasos"
slug: "repaso-final"
order: 2
summary: "Mapa de todo el curso y por donde seguir: Kubernetes, CI/CD y Swarm."
---

# Repaso final y siguientes pasos

Has recorrido Docker desde los internals hasta dockerizar una app real. Esta leccion ata los cabos del curso y te senala el camino: orquestacion, automatizacion y operacion a escala.

## Teoria

Mapa mental de lo aprendido, agrupado por bloques:

| Bloque | Ideas que ya dominas |
| --- | --- |
| Fundamentos | Contenedor = proceso aislado (namespaces) y limitado (cgroups); capas de imagen |
| Imagenes | Dockerfile, capas, cache, multi-stage, `.dockerignore` |
| Ejecucion | `run`, `exec`, ciclo de vida, puertos, variables de entorno |
| Datos | Volumenes vs bind mounts, persistencia, solo lectura |
| Redes | Bridge, DNS interno por nombre de servicio, aislamiento |
| Compose | Definir stacks declarativos, `depends_on`, perfiles |
| Registries | `tag`/`push`/`pull`, registros privados, multi-arch |
| Observabilidad | `logs`, `events`, `inspect`, `stats`, debugging |
| Produccion | PID 1 y senales, healthchecks, restart policies, logging, 12-factor |
| Proyecto | La plataforma del curso dockerizada en dev y prod |

Lo esencial que deberias llevarte:

- Una imagen reproducible **no depende del entorno**: lo que cambia entre dev y prod es la **config**, no la imagen.
- **Estado fuera del contenedor** (volumenes/servicios), procesos **desechables** y logs a **stdout**.
- **Seguridad por defecto**: usuario no-root, imagen minima, sin secretos en capas.
- **Salud y resiliencia**: healthchecks + restart policies + limites de recursos.

> Nota: Docker te da la **unidad** (la imagen/el contenedor). El siguiente nivel es **operar muchas** de esas unidades de forma fiable: ahi entran los orquestadores.

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

Comprueba tu version y entorno como punto de partida para lo siguiente:

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
| **Docker Swarm** | Orquestacion sencilla con el propio Docker (replicas, rolling updates) | `docker swarm init`, `docker stack deploy` |
| **Kubernetes** | Orquestacion estandar a escala: pods, services, deployments, ingress | `minikube` / `kind` en local, luego `kubectl` |
| **CI/CD** | Build, test y push automaticos de imagenes | GitHub Actions con `docker/build-push-action` |
| **Buildx / multi-arch** | Imagenes para amd64 y arm64 desde el pipeline | `docker buildx build --platform ... --push` |
| **Seguridad** | Escaneo y firma de imagenes | `docker scout`, Trivy, cosign |
| **Observabilidad** | Metricas y logs centralizados | Prometheus + Grafana, Loki, OpenTelemetry |

Concepto que une todo: cuando pasas de Docker a un orquestador, dejas de decir "arranca **este** contenedor" y empiezas a declarar "quiero **N replicas** sanas de este servicio", y el orquestador se encarga de reconciliar el estado real con el deseado.

## Pruebalo tu

1. Ejecuta `docker system df` y anota cuanto espacio es reclaimable.
2. Limpia con `docker system prune` (anade `-a` solo si quieres borrar tambien imagenes sin usar).
3. Vuelve al proyecto final y levanta el stack de produccion una ultima vez: `docker compose up --build -d`.
4. Como salto a orquestacion local, prueba `docker swarm init` y `docker stack deploy -c docker-compose.yml curso` (requiere imagenes construidas o publicadas).
5. Esboza un workflow de CI: build de la imagen, `docker compose config` para validar, y `push` al registro.
6. Reto: instala `kind` o `minikube` y despliega un nginx (`kubectl create deployment web --image=nginx`); compara el modelo declarativo con lo que ya conoces de Compose.

## Errores comunes

- **`docker system prune -a` borra mas de lo esperado**: con `-a` elimina **todas** las imagenes sin contenedor asociado, no solo las dangling. Usalo a conciencia.
- **Querer Kubernetes para todo**: para una app pequena, Compose o Swarm suelen bastar. No anadas complejidad sin necesidad.
- **Saltar a orquestacion sin imagenes limpias**: si tu imagen no es reproducible, no corre como no-root o no tiene healthcheck, esos problemas se multiplican a escala. Consolida primero las bases del curso.
- **Olvidar versionar las imagenes en CI/CD**: publicar siempre `latest` complica los rollbacks. Etiqueta con la version o el SHA del commit.

> Idea clave: ya sabes construir, ejecutar, depurar y operar contenedores siguiendo buenas practicas. El siguiente nivel es la **orquestacion declarativa** (Swarm o Kubernetes) y la **automatizacion** (CI/CD): mismas imagenes, ahora gestionadas a escala y reconciliando el estado deseado.
