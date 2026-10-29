FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VCS_REF
RUN printf '%s' "$VCS_REF" | grep -Eq '^[0-9a-f]{40}$' \
    && npm run build \
    && printf '{"revision":"%s"}\n' "$VCS_REF" > dist/release.json

FROM caddy:2.10.2-alpine
RUN apk add --no-cache jq
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/stats.jq deploy/sync-stats.sh deploy/refresh-stats.sh deploy/entrypoint.sh \
    /usr/local/lib/landing/
COPY --from=build /app/dist /srv
EXPOSE 8080
# Setting ENTRYPOINT clears the base image's CMD, so restate Caddy's.
ENTRYPOINT ["/usr/local/lib/landing/entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
    CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
