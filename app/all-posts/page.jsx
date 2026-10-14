import Link from "next/link";
import { getPublishedPosts } from "../../lib/posts";
import { formatPostDate } from "../../lib/dates";
import BackLink from "../../components/BackLink";

export default function AllPosts() {
  const posts = getPublishedPosts();

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
                  {formatPostDate(post.date)} · {post.time} min
                </span>
              </dt>
              <dd>{post.description}</dd>
            </div>
          ))}
        </dl>
      )}

      <hr />

      <BackLink />
    </main>
  );
}
