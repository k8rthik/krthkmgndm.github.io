// most projects carry the default demo/code pair; an entry can override
// with its own `links` array (e.g. bgelo's stats/blog). Kept free of node
// imports so both server and client components can use it.
export function projectLinks(project) {
  return (
    project.links ?? [
      { label: "demo", href: project.demo },
      { label: "code", href: project.code },
    ]
  );
}
