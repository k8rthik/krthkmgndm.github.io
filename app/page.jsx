import { getPublishedPosts } from "../lib/posts";
import { getAllProjects } from "../lib/projects";
import { recentItems } from "../lib/recent";
import { selectedWork, archiveProjects } from "../lib/selectedWork";
import { getDevlog } from "../lib/devlog";
import HomeLayout from "../components/HomeLayout";
import SelectedWork from "../components/SelectedWork";
import ProjectsPanel from "../components/ProjectsPanel";
import PostsPanel from "../components/PostsPanel";
import DevlogPanel from "../components/DevlogPanel";

export default function Home() {
  const posts = getPublishedPosts();
  const projects = getAllProjects();
  const devlog = getDevlog();

  const recent = recentItems(projects, posts);

  return (
    <HomeLayout
      recent={recent}
      selectedSlot={<SelectedWork projects={selectedWork(projects)} />}
      projectsSlot={<ProjectsPanel projects={archiveProjects(projects)} />}
      postsSlot={<PostsPanel posts={posts} />}
      devlogSlot={<DevlogPanel entries={devlog} />}
    />
  );
}
