# Implantação no EasyPanel

Crie serviços separados a partir do mesmo repositório Git:

| Serviço | Dockerfile | Porta | Réplicas |
| --- | --- | ---: | ---: |
| `confirma-web` | `docker/Dockerfile.web` | 3000 | 1 |
| `confirma-api` | `docker/Dockerfile.api` | 3001 | 1 |
| `confirma-worker` | `docker/Dockerfile.worker` | — | 1 inicialmente |

Configure um serviço PostgreSQL e um Redis pelo catálogo do EasyPanel. Não exponha as portas desses serviços publicamente. Use os endereços internos que o EasyPanel fornecer em `DATABASE_URL` e `REDIS_URL`.

## Variáveis compartilhadas

Defina em `confirma-api` e `confirma-worker`:

```text
NODE_ENV=production
APP_TIMEZONE=America/Cuiaba
DATABASE_URL=<URL interna do PostgreSQL com ?schema=public>
REDIS_URL=<URL interna do Redis>
JWT_SECRET=<texto aleatório com no mínimo 32 caracteres>
UPLOAD_TEMP_DIR=/tmp/confirma-sus
GUPSHUP_SOURCE=15559618824
GUPSHUP_APP_NAME=DoctorbotConfirma
GUPSHUP_API_URL=https://api.gupshup.io/wa/api/v1/template/msg
GUPSHUP_TEMPLATE_FIRST_ID=dc67c2dc-3102-445d-ba77-7662243a2e42
GUPSHUP_TEMPLATE_SECOND_ID=ec210fc3-744a-4d6a-ad00-14304e9858c1
GUPSHUP_TEMPLATE_THIRD_ID=0598c34a-dca7-4ae9-b1a6-10defc9bcd89
```

Defina exclusivamente no `confirma-worker`:

```text
MESSAGING_MODE=DRY_RUN
GUPSHUP_API_KEY=<secret configurado no EasyPanel>
SCHEDULER_INTERVAL_MS=10000
MESSAGE_WORKER_CONCURRENCY=5
WEBHOOK_WORKER_CONCURRENCY=10
```

Defina exclusivamente no `confirma-web`:

```text
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api
```

Defina exclusivamente no `confirma-api`:

```text
API_PORT=3001
JWT_EXPIRES_IN=8h
```

## Ordem de publicação

1. Crie PostgreSQL e Redis.
2. Crie o serviço API e configure as variáveis, mas mantenha o worker desligado.
3. Em um terminal do serviço API, execute `pnpm db:deploy` uma vez para aplicar migrations.
4. Publique o web e aponte `NEXT_PUBLIC_API_URL` para o domínio público da API.
5. Publique o worker com `MESSAGING_MODE=DRY_RUN`.
6. Configure na Gupshup o callback público: `https://api.seu-dominio.com/api/webhooks/gupshup`.
7. Habilite `sent`, `delivered`, `read`, `failed` e mensagens recebidas na Gupshup.
8. Faça uma campanha de teste com `DRY_RUN` e confira banco, filas e painel.
9. Só depois altere o worker para `MESSAGING_MODE=LIVE` e faça um envio controlado.

## Segurança operacional

- `GUPSHUP_API_KEY` é secret, nunca variável de build, arquivo `.env` versionado ou configuração do frontend.
- Como a chave anterior foi compartilhada, rotacione-a no painel Gupshup antes da produção.
- Mantenha `DRY_RUN` até concluir a homologação do webhook.
- Ative HTTPS no domínio API antes de registrar o webhook.
- Faça backup externo recorrente do PostgreSQL antes do piloto.
