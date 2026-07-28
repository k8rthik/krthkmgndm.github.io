"use client";

import { useTooltip, Tooltip } from "./Tooltip";
import { colorFor, SLOT_COUNT } from "./format";
import SessionSummary from "./SessionSummary";
import RatingChart from "./RatingChart";
import Leaderboard from "./Leaderboard";
import GameScatter from "./GameScatter";
import HeadToHead from "./HeadToHead";

export default function EloDashboard({ data }) {
  const tooltip = useTooltip();
  const { corePlayers, players, series, events, sessions, games, headToHead } = data;

  return (
    <div className="elo">
      <h2>rating over pod playtime</h2>
      <p className="elo-sub">regulars (10+ plays) only.</p>
      <p className="elo-legend">
        {corePlayers.slice(0, SLOT_COUNT).map((n) => (
          <span key={n} className="elo-key">
            <span
              className="elo-swatch elo-swatch--line"
              style={{ background: colorFor(corePlayers, n) }}
            />
            {n}
          </span>
        ))}
      </p>
      <RatingChart
        series={series}
        events={events}
        corePlayers={corePlayers}
        tooltip={tooltip}
      />

      <h2>game weight</h2>
      <p className="elo-sub">bubble size = elo multiplier.</p>
      <GameScatter games={games} events={events} tooltip={tooltip} />

      <h2>session summary</h2>
      <SessionSummary sessions={sessions} corePlayers={corePlayers} />

      <h2>leaderboard</h2>
      <p className="elo-sub">pae = actual − expected win share.</p>
      <Leaderboard players={players} corePlayers={corePlayers} />

      <h2>head-to-head</h2>
      <p className="elo-sub">
        row player&rsquo;s relative wins vs. column player.
      </p>
      <HeadToHead headToHead={headToHead} corePlayers={corePlayers} tooltip={tooltip} />

      <Tooltip tip={tooltip.tip} />
    </div>
  );
}
