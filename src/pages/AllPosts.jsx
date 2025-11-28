import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function AllPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts')
      .then(response => response.json())
      .then(data => {
        setPosts(data.filter(post => post.active !== 0));
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching blog posts:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <section className="all-blogs">
        <h2>All Blog Posts</h2>
        <div id="blog-container">
          {loading ? (
            'Loading...'
          ) : posts.length === 0 ? (
            'No posts available.'
          ) : (
            posts.map(post => (
              <p key={post.slug}>
                <span>
                  <Link to={`/post/${post.slug}`}>{post.title}</Link>
                </span>
                <span>
                  <em>
                    {new Date(post.date).toLocaleDateString()} • {post.time} minute read
                  </em>
                </span>
                <span>{post.description}</span>
              </p>
            ))
          )}
        </div>
      </section>
      <hr />
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default AllPosts;
