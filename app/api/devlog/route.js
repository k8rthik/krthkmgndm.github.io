import crypto from "crypto";
import { normalizeEntry } from "../../../lib/devlogSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = "devlog.json";

// --- helpers ---------------------------------------------------------------

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  // Compare hashes so length differences don't leak and lengths always match.
  const ah = crypto.createHash("sha256").update(ab).digest();
  const bh = crypto.createHash("sha256").update(bb).digest();
  return crypto.timingSafeEqual(ah, bh);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function config() {
  const password = process.env.DEVLOG_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "k8rthik/krthkmgndm.github.io";
  const branch = process.env.GITHUB_BRANCH || "main";
  return { password, token, repo, branch };
}

function newId(date) {
  const compact = date.replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6);
  return `${compact}-${rand}`;
}

async function gh(path, token, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "krthkmgndm-devlog",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  return res;
}

// Read current devlog.json from the repo. Returns { entries, sha }.
async function readStore({ token, repo, branch }) {
  const res = await gh(
    `/repos/${repo}/contents/${FILE}?ref=${encodeURIComponent(branch)}`,
    token
  );
  if (res.status === 404) return { entries: [], sha: null };
  if (!res.ok) {
    throw new Error(`github read failed (${res.status})`);
  }
  const data = await res.json();
  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  let entries = [];
  try {
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    entries = [];
  }
  return { entries, sha: data.sha };
}

// Commit the new entries array back to the repo.
async function writeStore({ token, repo, branch }, entries, sha, message) {
  const content = Buffer.from(
    JSON.stringify(entries, null, 2) + "\n",
    "utf-8"
  ).toString("base64");

  const res = await gh(`/repos/${repo}/contents/${FILE}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`github write failed (${res.status}) ${detail}`.trim());
  }
  return res.json();
}

// --- handler ---------------------------------------------------------------

export async function POST(request) {
  const cfg = config();

  if (!cfg.password) {
    return json({ error: "editing is not configured on the server" }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const { password, action } = payload || {};
  if (!password || !timingSafeEqual(password, cfg.password)) {
    return json({ error: "wrong password" }, 401);
  }

  // Password is valid past this point.
  if (action === "verify") {
    return json({ ok: true });
  }

  if (!cfg.token) {
    return json(
      { error: "GITHUB_TOKEN is not set; cannot persist edits" },
      503
    );
  }

  try {
    if (action === "add") {
      const check = normalizeEntry(payload.entry);
      if (!check.ok) return json({ error: check.error }, 400);

      const { entries, sha } = await readStore(cfg);
      const entry = { id: newId(check.entry.date), ...check.entry };
      const next = [entry, ...entries];
      await writeStore(cfg, next, sha, `devlog: ${check.entry.date}`);
      return json({ ok: true, entry });
    }

    if (action === "delete") {
      const id = String(payload.id || "");
      if (!id) return json({ error: "missing id" }, 400);

      const { entries, sha } = await readStore(cfg);
      const next = entries.filter((e) => String(e.id) !== id);
      if (next.length === entries.length) {
        return json({ error: "entry not found" }, 404);
      }
      await writeStore(cfg, next, sha, `devlog: remove ${id}`);
      return json({ ok: true, id });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    return json({ error: err.message || "commit failed" }, 502);
  }
}
