// The homepage shows the newest few projects. projects.json is ordered by
// prominence, not by date, so recency comes from each project's `added`
// date. An undated project sorts after every dated one rather than being
// guessed at; ties keep their projects.json order.
//
// Kept free of node imports so both server and client components can use it.
export function latestProjects(projects, limit = 3) {
  return (projects ?? [])
    .filter((p) => p.active)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const da = a.p.added ?? "";
      const db = b.p.added ?? "";
      if (da !== db) return da < db ? 1 : -1;
      return a.i - b.i;
    })
    .slice(0, limit)
    .map(({ p }) => p);
}
