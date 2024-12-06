import fs from "fs";
import path from "path";
import matter from "gray-matter";
import marked from "marked";

export default function handler(req, res) {
  const { slug } = req.query;
  const filePath = path.join(process.cwd(), "posts", `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(fileContent); // Extract frontmatter and content

  const htmlContent = marked(content); // Convert Markdown to HTML

  res.status(200).json({ ...data, content: htmlContent });
}
