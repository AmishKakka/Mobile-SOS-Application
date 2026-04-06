# Stage 1: Build Environment
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Stage 2: Production Environment
FROM node:22-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app .

EXPOSE 3000

CMD ["node", "src/server.js"]
# CMD node scripts/seedFakeHelpers.js && timeout 3m node src/server.js
