# syntax=docker/dockerfile:1

# --- Etapa 1: dependencias (cache de capas) ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# --- Etapa 2: runtime non-root ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# node:22-alpine ya incluye el usuario sin privilegios "node" (uid 1000)
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
