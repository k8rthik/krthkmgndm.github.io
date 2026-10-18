import Link from "next/link";
import { formatPostDate } from "../lib/dates";

export default function PostsPanel({ posts }) {
  if (posts.length === 0) {
    return <p className="entry__desc">nothing here yet. soon.</p>;
  }

  return (
    <>
      <ul className="panel__list" role="list">
        {posts.map((post) => (
          <li key={post.slug} className="entry">
            <p className="entry__title">
              <Link href={`/post/${post.slug}`}>{post.slug}.md</Link>{" "}
              <span className="entry__meta">
                {formatPostDate(post.date)}
              </span>
            </p>
            {post.description && (
              <p className="entry__desc">{post.description}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="panel__footer">
        <Link href="/all-posts">all posts →</Link>
      </p>
    </>
  );
}
