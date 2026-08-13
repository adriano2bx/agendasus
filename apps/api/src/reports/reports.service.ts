import { Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
@Injectable()
export class ReportsService {
  async dispatchesCsv(campaignId?: string) {
    const rows = await prisma.convocation.findMany({ where: campaignId ? { campaignId } : {}, include: { patient: { include: { phones: { where: { selectedForWhatsApp: true }, take: 1 } } }, campaign: true, messages: true, responses: true } });
    return csv(['Campanha', 'Paciente', 'Telefone', 'Etapa', 'Status', 'Próxima ação', 'Mensagens', 'Resposta'], rows.map(row => [row.campaign.name, row.patient.displayName, row.patient.phones[0]?.normalizedValue ?? '', row.stage, row.status, row.nextActionAt?.toISOString() ?? '', row.messages.length, row.responses.at(-1)?.action ?? '']));
  }
  async financialCsv(campaignId?: string) {
    const rows = await prisma.billingEvent.findMany({ where: campaignId ? { message: { convocation: { campaignId } } } : {}, include: { message: { include: { convocation: { include: { campaign: true, patient: true } } } } }, orderBy: { billingAt: 'desc' } });
    return csv(['Campanha', 'Paciente', 'Mensagem', 'Categoria', 'Cobrável', 'Custo', 'Moeda', 'Data'], rows.map(row => [row.message.convocation.campaign.name, row.message.convocation.patient.displayName, row.message.id, row.category ?? '', row.billable, row.cost?.toString() ?? '', row.currency ?? '', row.billingAt.toISOString()]));
  }
}
function csv(headers: string[], rows: unknown[][]) { return `\uFEFF${[headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}\n`; }

