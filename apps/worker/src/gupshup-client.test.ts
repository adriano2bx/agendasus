import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { GupshupRequestError, sendGupshupText } from './gupshup-client.js';

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  GUPSHUP_API_KEY: process.env.GUPSHUP_API_KEY,
  GUPSHUP_SOURCE: process.env.GUPSHUP_SOURCE,
  GUPSHUP_APP_NAME: process.env.GUPSHUP_APP_NAME,
  GUPSHUP_SESSION_MESSAGE_URL: process.env.GUPSHUP_SESSION_MESSAGE_URL,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('cliente Gupshup para mensagem de sessão', () => {
  it('envia texto no formato form-urlencoded esperado pela Gupshup', async () => {
    process.env.GUPSHUP_API_KEY = 'chave-de-teste';
    process.env.GUPSHUP_SOURCE = '+1 (555) 961-8824';
    process.env.GUPSHUP_APP_NAME = 'DoctorbotConfirma';
    process.env.GUPSHUP_SESSION_MESSAGE_URL = 'https://gupshup.example/msg';
    let request: { url: string; init: RequestInit | undefined } | undefined;
    globalThis.fetch = async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify({ status: 'submitted', messageId: 'provider-123' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await sendGupshupText({
      destination: '+55 (12) 97412-1245',
      text: 'Recebemos sua confirmação.',
    });

    assert.equal(result.providerMessageId, 'provider-123');
    assert.equal(request?.url, 'https://gupshup.example/msg');
    const body = request?.init?.body as URLSearchParams;
    assert.equal(body.get('source'), '15559618824');
    assert.equal(body.get('destination'), '5512974121245');
    assert.deepEqual(JSON.parse(body.get('message') ?? ''), {
      type: 'text',
      text: 'Recebemos sua confirmação.',
      previewUrl: false,
    });
  });

  it('classifica indisponibilidade do provedor como falha temporária', async () => {
    process.env.GUPSHUP_API_KEY = 'chave-de-teste';
    process.env.GUPSHUP_SOURCE = '15559618824';
    process.env.GUPSHUP_APP_NAME = 'DoctorbotConfirma';
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: 'error', message: 'indisponível' }), { status: 503 });

    await assert.rejects(
      () => sendGupshupText({ destination: '5512974121245', text: 'Teste' }),
      (error: unknown) =>
        error instanceof GupshupRequestError && error.code === 'HTTP_503' && error.retryable,
    );
  });
});
