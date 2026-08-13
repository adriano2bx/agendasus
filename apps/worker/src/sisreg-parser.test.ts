import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSisregLines, rebuildLines } from './sisreg-parser.js';

describe('parser SISREG', () => {
  it('reconstrói linhas por página, posição vertical e horizontal', () => {
    assert.deepEqual(
      rebuildLines([
        { text: 'Silva', x: 100, y: 700, page: 1 },
        { text: 'Maria', x: 20, y: 701, page: 1 },
        { text: 'Página 1', x: 20, y: 50, page: 1 },
      ]),
      ['Maria Silva', 'Página 1'],
    );
  });

  it('detecta paginação incompleta e mantém registro para revisão', () => {
    const result = parseSisregLines(
      [
        'SISREG - Sistema Nacional de Regulação',
        'Página 1 de 5 Total: 204',
        '658150259 ADELINO LUIZ GOMES 21/02/1966 (66) 98448-7780 25/03/2026 15:00 Procedimento: PET-CT',
      ],
      1,
    );

    assert.equal(result.layout, 'SISREG_V1');
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]?.codigoConvocacaoOrigem, '658150259');
    assert.ok(result.warnings.some((warning) => warning.includes('5 páginas')));
  });
});

