// Route table. `segment` is what appears in the URL after `/`; `alias` is the
// shorthand a user types (e.g. `posts` → `/all-posts`).
const ROUTES = [
  { path: "/", segment: "", alias: null, label: "home" },
  { path: "/all-posts", segment: "all-posts", alias: "posts", label: "writing" },
  {
    path: "/all-projects",
    segment: "all-projects",
    alias: "projects",
    label: "projects",
  },
  { path: "/tutoring", segment: "tutoring", alias: null, label: "tutoring" },
  { path: "/lab", segment: "lab", alias: null, label: "lab notebook" },
];

const ROUTE_BY_PATH = Object.fromEntries(ROUTES.map((r) => [r.path, r]));

// Build a lookup from any name a user might type (segment OR alias) to its
// canonical path. Aliases let `cd posts` work alongside `cd all-posts`.
const NAME_TO_PATH = (() => {
  const m = {};
  for (const r of ROUTES) {
    if (r.segment) m[r.segment] = r.path;
    if (r.alias) m[r.alias] = r.path;
  }
  return m;
})();

/**
 * Resolve a `cd` target relative to a current path. Returns the resolved
 * absolute path on success, or null if the target doesn't map to any route.
 *
 * Supported targets:
 *   (empty), `~`, `/`              → home
 *   `.`                            → current path (no-op)
 *   `..`                           → one level up
 *   `posts`, `all-posts`           → /all-posts (alias or segment)
 *   `/lab`, `~/lab`                → absolute
 *   Composed paths like `../posts` are also supported.
 */
export function resolveCd(currentPath, rawTarget) {
  const target = (rawTarget ?? "").trim();
  if (!target || target === "~" || target === "/") return "/";

  // Strip a leading `~/` or `~`; treat as absolute.
  let t = target;
  let isAbsolute = false;
  if (t === "~" || t.startsWith("~/")) {
    t = t.slice(1);
    isAbsolute = true;
  }
  if (t.startsWith("/")) {
    isAbsolute = true;
  }

  // Tokenise. Filter empty segments produced by leading/trailing slashes or `//`.
  const targetParts = t.split("/").filter(Boolean);
  const startParts = isAbsolute
    ? []
    : currentPath.split("/").filter(Boolean);

  const stack = [...startParts];
  for (const part of targetParts) {
    if (part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  if (stack.length === 0) return "/";

  // Resolve each segment through the alias map. Only the first segment can
  // currently be aliased — deeper paths (like `/post/<slug>`) pass through
  // unchanged.
  const head = NAME_TO_PATH[stack[0]] || `/${stack[0]}`;
  const rest = stack.slice(1).join("/");
  const candidate = rest ? `${head}/${rest}` : head;

  if (isValidRoute(candidate)) return candidate;
  return null;
}

function isValidRoute(path) {
  if (ROUTE_BY_PATH[path]) return true;
  // Allow /post/<slug> as a virtual route — the page itself will 404 if the
  // slug doesn't exist, which is fine for `cd`.
  if (/^\/post\/[\w-]+$/.test(path)) return true;
  return false;
}

/** Display the path in a shell-y way: `/all-posts` → `~/posts`. */
export function displayPath(path) {
  if (path === "/") return "~";
  const parts = path.split("/").filter(Boolean);
  const head = parts[0];
  const route = ROUTES.find((r) => r.segment === head);
  const shown = route?.alias || route?.segment || head;
  const rest = parts.slice(1);
  return rest.length ? `~/${shown}/${rest.join("/")}` : `~/${shown}`;
}

/** What `ls` shows at a given path. Returns an array of lines. */
export function listAt(path) {
  if (path === "/") {
    return ROUTES.filter((r) => r.path !== "/").map((r) => {
      const name = r.alias || r.segment;
      return `${(name + "/").padEnd(14)} ${r.label}`;
    });
  }
  // For deeper routes, just list nothing — keeps things honest.
  return [".", ".."];
}

export function listCommands() {
  return [
    "help            list commands",
    "ls              list contents of current path",
    "cd <path>       change directory (supports ., .., ~, aliases)",
    "pwd             print current path",
    "whoami          long-form bio",
    "now             current focus",
    "clear           clear the buffer",
  ];
}

const WHOAMI = [
  "keerthik muruganandam.",
  "umn '28. biomedical engineering + computer science.",
  "currently: sachs lab (molecular therapeutics), atland ventures.",
  "previously: umtymp, edina senior high.",
  "say hi: murug030 [at] umn [dot] edu",
];

const NOW_LINES = [
  "researching: drug design w/ graph neural nets at the sachs lab.",
  "reading: 'the gene' (mukherjee), 'the idea factory' (gertner).",
  "shipping: this website, slowly.",
];

export function runCommand(line, { router, print, clear, pwd, setPwd }) {
  const tokens = line.trim().split(/\s+/);
  const cmd = (tokens[0] || "").toLowerCase();
  const rest = tokens.slice(1);

  switch (cmd) {
    case "":
      return;

    case "help":
      print(...listCommands());
      return;

    case "ls": {
      const target = rest[0];
      if (!target) {
        print(...listAt(pwd));
        return;
      }
      const resolved = resolveCd(pwd, target);
      if (!resolved) {
        print(`ls: no such directory: ${target}`);
        return;
      }
      print(...listAt(resolved));
      return;
    }

    case "cd": {
      const target = rest.join(" ");
      const resolved = resolveCd(pwd, target);
      if (resolved === null) {
        print(`cd: no such directory: ${target}`);
        // Helpful nudge: if `target` would have worked as an absolute path,
        // surface that.
        const absoluteTry = resolveCd("/", target);
        if (absoluteTry && absoluteTry !== pwd) {
          print(`  (try \`cd /${target.replace(/^\/+/, "")}\` or \`cd ~/${target}\`)`);
        }
        return;
      }
      if (resolved === pwd) return; // no-op
      setPwd(resolved);
      router.push(resolved);
      return;
    }

    case "pwd":
      print(pwd);
      return;

    case "whoami":
      print(...WHOAMI);
      return;

    case "now":
      print(...NOW_LINES);
      return;

    case "clear":
      clear();
      return;

    case "vim":
      print("there is no escape.");
      return;

    case "sudo":
      print("nice try.");
      return;

    case "exit":
    case "quit":
      print("press esc.");
      return;

    default:
      print(`command not found: ${cmd}. try 'help'.`);
  }
}
