import Link from "next/link";
import { getPackEvData } from "../../lib/packev";
import PackEvDashboard from "../../components/packev/PackEvDashboard";
import { packevSummary } from "../../components/packev/derive";
import BackLink from "../../components/BackLink";

export function generateMetadata() {
  return {
    title: "pack ev",
    description: packevSummary(getPackEvData().meta).description,
  };
}

export default function PackEv() {
  const data = getPackEvData();
  const summary = packevSummary(data.meta);

  return (
    <main className="page page--wide">
      <h1>pack ev</h1>
      <p className="subtitle">
        is a sealed magic pack worth more opened? {summary.sets} sets, every booster, weekly since {summary.sinceYear}
      </p>

      <PackEvDashboard data={data} />

      <hr />

      <p>
        how the numbers are made, and what&rsquo;s interesting in them:{" "}
        <Link href="/post/pack-ev">the write-up</Link>.
      </p>

      <BackLink />
    </main>
  );
}
