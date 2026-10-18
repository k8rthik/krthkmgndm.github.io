import Link from "next/link";
import ProjectLinks from "./ProjectLinks";

export default function ProjectsPanel({ projects }) {
  return (
    <>
      <ul className="panel__list" role="list">
        {projects.map((project) => (
          <li key={project.name} className="entry">
            <p className="entry__title">{project.name}</p>
            <p className="entry__desc">{project.description}</p>
            <ProjectLinks project={project} className="entry__links" />
          </li>
        ))}
      </ul>
      <p className="panel__footer">
        <Link href="/all-projects">all projects →</Link>
      </p>
    </>
  );
}
