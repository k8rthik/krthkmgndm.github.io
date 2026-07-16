// Pure validators/normalizers shared by the client editor and the API route.
// No node-only imports here so this can be bundled for the browser.

export const MAX_BODY = 2000;

// YYYY-MM-DD
export function isValidDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

// Only allow http(s) or a repo-relative /devlog/... path. Blocks
// javascript:, data:, etc. Empty string = no image.
export function normalizeImage(image) {
  if (image == null) return "";
  const s = String(image).trim();
  if (s === "") return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return s;
  return null; // invalid
}

// Returns { ok: true, entry } or { ok: false, error }.
export function normalizeEntry(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "missing entry" };
  }

  const date = String(input.date || "").trim();
  if (!isValidDate(date)) {
    return { ok: false, error: "date must be YYYY-MM-DD" };
  }

  const body = String(input.body ?? "").trim();
  if (body === "") return { ok: false, error: "body is required" };
  if (body.length > MAX_BODY) {
    return { ok: false, error: `body must be <= ${MAX_BODY} chars` };
  }

  const image = normalizeImage(input.image);
  if (image === null) {
    return { ok: false, error: "image must be an http(s) url or /path" };
  }

  return { ok: true, entry: { date, body, image } };
}
