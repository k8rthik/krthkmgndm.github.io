// The devlog's persistent store: devlog.json in the GitHub repo, read and
// committed through the contents API. Used only by app/api/devlog/route.js.

const FILE = "devlog.json";

async function gh(path, token, init = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "krthkmgndm-devlog",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
}

// Decode the contents-API payload into an entries array. Throws on anything
// that isn't a JSON array: reading a corrupt file as [] would make the next
// write commit a log holding only the new entry, wiping every earlier one.
export function decodeStore(base64) {
  const text = Buffer.from(base64, "base64").toString("utf-8");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${FILE} is not valid JSON; refusing to overwrite it`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${FILE} is not an array; refusing to overwrite it`);
  }
  return parsed;
}

// Read the current store. Returns { entries, sha }; a missing file is empty.
export async function readStore({ token, repo, branch }) {
  const res = await gh(
    `/repos/${repo}/contents/${FILE}?ref=${encodeURIComponent(branch)}`,
    token,
  );
  if (res.status === 404) return { entries: [], sha: null };
  if (!res.ok) throw new Error(`github read failed (${res.status})`);
  const data = await res.json();
  return { entries: decodeStore(data.content), sha: data.sha };
}

// Commit a new entries array. GitHub's error body is logged server-side
// only; the thrown message is safe to return to the client.
export async function writeStore({ token, repo, branch }, entries, sha, message) {
  const content = Buffer.from(
    JSON.stringify(entries, null, 2) + "\n",
    "utf-8",
  ).toString("base64");

  const res = await gh(`/repos/${repo}/contents/${FILE}`, token, {
    method: "PUT",
    body: JSON.stringify({ message, content, branch, ...(sha ? { sha } : {}) }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`devlog: github write failed (${res.status})`, detail);
    throw new Error(`github write failed (${res.status})`);
  }
  return res.json();
}
