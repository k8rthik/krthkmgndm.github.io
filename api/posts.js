import fs from "fs";
import path from "path";
import matter from "gray-matter";

export default function handler(req, res) {
  const postsDir = path.join(process.cwd(), "posts"); // Directory with Markdown files
  const filenames = fs.readdirSync(postsDir); // Get all filenames in the directory

  const posts = filenames.map((filename) => {
    const filePath = path.join(postsDir, filename);
    const fileContents = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(fileContents); // Extract frontmatter

    return {
      title: data.title,
      date: data.date,
      description: data.description,
      slug: filename.replace(".md", ""), // Create a slug from the filename
    };
  });

  res.status(200).json(posts); // Return posts as JSON
}
