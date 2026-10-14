import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { getPostBySlug, getPostSlugs } from "../../../lib/posts";
import { formatPostDate } from "../../../lib/dates";
import BackLink from "../../../components/BackLink";

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
    <main className="page">
      <header>
        <h1>{post.title}</h1>
        <p className="dateline">
          {formatPostDate(post.date)} · {post.time} minute read
        </p>
      </header>

      <hr />

      <article dangerouslySetInnerHTML={{ __html: sanitizedContent }} />

      <hr />

      <BackLink href="/all-posts">all writing</BackLink>
    </main>
  );
}
