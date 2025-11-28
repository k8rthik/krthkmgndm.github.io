import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';

function Post() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/${slug}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Post not found');
        }
        return response.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching post:', err);
        setError('Failed to load the blog post.');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="container">
        <div id="post-container">Loading...</div>
        <hr />
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div id="post-container">{error}</div>
        <hr />
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  // Sanitize HTML content to prevent XSS attacks
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
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default Post;
