---
title: "CMD vs ENTRYPOINT (y shell vs exec form)"
slug: "cmd-entrypoint"
order: 3
summary: "Como se combinan CMD y ENTRYPOINT y por que la forma exec maneja mejor las senales."
---

# CMD vs ENTRYPOINT (y shell vs exec form)

Estas dos instrucciones definen **que se ejecuta** cuando arranca el contenedor. Confundirlas provoca contenedores que ignoran tus argumentos o que no se paran bien. Vamos a dejarlo claro.

## Teoria

- **`ENTRYPOINT`**: el ejecutable fijo del contenedor. Pensado para "lo que esta imagen ES" (ej. `nginx`, `python`).
- **`CMD`**: argumentos/comando por defecto, **facilmente sustituibles** al hacer `docker run imagen <algo>`.

Como se combinan (cuando ambos estan en forma exec):

| ENTRYPOINT | CMD | `docker run img` ejecuta | `docker run img foo` ejecuta |
| --- | --- | --- | --- |
| — | `["echo","hola"]` | `echo hola` | `foo` (CMD se reemplaza) |
| `["echo"]` | `["hola"]` | `echo hola` | `echo foo` (CMD se reemplaza, ENTRYPOINT no) |
| `["echo"]` | — | `echo` | `echo foo` |

### Forma shell vs forma exec

- **Forma exec** (JSON array): `CMD ["nginx","-g","daemon off;"]`. Se ejecuta **sin** shell intermedia. El proceso es PID 1 y **recibe las senales** (`SIGTERM`) directamente -> apagado limpio.
- **Forma shell**: `CMD nginx -g 'daemon off;'`. Se ejecuta como `/bin/sh -c "..."`. La shell es PID 1 y, a menudo, **no reenvia** las senales al proceso real -> `docker stop` tarda y acaba en `SIGKILL`.

> Regla practica: usa **forma exec** para `CMD`/`ENTRYPOINT` casi siempre. Usa forma shell solo si necesitas expansion de variables o tuberias (`$VAR`, `|`).

Para combinar lo mejor de ambos (un wrapper de arranque), se usa `ENTRYPOINT` exec + un script, o se delega el rol de PID 1 a un init como `tini`.

## Manos a la obra

CMD reemplazable: el argumento de `docker run` sustituye al CMD.

```dockerfile
FROM alpine:3.20
CMD ["echo", "hola por defecto"]
```

```compare
# CMD
docker build -t cmddemo .
docker run --rm cmddemo
docker run --rm cmddemo echo "adios"
# OUT
hola por defecto
adios
```

ENTRYPOINT fijo + CMD como argumentos por defecto:

```dockerfile
FROM alpine:3.20
ENTRYPOINT ["echo", "saludo:"]
CMD ["hola"]
```

```compare
# CMD
docker build -t epdemo .
docker run --rm epdemo
docker run --rm epdemo mundo
# OUT
saludo: hola
saludo: mundo
```

Senales: con forma exec, el proceso recibe SIGTERM y se para rapido. Compara los tiempos de `docker stop` entre una imagen con forma exec y otra con forma shell.

```compare
# CMD
docker build -t execform .
docker run -d --name s1 execform sleep 1000
docker stop s1
# OUT
[+] Building 0.5s ...
<container-id>
s1
# (se para casi al instante porque sleep recibe SIGTERM)
```

## Flags y variantes

| Concepto | Forma | Recomendacion |
| --- | --- | --- |
| `CMD` exec | `CMD ["bin","arg"]` | Preferida (senales y sin shell) |
| `CMD` shell | `CMD bin arg` | Solo si necesitas `$VAR` o tuberias |
| `ENTRYPOINT` exec | `ENTRYPOINT ["bin"]` | Preferida |
| `ENTRYPOINT` shell | `ENTRYPOINT bin` | Evitar: ignora args y maneja mal senales |
| Sobrescribir ENTRYPOINT | `docker run --entrypoint <bin>` | Cambia el ejecutable en runtime |
| Pasar args al CMD | `docker run img <args>` | Reemplaza el CMD por defecto |
| Init como PID 1 | `docker run --init` o `tini` | Reapea zombies y reenvia senales |

## Pruebalo tu

1. Construye la imagen `cmddemo` y comprueba que `docker run cmddemo echo adios` reemplaza el CMD.
2. Construye `epdemo` y verifica que el argumento se anade **detras** del ENTRYPOINT.
3. Sobrescribe el ENTRYPOINT con `docker run --entrypoint sh -it epdemo`.
4. Crea dos imagenes con `CMD ["sleep","1000"]` (exec) y `CMD sleep 1000` (shell). Cronometra `docker stop` en cada una.
5. Anade `--init` a la version shell y observa que mejora el manejo de senales.

## Errores comunes

- **`docker stop` tarda 10 s y devuelve 137**: usaste forma shell y la shell no reenvia `SIGTERM`. Cambia a forma exec o usa `--init`/`tini`.
- **"Mis argumentos se ignoran"**: con `ENTRYPOINT` en forma shell, los argumentos de `docker run` no llegan. Usa forma exec.
- **Mezclar formas sin querer**: si `ENTRYPOINT` es exec y `CMD` es shell, `CMD` se pasa como un unico argumento raro. Manten ambas en exec.
- **Procesos zombie**: tu app lanza hijos y no los recoge. Usa un init (`--init`) como PID 1.

> Idea clave: `ENTRYPOINT` = el ejecutable fijo; `CMD` = argumentos por defecto reemplazables. Usa **forma exec** (`["bin","arg"]`) para que el proceso reciba las senales y `docker stop` sea limpio.
