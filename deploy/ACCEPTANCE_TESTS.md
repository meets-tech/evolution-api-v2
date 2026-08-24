# Evolution API — Acceptance Test Plan

This document is the release gate for the Meets Evolution provider and gateway
integration. Run the applicable section after every environment deployment and
attach the result to the change or release record.

## Scope and promotion flow

| Branch | Environment | Image tag | Ownership |
| --- | --- | --- | --- |
| `develop` | DEV | `dev` | Disabled: one provider only |
| `homolog` | HLG | `hlg` | Enabled: two providers |
| `main` | Production | `stable` | Enabled: two providers |

Promotion is allowed only after the prior environment has passed its required
acceptance checks. Production deployment requires explicit approval after HLG
validation.

## Preconditions

- [ ] The target image tag exists in the container registry.
- [ ] The environment Secret exists and contains no placeholder values.
- [ ] The database migration was executed with the target environment
  credentials.
- [ ] Redis is reachable with the environment-specific key prefix.
- [ ] The gateway is reachable through its expected public URL.
- [ ] No Evolution provider has a public Ingress; the gateway is the public
  integration endpoint.
- [ ] A dedicated test WhatsApp account is available for the environment.

## Infrastructure acceptance

### DEV

- [ ] Exactly one Evolution provider is running.
- [ ] `EVOLUTION_OWNERSHIP_ENABLED=false`.
- [ ] The provider has a ClusterIP Service only.
- [ ] The provider has no HPA, LoadBalancer or dedicated persistent volume.
- [ ] The provider uses the existing approved MySQL and Redis services, with
  `evolution:dev` Redis key prefix and the `evolution_dev` database client.
- [ ] Requests and limits match `chart/values-dev.yaml`.
- [ ] Scheduling uses existing approved capacity; no node pool is created for
  this deployment.

### HLG and production

- [ ] Two providers are running, one for each release suffix (`-a` and `-b`).
- [ ] Both providers use the same environment database and Redis prefix only.
- [ ] `EVOLUTION_OWNERSHIP_ENABLED=true`.
- [ ] Lease TTL is 90 seconds and renewal interval is 30 seconds.
- [ ] Provider Services are internal only.
- [ ] Resource requests, limits and replica count match the target values file.

## Gateway and webhook acceptance

| Environment | Gateway URL | Webhook endpoint |
| --- | --- | --- |
| DEV | `https://whatsapp-evolution.crmdev.com.br` | `/api/webhooks/evolution` |
| HLG | `https://whatsapp-evolution-hlg.meets.com.br` | `/api/webhooks/evolution` |
| Production | `https://whatsapp-evolution.meets.com.br` | `/api/webhooks/evolution` |

- [ ] The gateway health endpoint returns success through HTTPS.
- [ ] The provider can reach the gateway webhook endpoint.
- [ ] A webhook without the `jwt_key` header is rejected.
- [ ] A webhook with an invalid `jwt_key` is rejected.
- [ ] A valid event is accepted and is processed only once.
- [ ] Webhook secrets are unique per environment and are not logged.
- [ ] The browser/CRM communicates with the gateway, never directly with the
  Evolution provider.

## Functional acceptance

Run each case with the test WhatsApp account and retain the conversation ID,
provider log correlation ID and gateway response as evidence.

- [ ] Create an instance and obtain a QR code or pairing code.
- [ ] Connect the account and confirm the `open` connection state.
- [ ] Send and receive a plain text message.
- [ ] Send and receive image, document, video and audio/voice messages.
- [ ] Send a button and list message; validate configured fallback behavior.
- [ ] Edit and delete a sent message where the provider supports it.
- [ ] Transfer a conversation to a team/responsible user and verify the bot is
  stopped.
- [ ] Return a finished conversation to the chatbot and verify
  `bot_finalizado=false`, no responsible user and no Typebot session.
- [ ] Reconnect the instance and confirm no duplicate conversation or webhook
  event is created.
- [ ] Restart the provider and confirm the expected session behavior for the
  environment.

## Ownership and failover acceptance (HLG only)

- [ ] Create and connect an instance while both providers are healthy.
- [ ] Confirm exactly one provider owns the instance lease in Redis.
- [ ] Stop the owning provider.
- [ ] Confirm the second provider acquires the lease after the TTL and restores
  the connection without creating a second active session.
- [ ] Restore the first provider and confirm it does not steal a valid lease.
- [ ] Repeat the text-message and webhook tests after failover.

## Cost and operational acceptance

- [ ] No new Kubernetes node pool, LoadBalancer, HPA or provider Ingress was
  created for DEV.
- [ ] Database and Redis are shared approved services with environment-specific
  credentials and prefixes; no duplicate managed database was provisioned.
- [ ] OCI CPU, memory and storage metrics were reviewed after deployment.
- [ ] The environment does not exceed its approved request/limit baseline.
- [ ] Logs are at the configured level and do not contain secrets, QR payloads
  or message media.

## Evidence and release decision

Record the following before approving promotion:

```text
Environment:
Image digest:
Gateway version/commit:
Provider version/commit:
Test WhatsApp account:
Date and operator:
Functional tests: PASS | FAIL
Webhook tests: PASS | FAIL
Ownership/failover (HLG only): PASS | FAIL | N/A
Cost review: PASS | FAIL
Known risks:
Approval for next environment:
```

Any failed required item blocks promotion until it is corrected and retested.
