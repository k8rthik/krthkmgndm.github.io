import Link from "next/link";

const DEMO_URL = "https://k8rthik.github.io/openbsl/";
const REPO_URL = "https://github.com/k8rthik/openbsl";

export const metadata = {
  title: "openbsl · keerthik.dev",
  description:
    "Open Biopac Student Lab recordings without the proprietary software: CSV export and a browser viewer that fills in the lab's data report as you measure.",
};

export default function OpenBsl() {
  return (
    <main className="page page--wide">
      <h1>openbsl</h1>
      <p className="subtitle">Biopac Student Lab recordings, without Biopac Student Lab</p>

      <p>
        Physiology labs record ECG, pulse and heart sounds with Biopac&rsquo;s BSL software, then
        send you home with files that only BSL opens, on a license that lives in the lab. The
        analysis the report asks for is simple: select from one R wave to the next and read off
        Delta&nbsp;T, BPM and peak-to-peak amplitude. The data can still only be read on campus.
      </p>
      <p>
        openbsl reads the files with the open-source{" "}
        <a href="https://github.com/uwmadison-chm/bioread" target="_blank" rel="noreferrer">
          bioread
        </a>{" "}
        parser, exports them to CSV, and builds a static page that reproduces the part of BSL a
        lab report needs. You drag across the trace, read the same measurement boxes BSL shows,
        label the selection, and the lesson&rsquo;s data report tables fill themselves in. It
        handles Lessons 5 (ECG), 7 (ECG &amp; pulse) and 17 (heart sounds).
      </p>

      <p>
        The demo below runs on synthetic recordings (drag to select, scroll to zoom, Enter to
        save). <a href={DEMO_URL} target="_blank" rel="noreferrer">Open it full-size</a>.
      </p>
      <iframe
        src={DEMO_URL}
        title="openbsl viewer demo"
        loading="lazy"
        style={{ width: "100%", height: "38rem", border: "1px solid var(--rule)" }}
      />

      <h2>how it works</h2>
      <ul>
        <li>
          <b>Reading.</b> bioread parses the AcqKnowledge container into channels and event
          markers. BSL writes each recording segment (Supine, Seated, After exercise) as an
          &ldquo;append&rdquo; marker, and the keypresses a recorder makes during a lesson as
          &ldquo;default&rdquo; markers. Those become the conditions the report is organised by.
        </li>
        <li>
          <b>Measuring.</b> The viewer is one canvas with min/max decimation per pixel column, so
          two minutes at 1&nbsp;kHz pans smoothly. BSL&rsquo;s heart-rate channel only changes once
          per beat, so it is shipped as change points (about 200 numbers instead of 120,000).
          Everything runs from <code>file://</code> with no server and no network requests.
        </li>
        <li>
          <b>Reporting.</b> Each lesson is one config object: its conditions, the components to
          label, a hint for where each selection goes, and a function from annotations to the
          report tables. Adding a lesson doesn&rsquo;t touch the viewer.
        </li>
        <li>
          <b>Trust.</b> Beat detection is tested against synthetic ECG with known beat times, and
          the report math against hand-computed tables. The public demo is synthetic because real
          recordings are someone&rsquo;s health data.
        </li>
      </ul>

      <p>
        The longer write-up, including why automatic wave delineation lost to a human with a
        mouse, is in the <Link href="/post/openbsl">blog post</Link>. Code is on{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>.
      </p>

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
