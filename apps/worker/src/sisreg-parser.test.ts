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

  it('não confunde o código do procedimento com o código da convocação', () => {
    const result = parseSisregLines(
      [
        'SISREG',
        '658150259 Unidade Solicitante: Data/Hora: 2 5 /0 3 /2 0 2 6 - 15:00',
        'Procedimento(s): 01 - T O M O G RA FI A P O R E M I SSÃ O D E P Ó SI T RO N S (P E T-C T ) (0206010095) Paciente: A D RI A N A CNS: 700004773534 Nascimento: 24/12/1973 Telefone(s): (66) 99202-7503',
        '658855556 Unidade Solicitante: Data/Hora: 3 0 /0 3 /2 0 2 6 - 15:00',
        'Procedimento(s): PET-CT (0206010095) Paciente: M A RI A CNS: 700004773535 Nascimento: 01/01/1960 Telefone(s): (65) 99999-9999',
      ],
      1,
    );
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0]?.codigoConvocacaoOrigem, '658150259');
    assert.equal(result.rows[0]?.dataNascimento, '24/12/1973');
    assert.deepEqual(result.rows[0]?.telefones, ['(66)99202-7503']);
    assert.equal(result.rows[0]?.procedimentos[0], 'TOMOGRAFIA POR EMISSÃO DE PÓSITRONS (PET-CT)');
  });
});
