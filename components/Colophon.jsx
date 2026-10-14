"use client";

import { useEffect, useState } from "react";
import { CITY, GITHUB_REPO } from "../lib/config";
import { formatRelative } from "../lib/dates";

const COMMIT_CACHE_KEY = "colophon-commit-ts";
const COMMIT_CACHE_AGE_KEY = "colophon-commit-at";
const COMMIT_CACHE_MS = 60 * 60 * 1000;

export default function Colophon() {
  const [commit, setCommit] = useState(null);

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
        // committer date, not author date: a rebased commit keeps its original
        // author date, which made a fresh push read as months old
        const iso = json?.[0]?.commit?.committer?.date;
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
        {CITY.toLowerCase()}
      </span>
      {commit && (
        <span className="home__colophon-commit">
          last commit {formatRelative(commit)}
        </span>
      )}
    </p>
  );
}
