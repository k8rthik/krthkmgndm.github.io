document.addEventListener("DOMContentLoaded", () => {
  // Path to the posts.json file
  const postsJsonPath = "posts.json";

  // Function to fetch and display posts
  fetch(postsJsonPath)
    .then((response) => response.json())
    .then((posts) => {
      const postsContainer = document.getElementById("posts-container");

      posts.forEach((post) => {
        // Format the date
        const date = new Date(post.date);
        let formattedDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        let elements = formattedDate.split(" ");
        if (parseInt(elements[1]) < 10) {
          elements[1] = "0" + elements[1];
        }
        formattedDate = elements.join(" ");

        const title = post.title.trim();

        const listItem = document.createElement("li");

        const postItem = document.createElement("div");
        postItem.className = "post-item";

        const postDate = document.createElement("span");
        postDate.className = "post-date";
        postDate.textContent = formattedDate;

        const postLink = document.createElement("a");
        postLink.href = post.file;
        postLink.className = "post-title";
        postLink.textContent = title;

        postItem.appendChild(postDate);
        postItem.appendChild(postLink);

        listItem.appendChild(postItem);
        postsContainer.appendChild(listItem);
      });
    })
    .catch((error) => {
      console.error("Error fetching posts:", error);
    });
});
