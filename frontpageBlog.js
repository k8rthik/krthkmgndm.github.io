async function fetchBlogPosts() {
  try {
    const response = await fetch("/api/posts");
    const posts = await response.json();

    const blogContainer = document.getElementById("blog-container");
    
    posts
      .filter((post) => post.active !== 0)
      .slice(0, 3)
      .forEach((post) => {
        const postElement = document.createElement("p");

        postElement.innerHTML = `
        <span><a href="/post.html?slug=${post.slug}">${post.title}</a></span>
        <span><em>${new Date(post.date).toLocaleDateString()} • ${post.time} minute read</em></span>
        <span>${post.description}</span>
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
