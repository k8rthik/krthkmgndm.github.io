import Link from "next/link";
import ProjectDemo from "./ProjectDemo";

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
                [{" "}
                <a href={project.demo} target="_blank" rel="noreferrer">
                  demo
                </a>{" "}
                ] [{" "}
                <a href={project.code} target="_blank" rel="noreferrer">
                  code
                </a>{" "}
                ]
              </span>
            </ProjectDemo>
          </li>
        ))}
      </ul>
      <p className="panel__footer">
        the full list, including archived bits, lives on the{" "}
        <Link href="/all-projects">projects page</Link>.
      </p>
    </div>
  );
}
