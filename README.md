# Confirma SUS

Monorepo do MVP de automação das convocações SUS por WhatsApp.

## Aplicações

- `apps/web`: painel administrativo em Next.js.
- `apps/api`: API HTTP em NestJS.
- `apps/worker`: processamento assíncrono e scheduler.
- `packages/database`: modelo e cliente Prisma.
- `packages/domain`: regras e tipos compartilhados.
- `packages/queue`: contratos e conexão BullMQ.

## Desenvolvimento local

1. Copie `.env.example` para `.env` e troque o `JWT_SECRET`.
2. Inicie PostgreSQL e Redis com `docker compose up -d postgres redis`.
3. Execute `pnpm install`.
4. Execute `pnpm db:generate` e `pnpm db:migrate`.
5. Execute `pnpm dev`.

## Fluxo disponível neste incremento

1. Faça login e envie um PDF.
2. O worker extrai os registros e elimina o PDF depois de persistir o resultado.
3. Abra a importação, revise alertas e registros inválidos e aprove os dados válidos.
4. Crie uma campanha em `DRAFT`; pacientes são agrupados por CPF ou por nome normalizado + nascimento.

Campanhas podem ser programadas e executadas por scheduler. O envio começa em `DRY_RUN`; somente o worker com `MESSAGING_MODE=LIVE` e secrets Gupshup configurados realiza disparos reais. O webhook está disponível em `/api/webhooks/gupshup`.

O PDF é temporário: o arquivo só deverá ser removido depois que seus dados forem
persistidos. O PostgreSQL é a fonte de verdade dos agendamentos; Redis/BullMQ serve
somente para execução assíncrona.

Para implantação no EasyPanel, consulte [o guia de produção](docs/easypanel.md).
