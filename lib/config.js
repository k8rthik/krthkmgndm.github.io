// Site-wide configuration: identity, links, and every environment variable
// the site reads. Page- and post-specific values (a dashboard's defaults, a
// page's own metadata) live with that page instead.
//
// Kept free of node imports so client components can use it. Env vars are
// only read inside serverEnv(), which is called from server code; nothing
// here is NEXT_PUBLIC_, so no secret is ever inlined into the client bundle.

// --- identity --------------------------------------------------------------

export const NAME = "keerthik muruganandam";

export const BIO =
  "building in biology & ml. bme + cs @ umn. " +
  "Biomedical engineering + computer science at UMN.";

export const EMAIL = "murug030@umn.edu";

export const CITY = "Minneapolis, MN";

// --- site ------------------------------------------------------------------

export const DOMAIN = "keerthik.dev";

export const SITE_URL = `https://www.${DOMAIN}`;

export const SITE_TITLE = "Keerthik Muruganandam | Engineering";

// pages export a bare `title`; the root layout appends the domain
export const TITLE_TEMPLATE = `%s · ${DOMAIN}`;

// --- links -----------------------------------------------------------------

export const SOCIAL = [
  { label: "gh/k8rthik", href: "https://github.com/k8rthik" },
  { label: "in/k8rthik", href: "https://www.linkedin.com/in/k8rthik/" },
];

// this site's own repo: the colophon's last-commit line and the devlog store
export const GITHUB_REPO = "k8rthik/krthkmgndm.github.io";

export const GITHUB_BRANCH = "main";

// --- environment (server only) ---------------------------------------------

// Everything the server reads from the environment, with its defaults.
// Documented in .env.example; set the real values in Vercel.
export function serverEnv() {
  return {
    // password for adding/removing devlog entries; unset disables editing
    devlogPassword: process.env.DEVLOG_PASSWORD,
    // fine-grained token with contents:write on GITHUB_REPO
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO || GITHUB_REPO,
    githubBranch: process.env.GITHUB_BRANCH || GITHUB_BRANCH,
  };
}
