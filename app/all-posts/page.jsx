import Link from "next/link";
import { getAllPosts } from "../../lib/posts";

export default function AllPosts() {
  const posts = getAllPosts().filter((post) => post.active !== 0);

  return (
    <main className="page">
      <h1>All writing</h1>
      <p className="subtitle">everything, oldest dates at the bottom</p>

      <hr />

      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <dl className="entries">
          {posts.map((post) => (
            <div key={post.slug}>
              <dt>
                <Link href={`/post/${post.slug}`}>{post.title}</Link>
                <span className="meta">
                  {new Date(post.date).toLocaleDateString()} · {post.time} min
                </span>
              </dt>
              <dd>{post.description}</dd>
            </div>
          ))}
        </dl>
      )}

      <hr />

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
