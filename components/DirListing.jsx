import Link from "next/link";
import { externalLinkProps } from "../lib/projectLinks";
import { DOMAIN } from "../content/site";

// An oil.nvim-style directory buffer: a path bar, a "../" row back home, then
// one row per entry — a date column, the name as a link, and a description.
// Rows are { key, date, name, href, dim, desc } and render as given.
export default function DirListing({ dir, rows, empty }) {
  return (
    <main className="page page--wide">
      <h1 className="section__heading">
        {DOMAIN}/{dir}/
      </h1>

      <ul className="dir__rows" role="list">
        <li className="dir__row">
          <span className="dir__date" />
          <Link className="dir__name" href="/">
            ../
          </Link>
          <span className="dir__desc" />
        </li>

        {rows.map((row) => (
          <li key={row.key} className={row.dim ? "dir__row dir__row--dim" : "dir__row"}>
            <span className="dir__date">{row.date ?? "—"}</span>
            {row.href ? (
              <a className="dir__name" href={row.href} {...externalLinkProps(row.href)}>
                {row.name}
              </a>
            ) : (
              <span className="dir__name">{row.name}</span>
            )}
            <span className="dir__desc">{row.desc}</span>
          </li>
        ))}
      </ul>

      {rows.length === 0 && <p>{empty}</p>}
    </main>
  );
}
