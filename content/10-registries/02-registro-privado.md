---
title: "Tu propio registro privado con registry:2"
slug: "registro-privado"
order: 2
summary: "Levantar un registro local con registry:2, hacer push/pull y configurarlo."
---

# Tu propio registro privado con registry:2

No siempre quieres (o puedes) publicar en Docker Hub. Con la imagen oficial `registry:2` levantas tu propio registro en segundos para distribuir imagenes dentro de tu red o tu maquina.

## Teoria

`registry:2` es la implementacion de referencia del **Docker Registry HTTP API V2**. Es el mismo motor que hay detras de muchos registros gestionados. Caracteristicas:

- Escucha en el puerto **5000** por defecto.
- Guarda las imagenes en `/var/lib/registry` dentro del contenedor: necesitas un **volumen** para que no se pierdan al recrearlo.
- Por defecto **no tiene autenticacion ni TLS**. Sirve para una LAN de confianza o pruebas locales; para algo serio hay que anadir TLS y/o auth.

Para empujar una imagen a tu registro, su nombre debe incluir el **host:puerto** del registro:

```output
localhost:5000/mi-app:1.0
```

> Nota: Docker trata cualquier nombre con un `host:puerto` o un `.` (dominio) antes de la primera barra como un registro distinto de Docker Hub. Por eso `localhost:5000/...` no va a `docker.io`.

## Manos a la obra

Levanta el registro con un volumen para persistir los datos:

```compare
# CMD
docker run -d \
  --name registry \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  --restart always \
  registry:2
# OUT
<container-id>
```

Etiqueta una imagen apuntando a tu registro y subela:

```compare
# CMD
docker pull alpine:3.20
docker tag alpine:3.20 localhost:5000/alpine:3.20
docker push localhost:5000/alpine:3.20
# OUT
The push refers to repository [localhost:5000/alpine]
1f3e46996e29: Pushed
3.20: digest: sha256:<digest> size: 528
```

Consulta el catalogo del registro por su API HTTP:

```compare
# CMD
curl http://localhost:5000/v2/_catalog
# OUT
{"repositories":["alpine"]}
```

Borra la copia local y descargala desde tu registro:

```compare
# CMD
docker rmi localhost:5000/alpine:3.20 alpine:3.20
docker pull localhost:5000/alpine:3.20
# OUT
3.20: Pulling from alpine
Digest: sha256:<digest>
Status: Downloaded newer image for localhost:5000/alpine:3.20
localhost:5000/alpine:3.20
```

## Flags y variantes

| Flag / accion | Para que sirve |
| --- | --- |
| `-p 5000:5000` | Publica el puerto del registro en el host |
| `-v registry-data:/var/lib/registry` | Persiste las imagenes en un volumen |
| `--restart always` | Levanta el registro al reiniciar Docker |
| `-e REGISTRY_STORAGE_DELETE_ENABLED=true` | Permite borrar manifests via API |
| `-e REGISTRY_HTTP_ADDR=:5000` | Cambia la direccion/puerto de escucha |
| `GET /v2/_catalog` | Lista los repositorios del registro |
| `GET /v2/<repo>/tags/list` | Lista los tags de un repositorio |
| `localhost:5000/<img>` | Prefijo de nombre para apuntar al registro local |

### Acceder desde otra maquina (registro "inseguro")

Si accedes por IP sin TLS, los demas Docker lo rechazan salvo que lo marques como inseguro en `/etc/docker/daemon.json`:

```json
{
  "insecure-registries": ["192.168.1.50:5000"]
}
```

Tras editarlo, reinicia el daemon (`sudo systemctl restart docker`). En Docker Desktop se configura en *Settings -> Docker Engine*.

## Pruebalo tu

1. Arranca el registro: `docker run -d --name registry -p 5000:5000 -v registry-data:/var/lib/registry registry:2`.
2. Baja una imagen pequena: `docker pull alpine:3.20`.
3. Etiquetala: `docker tag alpine:3.20 localhost:5000/alpine:3.20` y subela con `docker push`.
4. Consulta `curl http://localhost:5000/v2/_catalog` y `curl http://localhost:5000/v2/alpine/tags/list`.
5. Borra la imagen local y recuperala con `docker pull localhost:5000/alpine:3.20`.
6. Reto: para y elimina el contenedor (`docker rm -f registry`), vuelve a crearlo con el **mismo** volumen y comprueba que la imagen sigue en el catalogo.

## Errores comunes

- **`http: server gave HTTP response to HTTPS client`**: intentas hablar con un registro sin TLS desde otra maquina. Anade su `host:puerto` a `insecure-registries` o configura TLS.
- **Las imagenes desaparecen al recrear el contenedor**: olvidaste el volumen en `/var/lib/registry`. Sin el, los datos viven en la capa efimera del contenedor.
- **`connection refused` en push**: el registro no esta arrancado o el puerto no esta publicado. Verifica con `docker ps` y `curl http://localhost:5000/v2/`.
- **Creer que `registry:2` trae login**: no por defecto. Para auth basica hay que montar un fichero `htpasswd` y definir las variables `REGISTRY_AUTH`.

> Idea clave: `registry:2` te da un registro propio en el puerto 5000. Persiste siempre `/var/lib/registry` con un volumen, prefija las imagenes con `host:puerto/` y recuerda que sin TLS/auth solo es apto para redes de confianza.
