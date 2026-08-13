export type MessageStage = 'FIRST' | 'SECOND' | 'THIRD';

export interface WhatsAppTemplate {
  name: string;
  idEnvironmentVariable: string;
  defaultId: string;
}

export const WHATSAPP_TEMPLATES: Record<MessageStage, WhatsAppTemplate> = {
  FIRST: {
    name: 'primeira_convocacao_sus_unico',
    idEnvironmentVariable: 'GUPSHUP_TEMPLATE_FIRST_ID',
    defaultId: 'dc67c2dc-3102-445d-ba77-7662243a2e42',
  },
  SECOND: {
    name: 'segunda_convocacao_sus',
    idEnvironmentVariable: 'GUPSHUP_TEMPLATE_SECOND_ID',
    defaultId: 'ec210fc3-744a-4d6a-ad00-14304e9858c1',
  },
  THIRD: {
    name: 'terceira_convocacao_sus',
    idEnvironmentVariable: 'GUPSHUP_TEMPLATE_THIRD_ID',
    defaultId: '0598c34a-dca7-4ae9-b1a6-10defc9bcd89',
  },
};

export function templateForStage(stage: MessageStage): WhatsAppTemplate {
  return WHATSAPP_TEMPLATES[stage];
}

