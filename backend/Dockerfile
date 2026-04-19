FROM node:22-alpine

WORKDIR /usr/src/app

RUN addgroup -S appgroup \
  && adduser -S appuser -G appgroup

COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --chown=appuser:appgroup src ./src

USER appuser

EXPOSE 3000

CMD ["node", "src/server.js"]
