"use client";

import { useState } from "react";
import { normalizeEntry } from "../lib/devlogSchema";
import { toISODate } from "../lib/dates";

// The devlog's editor drawer: a password gate, then the new-entry form.
// The panel owns auth and the API calls; this owns only the form fields.
export default function DevlogEditor({ authed, busy, msg, onUnlock, onAdd, onInvalid }) {
  const [password, setPassword] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");

  function unlock(e) {
    e.preventDefault();
    onUnlock(password);
  }

  async function add(e) {
    e.preventDefault();
    const check = normalizeEntry({ date, body, image });
    if (!check.ok) {
      onInvalid(check.error);
      return;
    }
    if (await onAdd(check.entry)) {
      setBody("");
      setImage("");
      setDate(toISODate(new Date()));
    }
  }

  return (
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
        <form onSubmit={add} className="devlog__form">
          <input
            type="date"
            className="devlog__input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <textarea
            className="devlog__input devlog__textarea"
            placeholder="what happened…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
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
  );
}
