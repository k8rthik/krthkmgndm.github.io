"use client";

import { useMemo, useState } from "react";
import { Tooltip, useTooltip } from "../elo/Tooltip";
import AgingChart from "./AgingChart";
import SeriesChart from "./SeriesChart";
import {
  ROLE_VAR,
  agingPoints,
  boosterKey,
  milestoneGrid,
  pct,
  seriesPoints,
  tableRows,
  usd,
} from "./derive";

const PRICING = [
  ["market", "market prices"],
  ["bulk", "bulk at $0"],
];
const SORTS = [
  [null, "newest"],
  ["ratio", "EV ÷ price"],
  ["ev", "EV"],
];

export default function PackEvDashboard({ data }) {
  const tooltip = useTooltip();
  const [pricing, setPricing] = useState("market");
  const [role, setRole] = useState(null);
  const [sort, setSort] = useState(null);
  const [selected, setSelected] = useState(
    () => boosterKey(data.boosters.find((b) => b.series.length >= 12) ?? data.boosters[0]),
  );

  const { meta, roles, cross } = data;
  const aging = useMemo(
    () => Object.fromEntries(roles.map((r) => [r, agingPoints(cross, pricing, r, meta.minSeries)])),
    [cross, pricing, roles, meta.minSeries],
  );
  const all = Object.values(aging).flat();
  const yMax = Math.max(1.5, ...all.map((p) => p.p75));
  const xMax = Math.max(...all.map((p) => p.age));
  const grid = milestoneGrid(cross[pricing].milestones, roles);
  const rows = tableRows(data.boosters, { pricing, role, sort });
  const current = data.boosters.find((b) => boosterKey(b) === selected) ?? data.boosters[0];
  const currentRow = tableRows([current], { pricing })[0];

  return (
    <div className="pev">
      <div className="pev-controls" role="group" aria-label="card pricing">
        value cards at:{" "}
        {PRICING.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={pricing === key} onClick={() => setPricing(key)}>
            {label}
          </button>
        ))}
        <span className="subtitle">
          {pricing === "bulk" ? `cards under ${usd(meta.bulkFloor)} count as $0` : "TCGplayer market price for every card"}
        </span>
      </div>

      <h2>how EV ages, across {meta.sets} sets</h2>
      <p className="subtitle">EV as a share of the sealed pack price, by weeks since release. line: median set; band: middle 50%.</p>
      <div className="pev-panels">
        {roles.map((r) => (
          <figure key={r} className="pev-panel">
            <figcaption>{r} boosters</figcaption>
            <AgingChart points={aging[r]} color={ROLE_VAR[r]} yMax={yMax} xMax={xMax} tooltip={tooltip} label={`${r} boosters`} />
          </figure>
        ))}
      </div>

      <div className="elo-tablewrap">
        <table className="elo-data">
          <thead>
            <tr>
              <th>opening beats sealed</th>
              {grid.columns.map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.role}>
                <td><span className="pev-key" style={{ background: ROLE_VAR[row.role] }} />{row.role}</td>
                {row.cells.map((c, i) => (
                  <td key={grid.columns[i]}>
                    {c ? <>{pct(c.shareAbove)} <span className="pev-dim">of {c.n}</span></> : "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>every set and booster</h2>
      <div className="pev-controls">
        show:{" "}
        {[null, ...roles].map((r) => (
          <button key={r ?? "all"} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
            {r ?? "all"}
          </button>
        ))}
        {" "}sort:{" "}
        {SORTS.map(([key, label]) => (
          <button key={label} type="button" aria-pressed={sort === key} onClick={() => setSort(key)}>
            {label}
          </button>
        ))}
      </div>

      <h3>
        {current.setName}, {current.booster.toLowerCase()}
      </h3>
      <p className="pev-stats">
        pack {usd(currentRow.price)} · EV {usd(currentRow.value)} ·{" "}
        <span className={currentRow.ratio >= 1 ? "elo-pos" : "elo-neg"}>{pct(currentRow.ratio)} of price</span>
        {current.weeks ? ` · above price ${current.weeksAbove} of ${current.weeks} weeks` : ""}
      </p>
      <div className="elo-chartwrap">
        <SeriesChart points={seriesPoints(current, pricing)} color={ROLE_VAR[current.role]} tooltip={tooltip}
          label={`${current.setName} ${current.booster}`} />
      </div>

      <div className="elo-tablewrap pev-scroll">
        <table className="elo-data pev-list">
          <thead>
            <tr>
              <th>set</th>
              <th>booster</th>
              <th>pack</th>
              <th>EV</th>
              <th>EV ÷ price</th>
              <th>weeks above</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const key = boosterKey(b);
              return (
                <tr key={key} aria-selected={key === selected}>
                  <td>
                    <button type="button" className="pev-link" onClick={() => setSelected(key)}>
                      {b.setName}
                    </button>{" "}
                    <span className="pev-dim">{b.release.slice(0, 4)}</span>
                  </td>
                  <td><span className="pev-key" style={{ background: ROLE_VAR[b.role] }} />{b.booster.replace(" Booster", "").toLowerCase()}</td>
                  <td>{usd(b.price)}</td>
                  <td>{usd(b.value)}</td>
                  <td className={b.ratio == null ? "" : b.ratio >= 1 ? "elo-pos" : "elo-neg"}>{pct(b.ratio)}</td>
                  <td>{b.weeks ? `${b.weeksAbove}/${b.weeks}` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="subtitle">
        prices as of {meta.generated}; weekly history from {meta.historyStart}. source and method:{" "}
        <a href={meta.source}>pack-ev</a>.
      </p>
      <Tooltip tip={tooltip.tip} />
    </div>
  );
}
