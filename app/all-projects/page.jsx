import Link from "next/link";
import { getAllProjects } from "../../lib/projects";
import { projectLinks } from "../../lib/projectLinks";
import ProjectDemo from "../../components/ProjectDemo";

export default function AllProjects() {
  const projects = getAllProjects();

  return (
    <main className="page">
      <h1>all projects</h1>

      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <dl className="entries">
          {projects.map((project) => (
            <ProjectDemo key={project.name} name={project.name}>
              <dt>
                {project.name}
                {!project.active && <span className="meta">archived</span>}
              </dt>
              <dd>
                {project.description}
                <span className="links">
                  {projectLinks(project).map((link, i) => (
                    <span key={link.label}>
                      {i > 0 && " "}[<a href={link.href}>{link.label}</a>]
                    </span>
                  ))}
                </span>
              </dd>
            </ProjectDemo>
          ))}
        </dl>
      )}

      <hr />

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
