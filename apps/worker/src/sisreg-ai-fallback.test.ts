import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applySisregAiFallback } from './sisreg-ai-fallback.js';
import type { SisregParseResult } from './sisreg-parser.js';

const parsed: SisregParseResult = {
  layout: 'SISREG_V2',
  pageCount: 1,
  reportedPageCount: 1,
  totalReported: 1,
  warnings: [],
  rows: [
    {
      rowNumber: 1,
      rawText: 'Paciente: MARIA TESTE CNS: 700000000000000',
      codigoConvocacaoOrigem: '720000001',
      nome: null,
      dataNascimento: null,
      cpf: null,
      cns: null,
      telefones: [],
      dataHora: null,
      procedimentos: [],
      issues: ['Nome não identificado com segurança.', 'Telefone ausente.'],
    },
  ],
};

describe('fallback de IA do SISREG', () => {
  it('permanece desligado sem configuração explícita', async () => {
    const result = await applySisregAiFallback(parsed);
    assert.deepEqual(result, parsed);
  });

  it('valida e mescla somente a linha solicitada pela IA', async () => {
    const result = await applySisregAiFallback(parsed, {
      enabled: true,
      endpoint: 'https://ai.example.test/v1/chat/completions',
      apiKey: 'test-key',
      fetcher: async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    rows: [
                      { rowNumber: 1, nome: 'MARIA TESTE', telefones: ['(65) 99999-0000'] },
                      { rowNumber: 'invalid', nome: 'não deve entrar' },
                    ],
                  }),
                },
              },
            ],
          }),
        }) as Response,
    });

    assert.equal(result.rows[0]?.nome, 'MARIA TESTE');
    assert.deepEqual(result.rows[0]?.telefones, ['(65) 99999-0000']);
    assert.deepEqual(result.rows[0]?.issues, ['AI_FALLBACK_REVIEW']);
    assert.ok(result.warnings.some((warning) => warning.includes('Fallback de IA')));
  });
});
