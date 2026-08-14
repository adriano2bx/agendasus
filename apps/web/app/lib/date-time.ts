export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? 'America/Cuiaba';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE,
});

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);
}
