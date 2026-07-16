"use client";

import { useState } from "react";
import { normalizeEntry } from "../lib/devlogSchema";

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function shortDate(iso) {
  // 2026-07-16 -> 2026.07.16 (commit-log feel, no locale surprises)
  return typeof iso === "string" ? iso.replace(/-/g, ".") : iso;
}

async function callApi(body) {
  const res = await fetch("/api/devlog", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

export default function DevlogPanel({ entries: initial }) {
  const [entries, setEntries] = useState(initial || []);
  const [open, setOpen] = useState(false); // editor drawer open
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [date, setDate] = useState(todayISO());
  const [bodyText, setBodyText] = useState("");
  const [image, setImage] = useState("");

  async function unlock(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await callApi({ action: "verify", password });
      setAuthed(true);
      setMsg("");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addEntry(e) {
    e.preventDefault();
    const check = normalizeEntry({ date, body: bodyText, image });
    if (!check.ok) {
      setMsg(check.error);
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const { entry } = await callApi({ action: "add", password, entry: check.entry });
      setEntries((prev) =>
        [entry, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
      );
      setBodyText("");
      setImage("");
      setDate(todayISO());
      setMsg("committed — live on the site after the next rebuild (~30s).");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id) {
    if (!authed) return;
    setBusy(true);
    setMsg("");
    try {
      await callApi({ action: "delete", password, id });
      setEntries((prev) => prev.filter((x) => x.id !== id));
      setMsg("removed — live after the next rebuild.");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="devlog" aria-label="devlog">
      <div className="devlog__head">
        <button
          type="button"
          className="devlog__title"
          aria-expanded={open}
          aria-label={open ? "close devlog editor" : "open devlog editor"}
          onClick={() => {
            setOpen((v) => !v);
            setMsg("");
          }}
        >
          devlog
        </button>
      </div>

      {open && (
        <div className="devlog__editor">
          {!authed ? (
            <form onSubmit={unlock} className="devlog__form">
              <input
                type="password"
                className="devlog__input"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="submit" className="devlog__btn" disabled={busy}>
                unlock
              </button>
            </form>
          ) : (
            <form onSubmit={addEntry} className="devlog__form">
              <input
                type="date"
                className="devlog__input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <textarea
                className="devlog__input devlog__textarea"
                placeholder="what happened…"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={3}
              />
              <input
                type="url"
                className="devlog__input"
                placeholder="image url (optional)"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
              <button type="submit" className="devlog__btn" disabled={busy}>
                {busy ? "committing…" : "commit entry"}
              </button>
            </form>
          )}
          {msg && <p className="devlog__msg">{msg}</p>}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="devlog__empty">no entries yet.</p>
      ) : (
        <ol className="devlog__list" role="list">
          {entries.map((entry) => (
            <li key={entry.id} className="devlog__entry">
              <span className="devlog__marker" aria-hidden="true">
                •
              </span>
              <div className="devlog__body">
                <span className="devlog__date">{shortDate(entry.date)}</span>
                <p className="devlog__text">{entry.body}</p>
                {entry.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="devlog__img"
                    src={entry.image}
                    alt=""
                    loading="lazy"
                  />
                ) : null}
                {authed && (
                  <button
                    type="button"
                    className="devlog__del"
                    onClick={() => removeEntry(entry.id)}
                    disabled={busy}
                  >
                    [rm]
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
