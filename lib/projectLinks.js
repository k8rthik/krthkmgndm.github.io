// A project's links come from its own `links` array when it has one (an
// explicit `[]` means "no links"), otherwise from the legacy demo/code pair.
// Either way only valid links survive, so a placeholder like "#" or an empty
// field never renders as a dead link. Kept free of node imports so both
// server and client components can use it.

// somewhere on this site ("/x", not protocol-relative "//x") or an https url
export function isValidHref(href) {
  if (typeof href !== "string") return false;
  if (href.startsWith("/")) return !href.startsWith("//") && href.length > 1;
  return /^https:\/\/[^\s/]+\.[^\s]+$/.test(href);
}

function isValidLink(link) {
  return (
    link != null &&
    typeof link.label === "string" &&
    link.label.trim() !== "" &&
    isValidHref(link.href)
  );
}

export function projectLinks(project) {
  const links = project.links ?? [
    { label: "demo", href: project.demo },
    { label: "code", href: project.code },
  ];
  return links.filter(isValidLink);
}

// site-relative links stay in the tab; everything else opens a new one
export function externalLinkProps(href) {
  return href.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer" };
}
