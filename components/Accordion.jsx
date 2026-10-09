"use client";

import { useState } from "react";
import SectionBar from "./SectionBar";
import AsciiBioArt from "./AsciiBioArt";
import Colophon from "./Colophon";
import { BIO, EMAIL } from "../lib/bio";

export default function Accordion({
  recent = [],
  selectedSlot,
  projectsSlot,
  postsSlot,
  devlogSlot,
}) {
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [postsOpen, setPostsOpen] = useState(false);

  return (
    <div className="home home--split">
      <div className="home__main">
      <header className="home__header">
        <div>
          <h1 className="home__name">keerthik muruganandam</h1>

          <p className="home__bio">{BIO}</p>

          <p className="home__contact">
            <a className="serif" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>{" "}
            ·{" "}
            <a href="https://github.com/k8rthik">gh/k8rthik</a> ·{" "}
            <a href="https://www.linkedin.com/in/k8rthik/">in/k8rthik</a>
          </p>
        </div>
        <Colophon />
      </header>

      {recent.length > 0 && (
        <p className="home__recently">
          recently:{" "}
          {recent.map((item, i) => (
            <span key={item.href}>
              {i > 0 && " \u00b7 "}
              <a href={item.href}>{item.label}</a>
            </span>
          ))}
        </p>
      )}

      {selectedSlot}

      <SectionBar
        label="more projects"
        variant="projects"
        open={projectsOpen}
        onClick={() => setProjectsOpen((v) => !v)}
        controls="panel-projects"
      />
      <div
        id="panel-projects"
        className="panel"
        role="region"
        aria-label="more projects"
        aria-hidden={!projectsOpen}
      >
        {projectsSlot}
      </div>

      <SectionBar
        label="blog"
        variant="posts"
        open={postsOpen}
        onClick={() => setPostsOpen((v) => !v)}
        controls="panel-posts"
      />
      <div
        id="panel-posts"
        className="panel"
        role="region"
        aria-label="blog"
        aria-hidden={!postsOpen}
      >
        {postsSlot}
      </div>

      <AsciiBioArt />

      {/* status line disabled for now
      <ul className="now" aria-label="status">
        <li>reading atlas shrugged,</li>
        <li>looping apple pie</li>
        <li>playing ti4, root</li>
      </ul>
      */}
      </div>

      <div className="home__aside">{devlogSlot}</div>
    </div>
  );
}
