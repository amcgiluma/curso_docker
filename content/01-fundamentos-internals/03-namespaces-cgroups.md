---
title: "Namespaces y cgroups: el aíslamiento real"
slug: "namespaces-cgroups"
order: 3
summary: "Que aísla cada namespace (pid, net, mnt, uts, ipc, user) y cómo limitan los cgroups."
---

# Namespaces y cgroups: el aíslamiento real

Los contenedores no usan "magia": usan dos funciones del kernel de Linux. Los **namespaces** deciden *que ve* el proceso y los **cgroups** deciden *cuánto consume*. Aquí los vamos a tocar de cerca.

## Teoría

### Namespaces (que ve el proceso)

Cada namespace aísla un tipo de recurso del sistema. Docker crea varios al arrancar un contenedor:

| Namespace | Aisla | Efecto visible |
| --- | --- | --- |
| `pid` | Arbol de procesos | El contenedor ve su propio PID 1 y no los del host |
| `net` | Interfaces, rutas, puertos | IP y `localhost` propios, su propia tabla de red |
| `mnt` | Puntos de montaje | Su propio sistema de ficheros raíz |
| `uts` | Hostname y dominio | Puede tener un hostname distinto al del host |
| `ipc` | Memoria compartida, colas | Aisla la comúnicacion entre procesos |
| `user` | Mapeo de UID/GID | `root` dentro puede ser un usuario sin privilegios fuera |

> El namespace `user` es la base del "rootless Docker": ser UID 0 dentro del contenedor sin ser root en el host, lo que reduce mucho el riesgo.

### cgroups (cuánto consume)

Los **control groups** limitan y contabilizan recursos: memoria, CPU, I/O de disco, número de PIDs. Sin un límite de memoria, un contenedor podria consumir toda la RAM del host. Con cgroups le pones un techo y, si lo supera, el kernel actua (p. ej. el OOM killer mata el proceso).

La mayoría de sistemás modernos usan **cgroup v2** (jerarquia unificada en `/sys/fs/cgroup`).

## Manos a la obra

Mira el namespace UTS: el contenedor tiene su propio hostname.

```compare
# CMD
docker run --rm --hostname caja1 alpine hostname
# OUT
caja1
```

Comprueba el namespace de red: dentro hay una interfaz `eth0` distinta a la del host.

```compare
# CMD
docker run --rm alpine ip addr show eth0
# OUT
2: eth0@if10: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
    ...
# (la IP varía según tu entorno)
```

Aplica un límite de memoria con cgroups y verifica que el contenedor lo "ve":

```compare
# CMD
docker run --rm --memory 64m alpine sh -c "cat /sys/fs/cgroup/memory.max"
# OUT
67108864
```

`67108864` son exactamente 64 MiB en bytes: el límite del cgroup se refleja dentro del contenedor.

## Flags y variantes

| Flag de `docker run` | Namespace / cgroup que toca |
| --- | --- |
| `--hostname <h>` | UTS: fija el hostname del contenedor |
| `--network host` | Net: usa la red del host (sin namespace de red propio) |
| `--pid host` | PID: comparte el arbol de procesos del host (rompe el aíslamiento) |
| `--ipc host` | IPC: comparte la memoria compartida del host |
| `--userns-remap` (daemon) | User: activa el remapeo de usuarios |
| `--memory 256m` | cgroup: límite duro de memoria |
| `--memory-swap 512m` | cgroup: límite de memoria + swap |
| `--cpus 1.5` | cgroup: equivalente a 1.5 nucleos |
| `--cpuset-cpus 0,1` | cgroup: fija el contenedor a CPUs concretas |
| `--pids-limit 100` | cgroup: número máximo de procesos |

## Pruébalo tú

1. Ejecuta `docker run --rm --hostname caja1 alpine hostname` y compara con tu hostname del host.
2. Lanza dos contenedores y comprueba que cada uno tiene su propia IP con `ip addr`.
3. Pon `docker run --rm --memory 64m alpine cat /sys/fs/cgroup/memory.max` y verifica los 64 MiB.
4. Prueba a estresar la memoria: `docker run --rm --memory 64m alpine sh -c "tail /dev/zero"` y observa cómo el kernel mata el proceso (OOM).
5. Compara `docker run --rm alpine hostname` (aislado) con `docker run --rm --pid host alpine ps aux | head` (ves procesos del host).

## Errores comunes

- **`--memory` parece ignorarse**: en algunas configuraciones aparece el aviso de que falta soporte de swap limit; el límite de RAM aún aplica. Revisa `docker info` (warnings de cgroup).
- **El proceso muere con código 137**: es un OOM kill; superaste el límite de `--memory`. Sube el límite o reduce el uso de RAM.
- **`--pid host` o `--network host` "para todo"**: cómodos para depurar, pero rompen el aíslamiento; no los uses en producción sin pensarlo.
- **Esperar cgroup v1 y ver rutas distintas**: en cgroup v2 los ficheros son `memory.max`, `cpu.max`, etc. En v1 eran `memory.limit_in_bytes`.

> Idea clave: namespaces = que ve el proceso (pid, net, mnt, uts, ipc, user); cgroups = cuánto puede consumir (CPU, RAM, PIDs). Juntos convierten un proceso normal en un contenedor aislado y acotado.
