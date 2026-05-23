import { getAllPosts } from "../lib/posts";
import { getAllProjects } from "../lib/projects";
import Accordion from "../components/Accordion";
import ProjectsPanel from "../components/ProjectsPanel";
import PostsPanel from "../components/PostsPanel";

export default function Home() {
  const posts = getAllPosts().filter((post) => post.active !== 0);
  const projects = getAllProjects().filter((project) => project.active);

  return (
    <Accordion
      projectsSlot={<ProjectsPanel projects={projects} />}
      postsSlot={<PostsPanel posts={posts} />}
    />
  );
}
