"use client";

import { BUSES } from "./grid.js";
import { ZONE_LABEL, usd } from "./format.js";

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
          {BUSES.map((b, i) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{ZONE_LABEL[b.zone]}</td>
              <td>{usd(lambda, 2)}</td>
              <td className={cong[i] < -0.005 ? "erc-lo" : cong[i] > 0.005 ? "erc-hi" : "elo-dim"}>
                {Math.abs(cong[i]) < 0.005 ? "—" : usd(cong[i], 2)}
              </td>
              <td>{usd(lmp[i], 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
