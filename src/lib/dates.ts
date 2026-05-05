export function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysAgoKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateKey(date);
}

export function friendlyDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
