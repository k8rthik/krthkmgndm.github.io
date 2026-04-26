import Link from "next/link";
import { getAllPosts } from "../../lib/posts";

export default function AllPosts() {
  const posts = getAllPosts().filter((post) => post.active !== 0);

  return (
    <div className="container">
      <section className="all-blogs">
        <h2>All Blog Posts</h2>
        <div id="blog-container">
          {posts.length === 0
            ? "No posts available."
            : posts.map((post) => (
                <p key={post.slug}>
                  <span>
                    <Link href={`/post/${post.slug}`}>{post.title}</Link>
                  </span>
                  <span>
                    <em>
                      {new Date(post.date).toLocaleDateString()} • {post.time}{" "}
                      minute read
                    </em>
                  </span>
                  <span>{post.description}</span>
                </p>
              ))}
        </div>
      </section>
      <hr />
      <Link href="/">Back to Home</Link>
    </div>
  );
}
