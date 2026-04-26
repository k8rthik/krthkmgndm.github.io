import Link from "next/link";
import { getAllProjects } from "../../lib/projects";

export default function AllProjects() {
  const projects = getAllProjects().filter((project) => project.active);

  return (
    <div className="container">
      <h2>All Projects</h2>
      <div id="project-container">
        {projects.length === 0
          ? "No projects available."
          : projects.map((project) => (
              <p key={project.name}>
                <span>
                  <strong>{project.name}</strong>
                </span>
                <span>{project.description}</span>
                <span>
                  [<a href={project.demo}>demo</a>] [
                  <a href={project.code}>code</a>]
                </span>
              </p>
            ))}
      </div>
      <hr />
      <Link href="/">Back to Home</Link>
    </div>
  );
}
