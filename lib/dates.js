// Date helpers shared by server and client components. No node imports.

// Date-only strings ("2026-07-10") are parsed as UTC midnight by `new Date`,
// which renders as the previous day in western timezones. Parse them as a
// local calendar date instead; anything with a time component passes through.
export function parseLocalDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

// "2026-08-03" -> "Aug 3, 2026". The locale is pinned so the static build
// and the browser render the same string.
export function formatPostDate(iso) {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "5m ago" / "3h ago" / "2d ago", flooring, never below 1m
export function formatRelative(iso, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MINUTE))}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

// a Date's local calendar day as YYYY-MM-DD
export function toISODate(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// 2026-07-16 -> 2026.07.16 (commit-log feel, no locale surprises)
export function dottedDate(iso) {
  return typeof iso === "string" ? iso.replace(/-/g, ".") : iso;
}
