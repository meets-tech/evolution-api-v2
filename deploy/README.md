# Meets deployment

This chart deploys an internal Evolution provider node. It creates only a
`Deployment` and a `ClusterIP` Service. PostgreSQL, Redis, volumes,
Ingress, HPA, namespaces and Secrets are intentionally external resources.

## Prerequisites

For each environment, Infrastructure must provision a dedicated PostgreSQL
database and a dedicated Redis service for Evolution. Create the Kubernetes
Secret from the approved secret manager; do not commit its values.

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

The database URI must select PostgreSQL and the environment database, for
example `postgresql://<user>:<password>@<host>:5432/evolution_dev`.

## Deploy

```bash
helm upgrade --install evolution-api-dev chart/ \
  --namespace dev \
  --values chart/values-dev.yaml \
  --wait --timeout 10m
```

DEV uses one provider with ownership disabled. HLG and production use two
separate releases, each with its own stable Service identity:

```bash
helm upgrade --install evolution-api-hlg-a chart/ --namespace hlg \
  --values chart/values-hlg.yaml --values chart/values-hlg-a.yaml
helm upgrade --install evolution-api-hlg-b chart/ --namespace hlg \
  --values chart/values-hlg.yaml --values chart/values-hlg-b.yaml
```

The equivalent production files are `values-prod.yaml`, `values-prod-a.yaml`
and `values-prod-b.yaml`. They enable ownership with a 90-second lease renewed
every 30 seconds. Do not deploy the production pair until the HLG ownership
acceptance test has passed. The public gateway remains a separate service; this
provider has no Ingress and is reached through its internal Kubernetes Service.

Before the first rollout in an environment, run the Prisma migration using the
same Secret-backed variables and then validate QR, reconnect, text, media and
webhook delivery with one WhatsApp account.
