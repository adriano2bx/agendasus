const statusLabels: Record<string, string> = {
  UPLOADED: 'Arquivo recebido',
  PROCESSING: 'Em processamento',
  REVIEW_REQUIRED: 'Revisão necessária',
  READY_FOR_REVIEW: 'Pronta para conferência',
  APPROVED: 'Aprovada',
  FAILED: 'Falha',
  VALID: 'Válido',
  WARNING: 'Requer atenção',
  INVALID: 'Inválido',
  DRAFT: 'Rascunho',
  SCHEDULED: 'Programada',
  RUNNING: 'Em andamento',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  QUEUED: 'Na fila',
  SUBMITTED: 'Aceita pelo provedor',
  SENT: 'Enviada',
  DELIVERED: 'Entregue',
  READ: 'Lida',
  WAITING_RESPONSE: 'Aguardando resposta',
  CONFIRMED: 'Confirmada',
  SEND_ERROR: 'Falha no envio',
  FINISHED_NO_RESPONSE: 'Finalizada sem resposta',
  PENDING: 'Pendente',
  PROCESSED: 'Processado',
  IGNORED: 'Ignorado',
};

const stageLabels: Record<string, string> = {
  FIRST: '1ª convocação',
  SECOND: '2ª convocação',
  THIRD: '3ª convocação',
  FINISHED: 'Fluxo finalizado',
};

export function statusLabel(value: string): string {
  return statusLabels[value] ?? 'Situação não identificada';
}

export function stageLabel(value: string): string {
  return stageLabels[value] ?? 'Etapa não identificada';
}

export function templateLabel(stage: string): string {
  return `${stageLabel(stage)} — mensagem oficial`;
}
