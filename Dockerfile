# syntax=docker/dockerfile:1.7
ARG BUN_IMAGE=oven/bun:1-alpine

FROM ${BUN_IMAGE} AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers git

COPY package.json bun.lock* ./
RUN bun install

COPY . ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build:bun

FROM ${BUN_IMAGE} AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="9router" \
      org.opencontainers.image.runtime="bun"

ENV NODE_ENV=production
ENV PORT=20128
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/app/data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/custom-server.js ./custom-server.js
COPY --from=builder /app/open-sse ./open-sse
COPY --from=builder /app/src/mitm ./src/mitm
COPY --from=builder /app/node_modules/node-forge ./node_modules/node-forge
COPY --from=builder /app/node_modules/next ./node_modules/next
COPY --from=builder /app/node_modules/node-machine-id ./node_modules/node-machine-id

RUN mkdir -p /app/data && chown -R bun:bun /app && \
    mkdir -p /app/data-home && chown -R bun:bun /app/data-home && \
    ln -sf /app/data-home /root/.9router 2>/dev/null || true

RUN apk add --no-cache su-exec && \
    printf '#!/bin/sh\nchown -R bun:bun /app/data /app/data-home 2>/dev/null\nexec su-exec bun "$@"\n' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 20128

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "custom-server.js"]
