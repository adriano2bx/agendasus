#!/bin/sh

set -eu

export PORT="${WEB_PORT:-${PORT:-3000}}"
export API_PORT="${API_PORT:-3001}"
export HOSTNAME="${WEB_HOSTNAME:-0.0.0.0}"

mkdir -p "${UPLOAD_TEMP_DIR:-/tmp/confirma-sus}"

echo "Aplicando migrações do banco de dados..."
prisma_bin="./packages/database/node_modules/.bin/prisma"
if [ ! -x "$prisma_bin" ]; then
  echo "Erro: executável do Prisma não foi encontrado em $prisma_bin" >&2
  exit 1
fi
"$prisma_bin" migrate deploy --schema packages/database/prisma/schema.prisma

shutdown() {
  trap - TERM INT
  kill -TERM "$web_pid" "$api_pid" "$worker_pid" 2>/dev/null || true
  wait "$web_pid" "$api_pid" "$worker_pid" 2>/dev/null || true
}

trap shutdown TERM INT

echo "Iniciando API, worker e painel..."
node apps/api/dist/main.js &
api_pid=$!
node apps/worker/dist/main.js &
worker_pid=$!
node apps/web/server.js &
web_pid=$!

set +e
wait -n "$api_pid" "$worker_pid" "$web_pid"
status=$?
set -e

echo "Um dos processos foi encerrado; finalizando o container..."
shutdown
exit "$status"
