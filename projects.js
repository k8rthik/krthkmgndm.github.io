const projectAPI = "./projects.json";

async function fetchProjects() {
  try {
    const response = await fetch(projectAPI);
    if (!response.ok) throw new Error("Couldn't fetch project data");
    const projects = await response.json();

    const projectContainer = document.getElementById("project-container");
    projectContainer.innerHTML = "";

    projects.forEach((project) => {
      const projectElem = document.createElement("p");

      projectElem.innerHTML = `
        <span><strong>${project.name}</strong></span>
        <span>${project.description}</span>
        <span>[<a href="${project.demo}">demo</a>] [<a href="${project.code}">code</a>]</span>
      `;
      projectContainer.append(projectElem);
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    document.getElementById("project-container").textContent =
      "Failed to load posts";
  }
}

fetchProjects();
