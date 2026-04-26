import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const postsDirectory = path.join(process.cwd(), "posts");

export function getAllPosts() {
  const filenames = fs.readdirSync(postsDirectory);

  const posts = filenames
    .filter((file) => file.endsWith(".md"))
    .map((filename) => {
      const filePath = path.join(postsDirectory, filename);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContent);

      return {
        ...data,
        slug: filename.replace(/\.md$/, ""),
      };
    });

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return posts;
}

export function getPostBySlug(slug) {
  const filePath = path.join(postsDirectory, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(fileContent);
  const htmlContent = marked(content);

  return {
    ...data,
    slug,
    content: htmlContent,
  };
}

export function getPostSlugs() {
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((filename) => filename.replace(/\.md$/, ""));
}
