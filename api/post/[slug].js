import fs from "fs";
import path from "path";
import matter from "gray-matter";

export default function handler(req, res) {
  const { slug } = req.query;
  const filePath = path.join(process.cwd(), "posts", `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContents); // Extract frontmatter and content

  res.status(200).json({
    title: data.title,
    date: data.date,
    description: data.description,
    content, // Return the Markdown content
  });
}
