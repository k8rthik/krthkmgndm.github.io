import AsciiBioArt from "./AsciiBioArt";
import { BIO, NAME, SOCIAL } from "../content/site";

// The homepage: header and the newest projects and posts, with the helix
// beside them on wide screens and below them on narrow ones.
export default function HomeLayout({ projectsSlot, postsSlot }) {
  return (
    <div className="home">
      <div className="home__main">
        <header className="home__header">
          <h1 className="home__name">{NAME}</h1>

          <p className="home__contact">
            {SOCIAL.map((s, i) => (
              <span key={s.href}>
                {i > 0 && " · "}
                <a href={s.href}>{s.label}</a>
              </span>
            ))}
          </p>

          <p className="home__bio">{BIO}</p>
        </header>

        <section className="section" aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="section__heading">projects</h2>
          {projectsSlot}
        </section>

        <section className="section" aria-labelledby="posts-heading">
          <h2 id="posts-heading" className="section__heading">writing</h2>
          {postsSlot}
        </section>
      </div>

      <AsciiBioArt />
    </div>
  );
}
