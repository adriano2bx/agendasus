# Teste de carga

O repositório possui um teste de carga sem dependências externas em `tests/load/load-test.mjs`. Ele usa o `fetch` nativo do Node.js e mede:

- quantidade de requisições e erros;
- requisições por segundo;
- latência máxima e percentis P50, P95 e P99;
- resultados separados por endpoint.

O cenário envia eventos sintéticos para o webhook, consulta o painel e verifica o health check. Os eventos não chamam a Gupshup e não devem ser executados com `MESSAGING_MODE=LIVE` em produção.

## Execução local

Suba a aplicação com banco e Redis de homologação e mantenha o worker em `DRY_RUN`. Em outro terminal:

```bash
LOAD_TEST_BASE_URL=http://127.0.0.1:3001/api \
LOAD_TEST_DURATION_SECONDS=60 \
LOAD_TEST_CONCURRENCY=10 \
LOAD_TEST_EMAIL=usuario@exemplo.com.br \
LOAD_TEST_PASSWORD='senha-de-homologacao' \
pnpm load:test
```

O login é opcional. Sem `LOAD_TEST_EMAIL` e `LOAD_TEST_PASSWORD`, o teste executa apenas health check e ingestão do webhook. O processo retorna código diferente de zero se qualquer requisição falhar.

## Parâmetros

| Variável | Padrão | Uso |
|---|---:|---|
| `LOAD_TEST_BASE_URL` | `http://127.0.0.1:3001/api` | URL da API, incluindo `/api` |
| `LOAD_TEST_DURATION_SECONDS` | `60` | duração do teste |
| `LOAD_TEST_CONCURRENCY` | `10` | workers concorrentes |
| `LOAD_TEST_TIMEOUT_MS` | `10000` | timeout de cada requisição |
| `LOAD_TEST_WEBHOOK_MODE` | `unique` | `unique` cria eventos novos; `duplicate` mede idempotência com o mesmo evento |
| `LOAD_TEST_WEBHOOK_SECRET` | vazio | segredo do webhook, quando configurado |

Para um teste rápido de homologação:

```bash
LOAD_TEST_DURATION_SECONDS=15 LOAD_TEST_CONCURRENCY=5 pnpm load:test
```

## Ambientes externos

Por segurança, URLs que não sejam `localhost` ou `127.0.0.1` são bloqueadas. Para executar contra uma homologação autorizada, use explicitamente:

```bash
LOAD_TEST_BASE_URL=https://homolog.exemplo.com/api \
LOAD_TEST_ALLOW_EXTERNAL=true \
LOAD_TEST_CONFIRM=I_UNDERSTAND \
LOAD_TEST_DURATION_SECONDS=60 \
LOAD_TEST_CONCURRENCY=10 \
pnpm load:test
```

Não use a URL de produção sem janela de manutenção, monitoramento e aprovação. A carga grava eventos de webhook no PostgreSQL; execute preferencialmente em banco isolado. Eventos criados pelo teste usam identificadores com o prefixo `load-test-`, permitindo limpeza controlada no banco de homologação após a execução.

## Interpretação

Como referência inicial para homologação, compare execuções com 5, 10 e 25 workers. Observe especialmente P95/P99, taxa de erro, crescimento da fila BullMQ, uso de CPU/memória e conexões do PostgreSQL. O resultado não é um certificado de capacidade: os limites finais dependem do tamanho dos PDFs, volume de registros, configuração da VPS, Redis, PostgreSQL e limites da Gupshup.
