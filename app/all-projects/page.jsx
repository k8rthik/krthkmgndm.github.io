import { getAllProjects } from "../../lib/projects";
import ProjectLinks from "../../components/ProjectLinks";
import BackLink from "../../components/BackLink";

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
            <div key={project.name}>
              <dt>
                {project.name}
                {!project.active && <span className="meta">archived</span>}
              </dt>
              <dd>
                {project.description}
                <ProjectLinks project={project} className="links" />
              </dd>
            </div>
          ))}
        </dl>
      )}

      <hr />

      <BackLink />
    </main>
  );
}
