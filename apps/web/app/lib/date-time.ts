export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? 'America/Sao_Paulo';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE,
});

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

export function toDateTimeLocalValue(value: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(value)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function dateTimeLocalToIso(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return new Date(value).toISOString();
  const [, year, month, day, hour, minute] = match.map(Number);
  const target = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  let candidate = new Date(target);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(candidate)
        .filter(({ type }) => type !== 'literal')
        .map(({ type, value: part }) => [type, Number(part)]),
    );
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    candidate = new Date(candidate.getTime() + target - represented);
  }
  return candidate.toISOString();
}
