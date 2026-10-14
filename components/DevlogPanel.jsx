"use client";

import { useState } from "react";
import DevlogEditor from "./DevlogEditor";
import { devlogApi } from "../lib/devlogClient";
import { compareEntries } from "../lib/devlogSchema";
import { dottedDate } from "../lib/dates";

export default function DevlogPanel({ entries: initial }) {
  const [entries, setEntries] = useState(initial || []);
  const [open, setOpen] = useState(false); // editor drawer open
  const [password, setPassword] = useState(null); // set once verified
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const authed = password !== null;

  // Run an API call with the busy flag and message line handled; resolves
  // true on success so the editor knows whether to clear its fields.
  async function run(call, successMsg) {
    setBusy(true);
    setMsg("");
    try {
      await call();
      setMsg(successMsg);
      return true;
    } catch (err) {
      setMsg(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const unlock = (pw) =>
    run(async () => {
      await devlogApi.verify(pw);
      setPassword(pw);
    }, "");

  const add = (draft) =>
    run(async () => {
      const entry = await devlogApi.add(password, draft);
      setEntries((prev) => [entry, ...prev].toSorted(compareEntries));
    }, "committed — live on the site after the next rebuild (~30s).");

  const remove = (id) =>
    run(async () => {
      await devlogApi.remove(password, id);
      setEntries((prev) => prev.filter((x) => x.id !== id));
    }, "removed — live after the next rebuild.");

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
        <DevlogEditor
          authed={authed}
          busy={busy}
          msg={msg}
          onUnlock={unlock}
          onAdd={add}
          onInvalid={setMsg}
        />
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
                <span className="devlog__date">{dottedDate(entry.date)}</span>
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
                    onClick={() => remove(entry.id)}
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
