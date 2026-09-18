"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { simulate } from "./engine.js";
import { BUSES, ZONES } from "./grid.js";
import { DAYS, DAY_IDS } from "./days.js";
import {
  ZONE_LABEL, ZONE_VAR, usd, hhmm, homesLabel, homesFromSlider, sliderFromHomes,
} from "./format.js";
import PriceChart from "./PriceChart";
import NetworkMap from "./NetworkMap";
import Decomposition from "./Decomposition";
import Siting from "./Siting";

const MAX_HOMES = 8e6;
const LADDER = [0, 25e3, 100e3, 300e3, 800e3, 2e6, 4e6, 8e6];

// Base Power's published position, for scale. ~500 MWh of fleet across Texas
// and Illinois at 25 kWh a home is on the order of 20,000 homes; the signed
// utility programmes (CoServ, El Paso Electric, Austin Energy) are a further
// 200 MW+ of contracted capacity that is not yet in the ground.
const ANCHORS = [
  { homes: 20000, label: "Base today" },
  { homes: 200e6 / 11.4 / 1000, label: "signed programmes" },
  { homes: 1e6, label: "1M homes" },
];

const SPECS = {
  gen1: { label: "Gen 1 · 11.4 kW / 25 kWh", kwh: 25, kw: 11.4 },
  core: { label: "Base Core · 39.2 kWh", kwh: 39.2, kw: 11.4 },
};

export default function ErcotModel() {
  const [day, setDay] = useState("spring");
  const [slider, setSlider] = useState(sliderFromHomes(20000, MAX_HOMES));
  const [spec, setSpec] = useState("gen1");
  const [backup, setBackup] = useState(20);
  const [signal, setSignal] = useState("zonal");
  const [repOnly, setRepOnly] = useState(true);
  const [hour, setHour] = useState(20);
  const [ghost, setGhost] = useState(true);

  const [run, setRun] = useState(null);
  const [base, setBase] = useState(null);
  const [ladder, setLadder] = useState(null);
  const [busy, setBusy] = useState(true);
  const jobRef = useRef(0);

  const homes = homesFromSlider(slider, MAX_HOMES);
  const s = SPECS[spec];

  const opts = useMemo(
    () => ({
      day,
      kwhPerHome: s.kwh,
      kwPerHome: s.kw,
      backupReserve: backup / 100,
      signal,
      repOnly,
    }),
    [day, s.kwh, s.kw, backup, signal, repOnly],
  );

  // the counterfactual and the build-out path only move when something
  // structural does, so they are not recomputed as the slider is dragged
  useEffect(() => {
    const job = (jobRef.current += 1);
    setBusy(true);
    setLadder(null);
    const t = setTimeout(() => {
      if (job !== jobRef.current) return;
      const b = simulate({ ...opts, homes: 0 });
      setBase(b);
      const rows = [];
      let warm = b.warmStart;
      let i = 0;
      const step = () => {
        if (job !== jobRef.current) return;
        const r = simulate({ ...opts, homes: LADDER[i], warmStart: warm });
        warm = r.warmStart;
        rows.push({ homes: LADDER[i], marginal: Array.from(r.marginal) });
        i += 1;
        if (i < LADDER.length) setTimeout(step, 0);
        else setLadder(rows);
      };
      setTimeout(step, 0);
    }, 0);
    return () => clearTimeout(t);
  }, [opts]);

  useEffect(() => {
    if (!base) return;
    const job = jobRef.current;
    setBusy(true);
    const t = setTimeout(() => {
      if (job !== jobRef.current) return;
      setRun(homes === 0 ? base : simulate({ ...opts, homes, warmStart: base.warmStart }));
      setBusy(false);
    }, 140);
    return () => clearTimeout(t);
  }, [base, homes, opts]);

  if (!run || !base) {
    return <p className="elo-sub">solving dispatch&hellip;</p>;
  }

  const st = run.stats;
  const lmpAt = BUSES.map((_, b) => run.lmp[b][hour]);
  const congAt = BUSES.map((_, b) => run.cong[b][hour]);
  const bindings = run.binding[hour];

  return (
    <div className="erc">
      <h2>controls</h2>
      <div className="erc-controls">
        <label>
          day{" "}
          <select className="elo-select" value={day} onChange={(e) => setDay(e.target.value)}>
            {DAY_IDS.map((d) => (
              <option key={d} value={d}>{DAYS[d].label}</option>
            ))}
          </select>
        </label>
        <label>
          battery{" "}
          <select className="elo-select" value={spec} onChange={(e) => setSpec(e.target.value)}>
            {Object.entries(SPECS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
        <label>
          settled at{" "}
          <select className="elo-select" value={signal} onChange={(e) => setSignal(e.target.value)}>
            <option value="zonal">Load Zone price</option>
            <option value="nodal">its own bus LMP</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={repOnly} onChange={(e) => setRepOnly(e.target.checked)} />{" "}
          only where a REP may sell
        </label>
      </div>

      <div className="erc-controls">
        <label className="erc-wide">
          homes with a battery: <b>{homesLabel(homes)}</b>{" "}
          <span className="elo-dim">
            ({st.fleetPowerGW.toFixed(2)} GW &middot; {st.fleetEnergyGWh.toFixed(1)} GWh usable)
          </span>
          <input
            type="range"
            min="0"
            max="1000"
            value={slider}
            onChange={(e) => setSlider(+e.target.value)}
          />
        </label>
        <span className="erc-anchors">
          {ANCHORS.map((a) => (
            <button
              key={a.label}
              type="button"
              className="maze__link"
              onClick={() => setSlider(sliderFromHomes(Math.round(a.homes), MAX_HOMES))}
            >
              {a.label} ({homesLabel(Math.round(a.homes))})
            </button>
          ))}
        </span>
        <label>
          held back for outages: {backup}%
          <input type="range" min="0" max="60" step="5" value={backup} onChange={(e) => setBackup(+e.target.value)} />
        </label>
      </div>

      <p className="elo-sub">{DAYS[day].note}</p>

      <h2>the price shape</h2>
      <p className="elo-sub">
        Four Load Zone prices &mdash; each the load-weighted average of the bus LMPs inside it &mdash;
        against the system lambda. {busy ? "solving…" : `click the chart to move the hour (now ${hhmm(hour)})`}.
      </p>
      <div className="elo-legend">
        {ZONES.map((z) => (
          <span className="elo-key" key={z}>
            <i className="elo-swatch elo-swatch--line" style={{ background: ZONE_VAR[z] }} />
            LZ_{ZONE_LABEL[z].toUpperCase()}
          </span>
        ))}
        <span className="elo-key">
          <i className="elo-swatch elo-swatch--line" style={{ background: "var(--dim)" }} />
          system &lambda;
        </span>
        <span className="elo-key">
          <input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} />
          same day, no fleet
        </span>
      </div>
      <div className="elo-chartwrap">
        <PriceChart
          zp={run.zp}
          lambda={run.lambda}
          ghost={ghost && run !== base ? base.zp : null}
          hour={hour}
          onHour={setHour}
        />
      </div>

      <ul className="now">
        <li>load-weighted average price &middot; {usd(st.avgLoadWeighted, 2)}/MWh</li>
        <li>highest bus price of the day &middot; {usd(st.peakPrice)}/MWh</li>
        <li>wind and solar curtailed &middot; {Math.max(0, st.curtailGWh).toFixed(0)} GWh</li>
        <li>load shed &middot; {st.shedGWh.toFixed(1)} GWh</li>
        <li>the fleet earns &middot; {usd(st.fleetRevPerKWday, 3)} per kW per day</li>
        <li className="elo-dim">
          {run.meta.converged
            ? `fixed point settled in ${run.meta.iters} iterations`
            : `fixed point not settled after ${run.meta.iters}; last price move ${usd(run.meta.priceMove, 2)}/MWh`}
        </li>
      </ul>

      <h2>which constraint made that price</h2>
      <p className="elo-sub">
        At {hhmm(hour)}. The congestion component is the whole of the difference between a bus and
        the system lambda: a bus whose injections would load a binding constraint prices below
        &lambda;, one whose injections would relieve it prices above.
      </p>
      <label className="erc-hour">
        hour{" "}
        <input type="range" min="0" max="23" value={hour} onChange={(e) => setHour(+e.target.value)} />{" "}
        {hhmm(hour)}
      </label>
      <div className="elo-chartwrap">
        <NetworkMap lmp={lmpAt} lambda={run.lambda[hour]} flow={run.flows[hour]} binding={bindings} />
      </div>
      {bindings.length > 0 ? (
        <ul className="now">
          {bindings.map((b) => (
            <li key={b.id}>
              {b.kind === "gtc" ? "GTC " : ""}{b.id} &middot; {Math.round(b.flow)}/{b.limit} MW
              &middot; &mu; {usd(b.mu)}/MW
            </li>
          ))}
        </ul>
      ) : (
        <p className="elo-sub">nothing binding at {hhmm(hour)} — every bus prices at &lambda;.</p>
      )}
      <Decomposition lmp={lmpAt} cong={congAt} lambda={run.lambda[hour]} />

      <h2>where the next battery earns most</h2>
      <p className="elo-sub">
        The arbitrage value of one more marginal megawatt at each bus, against that bus&rsquo;s own
        settled prices. A marginal unit does not move the price, so this is what the next battery
        would actually capture. Energy only &mdash; ancillary revenue is location-neutral and is not
        counted, so these are floors.
      </p>
      <Siting marginal={run.marginal} ladder={ladder} homes={homes} maxHomes={MAX_HOMES} />
    </div>
  );
}
