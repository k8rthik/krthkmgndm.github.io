import { projectLinks, externalLinkProps } from "../lib/projectLinks";

// [demo] [code] — renders nothing at all when a project has no valid links
export default function ProjectLinks({ project, className }) {
  const links = projectLinks(project);
  if (links.length === 0) return null;

  return (
    <span className={className}>
      {links.map((link, i) => (
        <span key={link.label}>
          {i > 0 && " "}[
          <a href={link.href} {...externalLinkProps(link.href)}>
            {link.label}
          </a>
          ]
        </span>
      ))}
    </span>
  );
}
