import Link from "next/link";
import { getAllProjects } from "../../lib/projects";
import ProjectDemo from "../../components/ProjectDemo";

export default function AllProjects() {
  const projects = getAllProjects();

  return (
    <main className="page">
      <h1>All projects</h1>
      <p className="subtitle">active and archived</p>

      <hr />

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
                  [<a href={project.demo}>demo</a>] [
                  <a href={project.code}>code</a>]
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
