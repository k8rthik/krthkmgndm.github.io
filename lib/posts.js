import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { isPublished } from "./published.js";

const postsDirectory = path.join(process.cwd(), "posts");

function postFilenames() {
  return fs.readdirSync(postsDirectory).filter((file) => file.endsWith(".md"));
}

// Every post, drafts included, newest first.
export function getAllPosts() {
  const posts = postFilenames()
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

export function getPublishedPosts() {
  return getAllPosts().filter(isPublished);
}

// every post's slug, drafts included, for static generation
export function getPostSlugs() {
  return postFilenames().map((filename) => filename.replace(/\.md$/, ""));
}
