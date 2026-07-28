import Link from "next/link";
import { parseLocalDate } from "../lib/dates";

function formatDate(iso) {
  const d = parseLocalDate(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostsPanel({ posts }) {
  if (posts.length === 0) {
    return (
      <div className="panel__scroll">
        <p className="entry__desc">nothing here yet. soon.</p>
      </div>
    );
  }

  return (
    <div className="panel__scroll">
      <ul className="panel__list" role="list">
        {posts.map((post) => (
          <li key={post.slug} className="entry">
            <p className="entry__title">
              <Link href={`/post/${post.slug}`}>{post.title}</Link>
              <span className="entry__meta">
                {formatDate(post.date)} · {post.time} min
              </span>
            </p>
            {post.description && (
              <p className="entry__desc">{post.description}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="panel__footer">
        the full archive lives <Link href="/all-posts">here</Link>.
      </p>
    </div>
  );
}
