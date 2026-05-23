"use client";

import { useState } from "react";
import SectionBar from "./SectionBar";
import AsciiBioArt from "./AsciiBioArt";
import Colophon from "./Colophon";

export default function Accordion({ projectsSlot, postsSlot }) {
  // null | "projects" | "posts"
  const [open, setOpen] = useState(null);

  const toggle = (which) => {
    setOpen((current) => (current === which ? null : which));
  };

  const dataOpenProp = open ? { "data-open": open } : {};

  return (
    <div className="home" {...dataOpenProp}>
      <header className="home__header">
        <div>
          <h1 className="home__name">keerthik muruganandam</h1>
          <p className="home__contact">
            murug030 [at] umn [dot] edu<br />
            <a href="https://github.com/krthkmgndm">github</a> ·{" "}
            <a href="https://www.linkedin.com/in/mkeerthik/">linkedin</a>
          </p>
        </div>
        <Colophon />
      </header>

      <SectionBar
        label="projects"
        variant="projects"
        open={open === "projects"}
        onClick={() => toggle("projects")}
        controls="panel-projects"
      />
      <div
        id="panel-projects"
        className="panel"
        role="region"
        aria-label="projects"
        aria-hidden={open !== "projects"}
      >
        {projectsSlot}
      </div>

      <SectionBar
        label="blog posts"
        variant="posts"
        open={open === "posts"}
        onClick={() => toggle("posts")}
        controls="panel-posts"
      />
      <div
        id="panel-posts"
        className="panel"
        role="region"
        aria-label="blog posts"
        aria-hidden={open !== "posts"}
      >
        {postsSlot}
      </div>

      <AsciiBioArt paused={open !== null} />
    </div>
  );
}
