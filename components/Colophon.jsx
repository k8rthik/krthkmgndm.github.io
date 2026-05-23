"use client";

import { useEffect, useState } from "react";
import { NOW_CITY, GITHUB_REPO } from "../lib/now";

const COMMIT_CACHE_KEY = "colophon-commit-ts";
const COMMIT_CACHE_AGE_KEY = "colophon-commit-at";
const COMMIT_CACHE_MS = 60 * 60 * 1000;

function formatTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(iso) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) {
    const m = Math.max(1, Math.floor(diff / minute));
    return `${m}m ago`;
  }
  if (diff < day) {
    const h = Math.floor(diff / hour);
    return `${h}h ago`;
  }
  const d = Math.floor(diff / day);
  return `${d}d ago`;
}

export default function Colophon() {
  const [now, setNow] = useState(null);
  const [commit, setCommit] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cachedAt = Number(sessionStorage.getItem(COMMIT_CACHE_AGE_KEY) || 0);
        const cachedTs = sessionStorage.getItem(COMMIT_CACHE_KEY);
        if (cachedTs && Date.now() - cachedAt < COMMIT_CACHE_MS) {
          if (!cancelled) setCommit(cachedTs);
          return;
        }
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1`,
          { headers: { Accept: "application/vnd.github+json" } }
        );
        if (!res.ok) return;
        const json = await res.json();
        const iso = json?.[0]?.commit?.author?.date;
        if (!iso) return;
        sessionStorage.setItem(COMMIT_CACHE_KEY, iso);
        sessionStorage.setItem(COMMIT_CACHE_AGE_KEY, String(Date.now()));
        if (!cancelled) setCommit(iso);
      } catch {
        // silent — colophon falls back gracefully
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className="home__colophon">
      <span className="home__colophon-time">
        {now ? `${NOW_CITY.toLowerCase()} · ${formatTime(now)}` : NOW_CITY.toLowerCase()}
      </span>
      {commit && (
        <span className="home__colophon-commit">
          last commit {formatRelative(commit)}
        </span>
      )}
    </p>
  );
}
