import type { ConvocationStage } from '@confirma/database';

export function nextResponseDeadline(sentAt: Date, stage: ConvocationStage, campaign: {
  secondIntervalDays: number | null;
  secondStartTime: string | null;
  thirdIntervalDays: number | null;
  thirdStartTime: string | null;
  finalResponseWindowDays?: number | null;
}): { stage: ConvocationStage; at: Date } | null {
  if (stage === 'FIRST') {
    return { stage: 'SECOND', at: atConfiguredTime(sentAt, campaign.secondIntervalDays ?? 2, campaign.secondStartTime ?? '09:00') };
  }
  if (stage === 'SECOND') {
    return { stage: 'THIRD', at: atConfiguredTime(sentAt, campaign.thirdIntervalDays ?? 3, campaign.thirdStartTime ?? '09:00') };
  }
  if (stage === 'THIRD') {
    const days = Number(
      campaign.finalResponseWindowDays ?? process.env.FINAL_RESPONSE_WINDOW_DAYS ?? 1,
    );
    return { stage: 'FINISHED', at: new Date(sentAt.valueOf() + Math.max(1, days) * 86_400_000) };
  }
  return null;
}

function atConfiguredTime(from: Date, days: number, time: string): Date {
  const [hour = '09', minute = '00'] = time.split(':');
  const target = new Date(from);
  // Zero-day intervals are supported for controlled testing and mean
  // "later on the same calendar day" at the configured time.
  target.setDate(target.getDate() + Math.max(0, days));
  target.setHours(Number(hour), Number(minute), 0, 0);
  return target;
}
