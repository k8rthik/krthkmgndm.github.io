import { getAllProjects } from "../../lib/projects";
import { latestProjects } from "../../lib/recent";
import { primaryLink } from "../../lib/projectLinks";
import ProjectLinks from "../../components/ProjectLinks";
import DirListing from "../../components/DirListing";

export const metadata = { title: "projects" };

export default function AllProjects() {
  const all = getAllProjects();
  // active newest first, archived after them in file order
  const projects = [...latestProjects(all, all.length), ...all.filter((p) => !p.active)];

  const rows = projects.map((project) => ({
    key: project.name,
    date: project.added,
    name: `${project.name}/`,
    href: primaryLink(project)?.href,
    dim: !project.active,
    desc: (
      <>
        {project.description}{" "}
        <ProjectLinks project={project} className="entry__links" />
      </>
    ),
  }));

  return <DirListing dir="projects" rows={rows} empty="no projects yet." />;
}
