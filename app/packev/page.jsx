import Link from "next/link";
import { getPackEvData } from "../../lib/packev";
import PackEvDashboard from "../../components/packev/PackEvDashboard";

export const metadata = {
  title: "pack ev · keerthik.dev",
  description:
    "Expected value of Magic: The Gathering booster packs against their sealed price, for 39 sets since 2021.",
};

export default function PackEv() {
  const data = getPackEvData();

  return (
    <main className="page page--wide">
      <h1>pack ev</h1>
      <p className="subtitle">
        is a sealed magic pack worth more opened? {data.meta.sets} sets, every booster, weekly since {data.meta.historyStart.slice(0, 4)}
      </p>

      <PackEvDashboard data={data} />

      <hr />

      <p>
        how the numbers are made, and what&rsquo;s interesting in them:{" "}
        <Link href="/post/pack-ev">the write-up</Link>.
      </p>

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
