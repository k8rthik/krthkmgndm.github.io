import { getPublishedPosts } from "../lib/posts";
import { getAllProjects } from "../lib/projects";
import { latestProjects } from "../lib/recent";
import { HOME_POSTS, HOME_PROJECTS } from "../content/site";
import HomeLayout from "../components/HomeLayout";
import ProjectsPanel from "../components/ProjectsPanel";
import PostsPanel from "../components/PostsPanel";

export default function Home() {
  const projects = latestProjects(getAllProjects(), HOME_PROJECTS);
  const posts = getPublishedPosts().slice(0, HOME_POSTS);

  return (
    <HomeLayout
      projectsSlot={<ProjectsPanel projects={projects} />}
      postsSlot={<PostsPanel posts={posts} />}
    />
  );
}
