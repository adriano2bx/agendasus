import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { automaticReplyDefinition, automaticReplyEnabled } from './automatic-reply.js';

const originalEnabled = process.env.AUTOMATIC_REPLY_ENABLED;
const originalConfirmText = process.env.AUTOMATIC_REPLY_CONFIRM_TEXT;

afterEach(() => {
  restore('AUTOMATIC_REPLY_ENABLED', originalEnabled);
  restore('AUTOMATIC_REPLY_CONFIRM_TEXT', originalConfirmText);
});

describe('respostas automáticas', () => {
  it('fica habilitada por padrão e pode ser desabilitada por variável de ambiente', () => {
    delete process.env.AUTOMATIC_REPLY_ENABLED;
    assert.equal(automaticReplyEnabled(), true);
    process.env.AUTOMATIC_REPLY_ENABLED = 'false';
    assert.equal(automaticReplyEnabled(), false);
  });

  it('usa texto configurável e identificadores diferentes por ação', () => {
    process.env.AUTOMATIC_REPLY_CONFIRM_TEXT = 'Confirmação recebida.';
    const confirmation = automaticReplyDefinition('CONFIRM');
    const cancellation = automaticReplyDefinition('CANCEL');
    assert.equal(confirmation.text, 'Confirmação recebida.');
    assert.equal(confirmation.attemptNumber, 4);
    assert.equal(cancellation.attemptNumber, 5);
    assert.notEqual(confirmation.templateName, cancellation.templateName);
  });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
