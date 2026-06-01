# syntax=docker/dockerfile:1
FROM nginx:alpine

# Configuracion del sitio (sobreescribe la default)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Contenido estatico
COPY html/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
