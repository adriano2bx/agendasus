import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextResponseDeadline } from './follow-up-schedule.js';

describe('follow-ups', () => {
  const campaign = { secondIntervalDays: 2, secondStartTime: '09:00', thirdIntervalDays: 3, thirdStartTime: '14:30' };

  it('agenda segunda e terceira tentativa conforme a campanha', () => {
    const sentAt = new Date('2026-08-13T12:00:00.000Z');
    const second = nextResponseDeadline(sentAt, 'FIRST', campaign);
    const third = nextResponseDeadline(sentAt, 'SECOND', campaign);
    assert.equal(second?.stage, 'SECOND');
    assert.equal(second?.at.toISOString(), '2026-08-15T12:00:00.000Z');
    assert.equal(third?.stage, 'THIRD');
    assert.equal(third?.at.toISOString(), '2026-08-16T17:30:00.000Z');
  });

  it('cria a janela de resposta final após terceira tentativa', () => {
    const sentAt = new Date('2026-08-13T12:00:00.000Z');
    const final = nextResponseDeadline(sentAt, 'THIRD', campaign);
    assert.equal(final?.stage, 'FINISHED');
    assert.equal(final?.at.toISOString(), '2026-08-14T12:00:00.000Z');
  });

  it('permite segunda e terceira tentativa no mesmo dia', () => {
    const sameDay = {
      secondIntervalDays: 0,
      secondStartTime: '14:00',
      thirdIntervalDays: 0,
      thirdStartTime: '16:00',
    };
    const sentAt = new Date('2026-08-13T10:00:00.000Z');
    assert.equal(nextResponseDeadline(sentAt, 'FIRST', sameDay)?.at.toISOString(), '2026-08-13T17:00:00.000Z');
    assert.equal(nextResponseDeadline(sentAt, 'SECOND', sameDay)?.at.toISOString(), '2026-08-13T19:00:00.000Z');
  });
});
