"use client";

import { BUSES } from "./grid.js";
import { ZONE_LABEL, usd } from "./format.js";
import { congestionTone } from "./shade.js";

const TONE_CLASS = { lo: "erc-lo", hi: "erc-hi", none: "elo-dim" };

// LMP_b = lambda - sum_k SF_bk mu_k, one row per bus, at the selected hour.
export default function Decomposition({ lmp, cong, lambda }) {
  return (
    <div className="elo-tablewrap">
      <table className="elo-data">
        <thead>
          <tr>
            <th>bus</th>
            <th>zone</th>
            <th>&lambda;</th>
            <th>congestion</th>
            <th>LMP</th>
          </tr>
        </thead>
        <tbody>
          {BUSES.map((b, i) => {
            const tone = congestionTone(cong[i]);
            return (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{ZONE_LABEL[b.zone]}</td>
                <td>{usd(lambda, 2)}</td>
                <td className={TONE_CLASS[tone ?? "none"]}>{tone ? usd(cong[i], 2) : "—"}</td>
                <td>{usd(lmp[i], 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
