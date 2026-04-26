import fs from "fs";
import path from "path";

export function getAllProjects() {
  const filePath = path.join(process.cwd(), "projects.json");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
}
