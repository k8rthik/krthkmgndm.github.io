"use client";

import { useMemo, useState } from "react";
import { useTooltip, Tooltip } from "./Tooltip";
import { colorFor, SLOT_COUNT } from "./format";
import { statsAsOf, headToHeadAsOf, sessionBand } from "./asOf";
import SessionSummary from "./SessionSummary";
import RatingChart from "./RatingChart";
import Leaderboard from "./Leaderboard";
import GameScatter from "./GameScatter";
import HeadToHead from "./HeadToHead";

export default function EloDashboard({ data }) {
  const tooltip = useTooltip();
  const { corePlayers, series, events, sessions, games } = data;

  // the session picker is the page's as-of-date control: every section
  // below reflects the state of the pod through the selected date
  const [date, setDate] = useState(sessions[0]?.date ?? "");
  const session = sessions.find((s) => s.date === date) ?? sessions[0];

  const stats = useMemo(() => statsAsOf(data, date), [data, date]);
  const records = useMemo(
    () => headToHeadAsOf(events, corePlayers, date),
    [events, corePlayers, date],
  );
  const band = useMemo(() => sessionBand(events, date), [events, date]);
  const sessionGames = useMemo(
    () => new Set(session?.games ?? []),
    [session],
  );

  return (
    <div className="elo">
      <h2>session summaries</h2>
      <SessionSummary
        sessions={sessions}
        corePlayers={corePlayers}
        date={date}
        onDateChange={setDate}
      />

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
        band={band}
      />

      <h2>game weight</h2>
      <p className="elo-sub">
        bubble size = elo multiplier. highlighted = played that session.
      </p>
      <GameScatter
        games={games}
        events={events}
        tooltip={tooltip}
        highlight={sessionGames}
      />

      <h2>leaderboard</h2>
      <p className="elo-sub">through {date}</p>
      <Leaderboard stats={stats} corePlayers={corePlayers} />

      <h2>head-to-head</h2>
      <p className="elo-sub">
        through {date} — row player&rsquo;s relative wins vs. column player.
        click a matchup for its play log.
      </p>
      <HeadToHead
        records={records}
        corePlayers={corePlayers}
        tooltip={tooltip}
        events={events}
        date={date}
      />

      <Tooltip tip={tooltip.tip} />
    </div>
  );
}
