// A draft (`active: 0` in frontmatter) is built and reachable by URL, so a
// link can be shared, but it is never listed. Kept free of node imports so
// pure modules (lib/recent.js) can share the rule with lib/posts.js.
export function isPublished(post) {
  return post.active !== 0;
}
