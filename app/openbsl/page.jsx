import Link from "next/link";
import BackLink from "../../components/BackLink";

const DEMO_URL = "https://k8rthik.github.io/openbsl/";
const REPO_URL = "https://github.com/k8rthik/openbsl";

export const metadata = {
  title: "openbsl",
  description:
    "Open Biopac Student Lab recordings without the proprietary software: CSV export, a browser viewer that fills in the lab's data report as you measure, and automated mean-electrical-axis and blood-pressure analyses.",
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
        handles Lessons 5 (ECG), 6 (ECG II: Einthoven&rsquo;s law and the mean electrical axis),
        7 (ECG &amp; pulse), 16 (blood pressure) and 17 (heart sounds).
      </p>
      <p>
        For Lessons 6 and 16 it also does the analysis itself. <code>openbsl axis</code> measures
        the QRS waves on Leads I and III and draws the vectorgrams the report asks you to plot
        with a protractor. <code>openbsl bp</code> finds the Korotkoff sounds on the stethoscope
        channel and reports the cuff pressure where the microphone heard systolic and diastolic,
        next to where the person listening pressed the marker.
      </p>

      <p>
        The demo below runs on synthetic recordings (drag to select, scroll to zoom, Enter to
        save). <a href={DEMO_URL} target="_blank" rel="noreferrer">Open it full-size</a>.
      </p>
      <iframe
        src={DEMO_URL}
        title="openbsl viewer demo"
        loading="lazy"
        className="embed-frame"
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
          <b>Automating only what&rsquo;s reliable.</b> P- and T-wave boundaries are too noisy to
          automate, but QRS amplitudes are large and sharp, and Korotkoff sounds have a giveaway:
          each one arrives at nearly the same delay after an R wave. The stethoscope under the cuff
          hears rustle as loud as the sounds, so the detector looks for runs of heartbeat-locked
          sounds rather than loud ones. When the sounds aren&rsquo;t clearly there, it leaves the
          table empty instead of guessing.
        </li>
        <li>
          <b>Trust.</b> Beat detection is tested against synthetic ECG with known beat times, the
          axis against synthetic leads built from known heart vectors, the sound detector against
          synthetic cuff recordings with known pressures (within 3.5&nbsp;mmHg in 57 of 60
          trials, no false detections on noise-only data), and the report math against
          hand-computed tables. The public demo is synthetic because real
          recordings are someone&rsquo;s health data.
        </li>
      </ul>

      <p>
        The longer write-up, including why automatic wave delineation lost to a human with a
        mouse, is in the <Link href="/post/openbsl">blog post</Link>. Code is on{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>.
      </p>

      <BackLink />
    </main>
  );
}
