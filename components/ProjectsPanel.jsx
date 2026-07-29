import Link from "next/link";
import ProjectDemo from "./ProjectDemo";
import { projectLinks } from "../lib/projectLinks";

export default function ProjectsPanel({ projects }) {
  return (
    <div className="panel__scroll">
      <ul className="panel__list" role="list">
        {projects.map((project) => (
          <li key={project.name} className="entry">
            <ProjectDemo name={project.name}>
              <p className="entry__title">
                {project.name}
                {!project.active && (
                  <span className="entry__meta">(archived)</span>
                )}
              </p>
              <p className="entry__desc">{project.description}</p>
              <span className="entry__links">
                {projectLinks(project).map((link, i) => (
                  <span key={link.label}>
                    {i > 0 && " "}[
                    <a
                      href={link.href}
                      {...(link.href.startsWith("/")
                        ? {}
                        : { target: "_blank", rel: "noreferrer" })}
                    >
                      {link.label}
                    </a>
                    ]
                  </span>
                ))}
              </span>
            </ProjectDemo>
          </li>
        ))}
      </ul>
      <p className="panel__footer">
        <Link href="/all-projects">all projects</Link>.
      </p>
    </div>
  );
}
