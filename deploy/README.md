# Meets deployment

This chart deploys one internal Evolution provider. It creates only a
`Deployment` and a `ClusterIP` Service. PostgreSQL, MySQL, Redis, volumes,
Ingress, HPA, namespaces and Secrets are intentionally external resources.

## Prerequisites

For each environment, Infrastructure must provision a dedicated MySQL database
and user, and grant the existing Redis service access to the `evolution:<env>`
key prefix. Create the Kubernetes Secret from the approved secret manager; do
not commit its values.

The Secret must contain these keys:

```text
AUTHENTICATION_API_KEY
DATABASE_CONNECTION_URI
CACHE_REDIS_URI
```

For example, after loading the values into a protected local file:

```bash
kubectl -n dev create secret generic evolution-api-dev-secrets \
  --from-env-file=/secure/path/evolution-dev.env
```

The database URI must select MySQL and the environment database, for example
`mysql://<user>:<password>@<host>:3306/evolution_dev`.

## Deploy

```bash
helm upgrade --install evolution-api-dev chart/ \
  --namespace dev \
  --values chart/values-dev.yaml \
  --wait --timeout 10m
```

Use `values-hlg.yaml` in namespace `hlg` and `values-prod.yaml` in namespace
`prod`. The public gateway remains a separate service; this provider has no
Ingress and is reached through its internal Kubernetes Service.

Before the first rollout in an environment, run the Prisma migration using the
same Secret-backed variables and then validate QR, reconnect, text, media and
webhook delivery with one WhatsApp account.
