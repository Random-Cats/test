export function isoNow(): string {
  return new Date().toISOString();
}

export function yyyyMmDd(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function minuteBucket(d = new Date()): string {
  // YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
}
