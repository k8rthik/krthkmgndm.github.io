import CollapsibleSection from "./CollapsibleSection";
import AsciiBioArt from "./AsciiBioArt";
import Colophon from "./Colophon";
import { BIO, EMAIL, NAME, SOCIAL } from "../lib/config";

// The homepage: header, the "recently" line, selected work, the collapsible
// projects and blog panels, and the devlog aside.
export default function HomeLayout({
  recent = [],
  selectedSlot,
  projectsSlot,
  postsSlot,
  devlogSlot,
}) {
  return (
    <div className="home home--split">
      <div className="home__main">
        <header className="home__header">
          <div>
            <h1 className="home__name">{NAME}</h1>

            <p className="home__bio">{BIO}</p>

            <p className="home__contact">
              <a className="serif" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
              {SOCIAL.map((s) => (
                <span key={s.href}>
                  {" · "}
                  <a href={s.href}>{s.label}</a>
                </span>
              ))}
            </p>
          </div>
          <Colophon />
        </header>

        {recent.length > 0 && (
          <p className="home__recently">
            recently:{" "}
            {recent.map((item, i) => (
              <span key={item.href}>
                {i > 0 && " · "}
                <a href={item.href}>{item.label}</a>
              </span>
            ))}
          </p>
        )}

        {selectedSlot}

        <CollapsibleSection id="projects" label="more projects" variant="projects">
          {projectsSlot}
        </CollapsibleSection>

        <CollapsibleSection id="posts" label="blog" variant="posts">
          {postsSlot}
        </CollapsibleSection>

        <AsciiBioArt />
      </div>

      <div className="home__aside">{devlogSlot}</div>
    </div>
  );
}
