import Link from "next/link";
import { getEloData } from "../../lib/elo";
import EloDashboard from "../../components/elo/EloDashboard";

export const metadata = {
  title: "bgelo · keerthik.dev",
  description: "board-game elo ratings for the pod, from BG Stats plays",
};

export default function Playing() {
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

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
