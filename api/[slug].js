import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked"; // Corrected import

export default function handler(req, res) {
  const { slug } = req.query;

  try {
    console.log("Received slug:", slug); // Log the slug
    const filePath = path.join(process.cwd(), "posts", `${slug}.md`);
    console.log("Checking file path:", filePath); // Log the resolved path

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return res
        .status(404)
        .json({ error: `Post with slug "${slug}" not found.` });
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    console.log("File content read successfully"); // Confirm file read

    const { content, data } = matter(fileContent);
    console.log("Frontmatter extracted:", data); // Log the frontmatter

    const htmlContent = marked(content); // Convert Markdown to HTML
    console.log("Markdown converted to HTML"); // Confirm Markdown to HTML

    res.status(200).json({ ...data, content: htmlContent });
  } catch (error) {
    console.error("Error in /api/[slug] handler:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
}
