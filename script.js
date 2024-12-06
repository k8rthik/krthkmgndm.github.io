async function fetchBlogPosts() {
  try {
    const response = await fetch("/api/posts");
    const posts = await response.json();

    const blogContainer = document.getElementById("blog-container");
    blogContainer.innerHTML = "";

    posts.forEach((post) => {
      const postElement = document.createElement("div");
      postElement.classList.add("blog-post");

      postElement.innerHTML = `
        <h3>${post.title}</h3>
        <p>${post.description}</p>
        <small>Published on ${new Date(post.date).toLocaleDateString()}</small>
        <a href="/blog/${post.slug}">Read More</a>
      `;

      blogContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    document.getElementById("blog-container").innerText =
      "Failed to load blog posts.";
  }
}

fetchBlogPosts();
