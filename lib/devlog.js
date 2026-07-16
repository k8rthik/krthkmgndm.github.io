import fs from "fs";
import path from "path";

export const DEVLOG_PATH = path.join(process.cwd(), "devlog.json");

// Read the devlog store from disk. Returns entries sorted newest-first,
// like a git log. Missing/corrupt file degrades to an empty log rather
// than throwing at build time.
export function getDevlog() {
  let raw;
  try {
    raw = fs.readFileSync(DEVLOG_PATH, "utf-8");
  } catch {
    return [];
  }

  let entries;
  try {
    entries = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(entries)) return [];

  return entries
    .filter((e) => e && typeof e === "object" && e.date)
    .sort((a, b) => {
      // newest date first; fall back to id so same-day entries stay stable
      const byDate = new Date(b.date) - new Date(a.date);
      if (byDate !== 0) return byDate;
      return String(b.id).localeCompare(String(a.id));
    });
}
