import fs from "fs";
import path from "path";
import { compareEntries } from "./devlogSchema.js";

const DEVLOG_PATH = path.join(process.cwd(), "devlog.json");

// Read the devlog store from disk, newest first like a git log. Deliberately
// lenient, unlike the other loaders: a missing or corrupt file renders an
// empty devlog rather than failing the whole homepage build.
export function getDevlog() {
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(DEVLOG_PATH, "utf-8"));
  } catch (err) {
    console.error(`devlog: could not read devlog.json (${err.message})`);
    return [];
  }
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((e) => e && typeof e === "object" && e.date)
    .toSorted(compareEntries);
}
