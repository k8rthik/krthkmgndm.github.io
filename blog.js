import DOMPurify from "dompurify";

async function fetchPost() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    document.body.innerHTML = "<h1>Post not found</h1>";
    return;
  }

  try {
    const response = await fetch(`/api/post/${slug}`);
    const post = await response.json();

    document.getElementById("post-title").innerText = post.title;
    document.getElementById("post-meta").innerText = `Published on ${new Date(
      post.date,
    ).toLocaleDateString()}`;
    document.getElementById("post-content").innerHTML = DOMPurify.sanitize(marked(post.content));
  } catch (error) {
    console.error("Error loading post:", error);
    document.body.innerHTML = "<h1>Error loading post</h1>";
  }
}

fetchPost();
