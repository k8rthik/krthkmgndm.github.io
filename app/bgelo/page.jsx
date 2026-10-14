import Link from "next/link";
import { getEloData } from "../../lib/elo";
import EloDashboard from "../../components/elo/EloDashboard";
import BackLink from "../../components/BackLink";

export const metadata = {
  title: "bgelo",
  description: "board-game elo ratings for the pod, from BG Stats plays",
};

export default function Bgelo() {
  const data = getEloData();

  return (
    <main className="page page--wide">
      <h1>bgelo</h1>

      <EloDashboard data={data} />

      <hr />

      <p>
        curious how the ratings work? read{" "}
        <Link href="/post/bgelo">the write-up</Link>.
      </p>

      <BackLink />
    </main>
  );
}
