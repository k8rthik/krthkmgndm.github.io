"use client";

import { useMemo, useState } from "react";
import { useTooltip, Tooltip } from "./Tooltip";
import { colorFor } from "./format";
import { statsAsOf, headToHeadAsOf, affinityAsOf, sessionBand } from "./asOf";
import { preGameSeries } from "./series";
import { recordsAsOf, profileExtrasAsOf } from "./insights";
import { gamesAsOf } from "./games";
import SessionSummary from "./SessionSummary";
import RatingChart from "./RatingChart";
import Leaderboard from "./Leaderboard";
import GameScatter from "./GameScatter";
import HeadToHead from "./HeadToHead";
import Affinity from "./Affinity";
import Records from "./Records";
import GamesTable from "./GamesTable";

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
  const affinity = useMemo(
    () => affinityAsOf(events, corePlayers, date),
    [events, corePlayers, date],
  );
  const podRecords = useMemo(
    () => recordsAsOf(events, series, corePlayers, date),
    [events, series, corePlayers, date],
  );
  const extras = useMemo(
    () => profileExtrasAsOf(events, corePlayers, date),
    [events, corePlayers, date],
  );
  const gameTable = useMemo(
    () => gamesAsOf(data.playLog ?? [], date),
    [data.playLog, date],
  );
  const band = useMemo(() => sessionBand(events, date), [events, date]);
  const chartSeries = useMemo(() => preGameSeries(series, events), [series, events]);
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
        {corePlayers.map((n) => (
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
        series={chartSeries}
        events={events}
        corePlayers={corePlayers}
        tooltip={tooltip}
        band={band}
      />

      {/* elo race shelved for now — component lives in ./EloRace.jsx:
      <h2>elo race</h2>
      <p className="elo-sub">the rating chart, replayed — press play.</p>
      <EloRace series={series} events={events} corePlayers={corePlayers} date={date} />
      */}

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

      <h2>player–game affinity</h2>
      <p className="elo-sub">through {date} — hover for the record.</p>
      <Affinity affinity={affinity} corePlayers={corePlayers} tooltip={tooltip} />

      <h2>head-to-head</h2>
      <p className="elo-sub">
        through {date} — click a matchup for its play log.
      </p>
      <HeadToHead
        records={records}
        corePlayers={corePlayers}
        tooltip={tooltip}
        events={events}
        date={date}
      />

      <h2>hall of fame</h2>
      <p className="elo-sub">pod superlatives through {date}.</p>
      <Records records={podRecords} />

      <h2>leaderboard</h2>
      <p className="elo-sub">
        through {date} — click column to sort, a regular for their profile.
      </p>
      <Leaderboard
        stats={stats}
        corePlayers={corePlayers}
        affinity={affinity}
        h2h={records}
        extras={extras}
      />

      <h2>games</h2>
      <p className="elo-sub">
        through {date} — h-index: {gameTable.hIndex}. click a game for its
        stat sheet.
      </p>
      <GamesTable rows={gameTable.rows} events={events} date={date} />

      <Tooltip tip={tooltip.tip} />
    </div>
  );
}
