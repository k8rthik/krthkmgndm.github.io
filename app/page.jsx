import { getAllPosts } from "../lib/posts";
import { getAllProjects } from "../lib/projects";
import { getDevlog } from "../lib/devlog";
import Accordion from "../components/Accordion";
import ProjectsPanel from "../components/ProjectsPanel";
import PostsPanel from "../components/PostsPanel";
import DevlogPanel from "../components/DevlogPanel";

export default function Home() {
  const posts = getAllPosts().filter((post) => post.active !== 0);
  const projects = getAllProjects().filter((project) => project.active);
  const devlog = getDevlog();

  return (
    <Accordion
      projectsSlot={<ProjectsPanel projects={projects} />}
      postsSlot={<PostsPanel posts={posts} />}
      devlogSlot={<DevlogPanel entries={devlog} />}
    />
  );
}
