import type { MessageStage } from '@confirma/domain';

interface GupshupSuccessResponse {
  status?: string;
  messageId?: string;
  message?: string;
}

export class GupshupRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export async function sendGupshupTemplate(input: {
  destination: string;
  stage: MessageStage;
  templateId: string;
  patientName: string;
}): Promise<{ providerMessageId: string }> {
  const apiKey = required('GUPSHUP_API_KEY');
  const source = required('GUPSHUP_SOURCE').replace(/\D/g, '');
  const appName = required('GUPSHUP_APP_NAME');
  const endpoint = process.env.GUPSHUP_API_URL ?? 'https://api.gupshup.io/wa/api/v1/template/msg';
  const destination = input.destination.replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(source) || !/^\d{8,15}$/.test(destination)) {
    throw new GupshupRequestError('Número de origem ou destino inválido.', 'INVALID_PHONE', false);
  }

  const payload = new URLSearchParams({
    channel: 'whatsapp',
    source,
    destination,
    'src.name': appName,
    template: JSON.stringify({ id: input.templateId, params: [input.patientName] }),
  });
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: apiKey, 'content-type': 'application/x-www-form-urlencoded' },
      body: payload,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new GupshupRequestError('Não foi possível conectar ao provedor.', 'NETWORK_ERROR', true);
  }

  const body = (await response.json().catch(() => ({}))) as GupshupSuccessResponse;
  if (!response.ok || body.status === 'error') {
    throw new GupshupRequestError(
      typeof body.message === 'string' ? body.message.slice(0, 300) : 'O provedor recusou o envio.',
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429,
    );
  }
  if (!body.messageId) {
    throw new GupshupRequestError('Resposta do provedor sem identificador da mensagem.', 'MALFORMED_RESPONSE', true);
  }
  return { providerMessageId: body.messageId };
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new GupshupRequestError(`Configuração obrigatória ausente: ${name}.`, 'CONFIGURATION_ERROR', false);
  return value;
}

