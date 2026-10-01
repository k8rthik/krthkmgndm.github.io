// The homepage splits projects.json in two: a short "selected work" list
// shown open by default, and everything else behind the projects bar.
//
// A project is selected when it has a `featured` rank, a short `teaser`, and
// at least one working link. Anything ranked but missing a teaser or proof
// falls back into the archive rather than showing up half-finished.
//
// Kept free of node imports so both server and client components can use it.
import { projectLinks } from "./projectLinks.js";

function isSelected(project) {
  return (
    project.active &&
    typeof project.featured === "number" &&
    typeof project.teaser === "string" &&
    project.teaser.trim() !== "" &&
    projectLinks(project).length > 0
  );
}

export function selectedWork(projects) {
  return (projects ?? [])
    .filter(isSelected)
    .sort((a, b) => a.featured - b.featured);
}

export function archiveProjects(projects) {
  return (projects ?? []).filter((p) => p.active && !isSelected(p));
}
