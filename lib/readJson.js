import fs from "fs";
import path from "path";

// Read a committed JSON payload and check its shape, failing the build with
// a message that names the file and says how to regenerate it.
//   requiredKeys: top-level keys that must be present
//   nonEmpty:     keys that must hold a non-empty array
//   hint:         how to regenerate the file, appended when it is missing
export function readJsonFile(relPath, { requiredKeys = [], nonEmpty = [], hint } = {}) {
  const file = path.resolve(process.cwd(), relPath);
  const name = path.basename(file);

  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (err) {
    throw new Error(`missing ${name}${hint ? ` — ${hint}` : ""} (${err.message})`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${name} is not valid JSON (${err.message})`);
  }

  const missing = requiredKeys.filter((key) => !(key in data));
  if (missing.length > 0) {
    throw new Error(`${name} is missing keys: ${missing.join(", ")}`);
  }
  for (const key of nonEmpty) {
    if (!Array.isArray(data[key]) || data[key].length === 0) {
      throw new Error(`${name} has no ${key}`);
    }
  }
  return data;
}
