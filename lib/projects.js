import { readJsonFile } from "./readJson.js";

// projects.json is hand-maintained, ordered by prominence (see lib/recent.js)
export function getAllProjects() {
  const projects = readJsonFile("projects.json");
  if (!Array.isArray(projects)) throw new Error("projects.json must be an array");
  return projects;
}
