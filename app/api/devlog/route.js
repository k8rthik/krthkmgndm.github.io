import crypto from "crypto";
import { normalizeEntry } from "../../../lib/devlogSchema";
import { readStore, writeStore } from "../../../lib/devlogStore";
import { serverEnv } from "../../../lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const env = serverEnv();
  return {
    password: env.devlogPassword,
    token: env.githubToken,
    repo: env.githubRepo,
    branch: env.githubBranch,
  };
}

function newId(date) {
  const compact = date.replace(/-/g, "");
  const rand = crypto.randomBytes(2).toString("hex");
  return `${compact}-${rand}`;
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
