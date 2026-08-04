# Meets Evolution API — homologation

Isolated homologation stack for the Meets fork of Evolution API `2.3.7`. It
builds this repository and includes dedicated PostgreSQL and Redis services,
persistent WhatsApp sessions, and automatic HTTPS through Caddy.

Only ports 80/443 are public. Evolution port 8080, PostgreSQL, and Redis remain
inside the private Compose network.

## Requirements

- `EVOLUTION_DOMAIN` DNS record pointing to the server;
- TCP 80/443 and UDP 443 available;
- Docker Engine with Compose v2.

## Configuration

```bash
cd deploy/homolog
cp .env.example .env
openssl rand -hex 32
openssl rand -hex 24
```

Use different generated values for `EVOLUTION_API_KEY`, `POSTGRES_PASSWORD`, and
`REDIS_PASSWORD`. Keep internal passwords alphanumeric so the database and Redis
connection URIs do not require URL encoding. Never commit `.env`.

Configure the Meets middleware with the same API key:

```env
EVOLUTION_BASE_URL=https://YOUR_EVOLUTION_DOMAIN
EVOLUTION_API_KEY=SAME_EVOLUTION_API_KEY
PUBLIC_BASE_URL=https://YOUR_MIDDLEWARE_DOMAIN
```

The middleware registers an authenticated, instance-specific webhook at
`PUBLIC_BASE_URL/api/webhooks/evolution` when an integration is created.

## Deploy

```bash
docker compose config --quiet
docker compose build evolution-api
docker compose pull --ignore-buildable
docker compose up -d
docker compose ps
docker compose logs --tail=200 evolution-api
curl -fsS -H "apikey: $EVOLUTION_API_KEY" \
  "https://$EVOLUTION_DOMAIN/instance/fetchInstances"
```

Do not run `docker compose down -v` in homologation: it deletes the database,
certificates, Redis data, and WhatsApp sessions.
