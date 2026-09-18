// The newest few things on the site, projects and posts together.
//
// Posts carry a date in their frontmatter. projects.json is ordered by how
// much I want people to see a thing, not by when it landed, so a project only
// appears here once it has been given an `added` date — an undated project is
// treated as older than anything dated rather than guessed at.
//
// Kept free of node imports so both server and client components can use it.
import { projectLinks } from "./projectLinks.js";

// prefer somewhere on this site, then a demo, then whatever is first
function primaryHref(project) {
  const links = projectLinks(project).filter((l) => l && l.href);
  return (
    links.find((l) => l.href.startsWith("/"))?.href ??
    links.find((l) => l.label === "demo")?.href ??
    links[0]?.href ??
    null
  );
}

export function recentItems(projects, posts, limit = 2) {
  const fromProjects = (projects ?? [])
    .filter((p) => p.active && p.added)
    .map((p) => ({ kind: "project", label: p.name, href: primaryHref(p), date: p.added }));

  const fromPosts = (posts ?? [])
    .filter((p) => p.active !== 0 && p.date && p.slug)
    .map((p) => ({ kind: "post", label: p.title ?? p.slug, href: `/post/${p.slug}`, date: p.date }));

  return [...fromProjects, ...fromPosts]
    .filter((i) => i.href)
    .sort((a, b) => (a.date === b.date ? a.label.localeCompare(b.label) : a.date < b.date ? 1 : -1))
    .slice(0, limit);
}
