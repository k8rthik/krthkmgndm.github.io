import Link from "next/link";

export const metadata = {
  title: "lab — keerthik.dev",
};

export default function Lab() {
  return (
    <main className="page">
      <h1>Lab notebook</h1>
      <p className="subtitle">unlisted. in progress.</p>

      <p>
        Things I&apos;m chewing on, half-built, or not yet worth a full project
        entry. Updated whenever I remember to.
      </p>

      <hr />

      <section>
        <h2>Currently on the bench</h2>
        <ul>
          <li>
            Graph-attention encoders for SMILES → binding affinity. Still
            losing to a vanilla GNN by a few mAE points; reading more carefully
            before training more.
          </li>
          <li>
            A small ablation on protein-folding GAN loss terms. Mostly to
            convince myself folduzz can be coaxed past mode collapse.
          </li>
          <li>
            A long-form post on what biomedical undergrads should learn about
            ML before they learn ML.
          </li>
        </ul>
      </section>

      <hr />

      <section>
        <h2>Shelved</h2>
        <ul>
          <li>
            BioScrolls v2 — multilingual entity linking across PubMed and
            chinese-language pre-prints. Paused; the data licensing got messy.
          </li>
          <li>
            A Bayesian dose-response tool for the lab. Underspecified;
            re-scoping with my PI.
          </li>
        </ul>
      </section>

      <hr />

      <p className="colophon">
        you found this page. nice. tell no one.
      </p>

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
