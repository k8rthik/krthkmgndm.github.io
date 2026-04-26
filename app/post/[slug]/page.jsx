import Link from "next/link";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { getPostBySlug, getPostSlugs } from "../../../lib/posts";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export default async function Post({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const sanitizedContent = DOMPurify.sanitize(post.content);

  return (
    <div className="container">
      <div id="post-container">
        <h2>{post.title}</h2>
        <p>
          <em>
            {new Date(post.date).toLocaleDateString()} • {post.time} minute read
          </em>
        </p>
        <article dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      </div>
      <hr />
      <Link href="/">Back to Home</Link>
    </div>
  );
}
