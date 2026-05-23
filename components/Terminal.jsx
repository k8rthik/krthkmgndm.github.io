"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { displayPath, runCommand } from "../lib/commands";

const HISTORY_KEY = "terminal-history";
const HISTORY_MAX = 50;

function isTextField(el) {
  if (!el || el === document.body) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  return false;
}

function pathOf(pathname) {
  // Normalize: Next.js may give us a trailing slash on some routes.
  if (!pathname || pathname === "") return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export default function Terminal() {
  const router = useRouter();
  const realPath = pathOf(usePathname());

  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState(realPath);
  const [lines, setLines] = useState([
    { kind: "info", text: "type 'help' for commands. esc to close." },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Keep `pwd` in sync with the actual page path. When the user navigates via
  // a link or back/forward, the terminal's notion of "where we are" follows.
  useEffect(() => {
    setPwd(realPath);
  }, [realPath]);

  // Load history once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Global keyboard activation.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (open) return;
      if (isTextField(document.activeElement)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === ":" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus the input when the terminal opens.
  useEffect(() => {
    if (open && inputRef.current) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Auto-scroll to the bottom on new output.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, open]);

  const print = useCallback((...rest) => {
    setLines((prev) => [
      ...prev,
      ...rest.map((text) => ({ kind: "out", text })),
    ]);
  }, []);

  const clear = useCallback(() => {
    setLines([]);
  }, []);

  const submit = (raw) => {
    const line = raw.trim();
    setLines((prev) => [
      ...prev,
      { kind: "in", text: `${displayPath(pwd)} $ ${line}` },
    ]);
    if (line) {
      const nextHistory = [line, ...history.filter((h) => h !== line)].slice(
        0,
        HISTORY_MAX
      );
      setHistory(nextHistory);
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      } catch {}
    }
    setHistoryIdx(-1);
    setInput("");
    runCommand(line, { router, print, clear, pwd, setPwd });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(input);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setInput(history[next] ?? "");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = historyIdx - 1;
      if (next < 0) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(next);
        setInput(history[next] ?? "");
      }
      return;
    }
    if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      clear();
      return;
    }
    if (e.key === "c" && e.ctrlKey) {
      // Ctrl-C in shells abandons the current line.
      e.preventDefault();
      setLines((prev) => [
        ...prev,
        { kind: "in", text: `${displayPath(pwd)} $ ${input}^C` },
      ]);
      setInput("");
      setHistoryIdx(-1);
    }
  };

  if (!open) return null;

  return (
    <div
      className="terminal"
      role="dialog"
      aria-label="terminal"
      onMouseDown={(e) => {
        if (e.target.classList.contains("terminal")) setOpen(false);
      }}
    >
      <div className="terminal__box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="terminal__scroll" ref={scrollRef}>
          {lines.map((l, i) => (
            <div key={i} className={`terminal__line terminal__line--${l.kind}`}>
              {l.text}
            </div>
          ))}
        </div>
        <div className="terminal__prompt">
          <span className="terminal__sigil">{displayPath(pwd)} $</span>
          <input
            ref={inputRef}
            className="terminal__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="terminal input"
          />
        </div>
      </div>
    </div>
  );
}
