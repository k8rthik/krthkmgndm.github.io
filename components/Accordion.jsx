"use client";

import { useState } from "react";
import SectionBar from "./SectionBar";
import AsciiBioArt from "./AsciiBioArt";
import Colophon from "./Colophon";

export default function Accordion({ recent = [], projectsSlot, postsSlot }) {
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [postsOpen, setPostsOpen] = useState(false);

  return (
    <div className="home">
      <header className="home__header">
        <div>
          <h1 className="home__name">keerthik muruganandam</h1>

          <p className="home__contact">
            <span className="serif">murug030 [at] umn [dot] edu</span>
            <br />
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

      <SectionBar
        label="projects"
        variant="projects"
        open={projectsOpen}
        onClick={() => setProjectsOpen((v) => !v)}
        controls="panel-projects"
      />
      <div
        id="panel-projects"
        className="panel"
        role="region"
        aria-label="projects"
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
  );
}
