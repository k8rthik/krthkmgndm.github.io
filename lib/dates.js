// Date-only strings ("2026-07-10") are parsed as UTC midnight by `new Date`,
// which renders as the previous day in western timezones. Parse them as a
// local calendar date instead; anything with a time component passes through.
export function parseLocalDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}
