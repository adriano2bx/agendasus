export type NormalizedResponseAction = 'CONFIRM' | 'CANCEL' | 'UNKNOWN';

const ACTION_BY_TEXT = new Map<string, NormalizedResponseAction>([
  ['confirmar', 'CONFIRM'],
  ['quero confirmar', 'CONFIRM'],
  ['vou confirmar', 'CONFIRM'],
  ['cancelar', 'CANCEL'],
  ['quero cancelar', 'CANCEL'],
  ['vou cancelar', 'CANCEL'],
]);

export function normalizeButtonAction(text: string): NormalizedResponseAction {
  const normalized = text.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  return ACTION_BY_TEXT.get(normalized) ?? 'UNKNOWN';
}

