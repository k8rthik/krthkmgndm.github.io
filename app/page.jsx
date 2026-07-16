import { getAllPosts } from "../lib/posts";
import { getAllProjects } from "../lib/projects";
import { recentItems } from "../lib/recent";
import { selectedWork, archiveProjects } from "../lib/selectedWork";
import { getDevlog } from "../lib/devlog";
import Accordion from "../components/Accordion";
import SelectedWork from "../components/SelectedWork";
import ProjectsPanel from "../components/ProjectsPanel";
import PostsPanel from "../components/PostsPanel";
import DevlogPanel from "../components/DevlogPanel";

export default function Home() {
  const posts = getAllPosts().filter((post) => post.active !== 0);
  const projects = getAllProjects();
  const active = projects.filter((project) => project.active);
  const devlog = getDevlog();

  const recent = recentItems(active, posts);

  return (
    <Accordion
      recent={recent}
      selectedSlot={<SelectedWork projects={selectedWork(projects)} />}
      projectsSlot={<ProjectsPanel projects={archiveProjects(projects)} />}
      postsSlot={<PostsPanel posts={posts} />}
      devlogSlot={<DevlogPanel entries={devlog} />}
    />
  );
}
