---
title: "Qué es realmente un contenedor"
slug: "que-es-un-contenedor"
order: 1
summary: "Procesos aislados con namespaces y cgroups, no máquinas virtuales."
---

# Qué es realmente un contenedor

Un contenedor no es una "mini máquina virtual": es simplemente **uno o varios procesos de Linux normales** que el kernel aísla y limita. Entender esto cambia cómo depuras, mides recursos y razonas sobre seguridad.

## Teoría

Cuando ejecutas un contenedor, el kernel del **host** sigue siendo el mismo. No hay un segundo sistema operativo arrancando. Docker solo le pide al kernel que ejecute un proceso con una vista "recortada" del sistema, usando tres mecanismos:

- **namespaces**: aíslan *lo que el proceso ve* (su propia lista de PIDs, su red, sus puntos de montaje, su hostname...).
- **cgroups** (control groups): limitan *cuánto puede consumir* (CPU, memoria, I/O).
- **capas de imagen** (union filesystem): le dan un sistema de ficheros propio de solo lectura más una capa de escritura.

La diferencia clave con una VM:

| Aspecto | Máquina virtual | Contenedor |
| --- | --- | --- |
| Aisla mediante | Hipervisor + kernel propio | Kernel del host (namespaces/cgroups) |
| Arranque | Segundos a minutos | Milisegundos |
| Peso | GB (SO completo) | MB (solo la app y sus libs) |
| Overhead | Alto (CPU/RAM por VM) | Casi nulo (procesos del host) |
| Kernel | Uno por VM | Compartido con el host |

> Nota: por eso una imagen Linux no corre nativamente sobre un kernel Windows. En Docker Desktop hay una VM Linux ligera por debajo que ejecuta los contenedores.

Cómo un contenedor es "solo un proceso", cuando ese proceso principal (PID 1 dentro del contenedor) termina, el contenedor se detiene. No hay nada más que mantener vivo.

## Manos a la obra

Arranca un contenedor y comprueba que por dentro es un proceso con su PID 1 aislado:

```compare
# CMD
docker run --rm alpine ps aux
# OUT
PID   USER     TIME  COMMAND
    1 root      0:00 ps aux
```

Dentro del contenedor, `ps` solo ve su propio proceso: el namespace de PID le oculta los miles de procesos del host.

Ahora observa ese mismo proceso **desde el host**: ahí es un PID normal más:

```compare
# CMD
docker run -d --name demo alpine sleep 300
docker inspect --format '{{.State.Pid}}' demo
# OUT
<container-id>
14823
# (el PID varía según tu entorno)
```

El número `14823` es el PID real en el host. El mismo proceso se ve como PID 1 dentro y como 14823 fuera: eso es un namespace de PID en acción.

## Flags y variantes

| Flag / comando | Para qué sirve |
| --- | --- |
| `docker run --rm` | Borra el contenedor al terminar (no deja basura) |
| `docker run -d` | Arranca en segundo plano (detached) |
| `--name <nombre>` | Asigna un nombre legible al contenedor |
| `ps aux` (dentro) | Lista los procesos *visibles* en el namespace del contenedor |
| `docker inspect --format '{{.State.Pid}}'` | Muestra el PID real del proceso en el host |
| `docker top <contenedor>` | Lista los procesos del contenedor desde el host |

## Pruébalo tú

1. Lanza `docker run --rm alpine ps aux` y fíjate en que solo aparece PID 1.
2. Arranca `docker run -d --name demo alpine sleep 300`.
3. Ejecuta `docker top demo` y compara el PID que ves ahí con el de dentro.
4. Detenlo y limpialo con `docker rm -f demo`.
5. Como reto: corre `docker run --rm alpine hostname` y verás un hostname aleatorio (namespace UTS).

## Errores comunes

- **"Esperaba ver todos los procesos del host dentro del contenedor"**: no los verás; el namespace de PID los oculta a propósito. Es lo normal.
- **El contenedor se cierra inmediatamente**: si el proceso principal termina (p. ej. `docker run alpine echo hola`), el contenedor para. No es un fallo; es su naturaleza.
- **Confundir contenedor con VM**: no esperes `systemd`, varios servicios ni "encender/apagar" como una VM. Un contenedor = idealmente un proceso.

> Idea clave: un contenedor es un proceso de Linux normal al que el kernel le da una vista aislada (namespaces) y límites (cgroups). No hay segundo kernel; por eso es ligero y arranca al instante.
