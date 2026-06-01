---
title: "Publicacion de puertos"
slug: "publicacion-puertos"
order: 3
summary: "Mapear puertos con -p y -P, EXPOSE frente a publish y bind a 127.0.0.1."
---

# Publicacion de puertos

Para que un servicio dentro de un contenedor sea accesible desde el host (o desde fuera), tienes que **publicar** su puerto. Aqui veras `-p`, `-P`, los mapeos exactos y la diferencia entre `EXPOSE` y publicar.

## Teoria

Un contenedor en la red bridge tiene su propia IP privada. Por defecto, sus puertos **no** son accesibles desde el host. Publicar un puerto crea una regla que reenvia el trafico del host al contenedor.

- **`-p <host>:<contenedor>`**: mapea un puerto concreto del host a un puerto del contenedor.
- **`-P` (mayuscula)**: publica **todos** los puertos declarados con `EXPOSE` en la imagen, asignandoles puertos altos aleatorios del host.
- **`EXPOSE`** (en el Dockerfile): es solo **documentacion / metadato**. NO publica nada por si mismo; indica que el servicio escucha en ese puerto. `-P` y algunas herramientas lo usan como referencia.

Formato completo del mapeo: `[ip-host:]puerto-host:puerto-contenedor[/protocolo]`.

> Seguridad: por defecto `-p 8080:80` escucha en **todas** las interfaces del host (`0.0.0.0`), quedando accesible desde la red. Para limitarlo a tu maquina usa `-p 127.0.0.1:8080:80`.

## Manos a la obra

Publica el puerto 80 del contenedor en el 8080 del host:

```compare
# CMD
docker run -d --name web -p 8080:80 nginx:alpine
docker port web
# OUT
80/tcp -> 0.0.0.0:8080
80/tcp -> [::]:8080
```

Publica solo en localhost (no accesible desde la red):

```compare
# CMD
docker run -d --name web-local -p 127.0.0.1:9090:80 nginx:alpine
docker port web-local
# OUT
80/tcp -> 127.0.0.1:9090
```

Usa `-P` para publicar lo declarado con `EXPOSE` en puertos aleatorios:

```compare
# CMD
docker run -d --name web-auto -P nginx:alpine
docker ps --format "{{.Names}}: {{.Ports}}"
# OUT
web-auto: 0.0.0.0:32768->80/tcp, [::]:32768->80/tcp
```

## Flags y variantes

| Flag / forma | Que hace |
| --- | --- |
| `-p 8080:80` | Host 8080 -> contenedor 80 (todas las interfaces) |
| `-p 127.0.0.1:8080:80` | Solo accesible desde localhost del host |
| `-p 80` | Host aleatorio -> contenedor 80 (puerto host sin fijar) |
| `-p 53:53/udp` | Mapeo de un puerto UDP |
| `-p 8080:80 -p 8443:443` | Varios mapeos a la vez (repite `-p`) |
| `-P` | Publica todos los `EXPOSE` en puertos altos aleatorios |
| `EXPOSE 80` (Dockerfile) | Documenta el puerto; NO publica por si solo |
| `docker port <contenedor>` | Muestra los mapeos activos |

### `EXPOSE` frente a publicar

```dockerfile
FROM nginx:alpine
EXPOSE 80
```

`EXPOSE 80` no abre nada hacia el host. Sigues necesitando `-p`/`-P` al ejecutar. Su utilidad: documentar la imagen y permitir que `-P` sepa que publicar.

## Pruebalo tu

1. Lanza `docker run -d --name n1 -p 8080:80 nginx:alpine`.
2. Abre `http://localhost:8080` en el navegador (o `curl http://localhost:8080`): veras la pagina de bienvenida de nginx.
3. Comprueba el mapeo con `docker port n1`.
4. Lanza otro con `-p 127.0.0.1:8081:80` y verifica que `docker port` muestra `127.0.0.1`.
5. Prueba `-P`: `docker run -d --name n2 -P nginx:alpine` y mira el puerto aleatorio con `docker ps`. Limpia con `docker rm -f n1 n2`.

## Errores comunes

- **`Bind for 0.0.0.0:8080 failed: port is already allocated`**: ya hay algo (otro contenedor o un proceso del host) usando ese puerto. Cambia el puerto del host o libera el ocupado.
- **No puedo acceder al servicio aunque hice `EXPOSE`**: `EXPOSE` no publica nada; falta `-p`/`-P`.
- **El servicio escucha solo en `127.0.0.1` dentro del contenedor**: si la app escucha en localhost del contenedor, el mapeo de puertos no llega a ella. Configura la app para escuchar en `0.0.0.0`.
- **Expuse a toda la red sin querer**: usa `-p 127.0.0.1:<host>:<contenedor>` para no exponer servicios sensibles a la LAN.

> Idea clave: `EXPOSE` solo documenta; para acceder de verdad publica con `-p host:contenedor` (o `-P` para los `EXPOSE` en puertos aleatorios), y limita la exposicion con `127.0.0.1:` cuando el servicio no deba salir del host.
