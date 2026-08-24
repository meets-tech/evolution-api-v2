# Evolution API — desenvolvimento no Kubernetes

Este diretório provisiona uma Evolution isolada no namespace `dev`, com
PostgreSQL, Redis e sessões WhatsApp persistentes. A API não recebe Ingress:
somente o gateway `meets-whatsapp-evolution-dev` pode acessá-la pelo serviço
interno `http://evolution-api-dev.dev.svc.cluster.local:8080`.

O gateway é o único endpoint público e configura os webhooks por instância em
`https://whatsapp-evolution.crmdev.com.br/api/webhooks/evolution`.

## Segredos

Copie `secrets.example.env` para um arquivo fora do Git, gere senhas fortes e
crie o Secret antes de aplicar os manifests:

```bash
kubectl -n dev create secret generic evolution-dev-secrets \
  --from-env-file=/caminho/seguro/evolution-dev-secrets.env
```

`DATABASE_CONNECTION_URI` e `CACHE_REDIS_URI` devem usar as mesmas credenciais
definidas para PostgreSQL e Redis.

## Aplicação

```bash
kubectl apply -k deploy/kubernetes/dev
kubectl -n dev rollout status deployment/evolution-postgres-dev
kubectl -n dev rollout status deployment/evolution-redis-dev
kubectl -n dev rollout status deployment/evolution-api-dev
```

Use a imagem `evoapicloud/evolution-api:dev`, publicada pela branch `develop`.
Não habilite ownership nem aumente réplicas da Evolution no DEV enquanto não
existirem dois nós e Redis HA com o teste de failover aprovado.

## Perfil de custo

O ambiente é deliberadamente enxuto: uma réplica de cada serviço, sem HPA nem
Ingress da Evolution, com volumes de 5 GiB (sessões), 5 GiB (PostgreSQL) e 1
GiB (Redis). Aumentos de armazenamento, CPU, memória ou réplicas devem ser
precedidos por métricas de uso e uma necessidade validada; DEV não deve
reproduzir o perfil de capacidade de homologação ou produção.
