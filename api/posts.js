import fs from "fs";
import path from "path";
import matter from "gray-matter";

export default function handler(req, res) {
  const postsDirectory = path.join(process.cwd(), "posts");

  try {
    // Read all files in the `posts/` directory
    const filenames = fs.readdirSync(postsDirectory);

    // Process each file and extract metadata
    const posts = filenames
      .filter((file) => file.endsWith(".md")) // Only process Markdown files
      .map((filename) => {
        const filePath = path.join(postsDirectory, filename);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const { data } = matter(fileContent); // Extract frontmatter metadata

        return {
          ...data, // Spread metadata (e.g., title, date, description)
          slug: filename.replace(/\.md$/, ""), // Create a slug from the filename
        };
      });

    // Sort posts by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error reading posts:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}
