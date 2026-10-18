// Everything about the site a person edits by hand lives in content/:
//   content/site.js        identity, links, homepage settings (this file)
//   content/projects.json  the project list
//   content/posts/*.md     blog posts
// Generated data (data/*.json) and page-specific values stay elsewhere.
//
// Kept free of node imports so client components can use it.

// --- identity --------------------------------------------------------------

export const NAME = "keerthik muruganandam";

export const BIO = "building in biology & ml. bme + cs @ umn.";

// contact links, in header order
export const SOCIAL = [
  { label: "murug030@umn.edu", href: "mailto:murug030@umn.edu" },
  { label: "gh/k8rthik", href: "https://github.com/k8rthik" },
  { label: "in/k8rthik", href: "https://www.linkedin.com/in/k8rthik/" },
];

// --- homepage --------------------------------------------------------------

// how many of the newest projects and posts the homepage lists
export const HOME_PROJECTS = 3;
export const HOME_POSTS = 3;

// --- site ------------------------------------------------------------------

export const DOMAIN = "keerthik.dev";

export const SITE_TITLE = "Keerthik Muruganandam | Engineering";

// derived — no need to edit below here
export const SITE_URL = `https://www.${DOMAIN}`;

// pages export a bare `title`; the root layout appends the domain
export const TITLE_TEMPLATE = `%s · ${DOMAIN}`;
