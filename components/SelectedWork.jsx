import ProjectLinks from "./ProjectLinks";

// open by default: the few projects worth a visitor's first minute
export default function SelectedWork({ projects }) {
  if (projects.length === 0) return null;

  return (
    <section className="selected" aria-labelledby="selected-heading">
      <h2 id="selected-heading" className="selected__heading">
        selected work
      </h2>
      <ul className="panel__list" role="list">
        {projects.map((project) => (
          <li key={project.name} className="entry">
            <p className="entry__title">{project.name}</p>
            <p className="entry__desc">{project.teaser}</p>
            <ProjectLinks project={project} className="entry__links" />
          </li>
        ))}
      </ul>
    </section>
  );
}
