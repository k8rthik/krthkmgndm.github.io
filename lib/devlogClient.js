// Browser client for app/api/devlog. Every call throws an Error whose
// message is safe to show in the editor.

const ENDPOINT = "/api/devlog";

async function post(body) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  // error responses are JSON too; a proxy error page may not be
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

export const devlogApi = {
  verify: (password) => post({ action: "verify", password }),
  add: (password, entry) => post({ action: "add", password, entry }).then((d) => d.entry),
  remove: (password, id) => post({ action: "delete", password, id }),
};
