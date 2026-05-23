import Link from "next/link";

export default function Tutoring() {
  return (
    <main className="page">
      <h1>Tutoring</h1>
      <p className="subtitle">a short rate card</p>

      <p>
        Why hire me? AP Scholar with Distinction, National Merit Finalist,
        Presidential Scholar Candidate, and{" "}
        <a href="https://cse.umn.edu/mathcep/university-minnesota-talented-youth-mathematics-program-umtymp">
          UMTYMP
        </a>{" "}
        grad. 36/36 ACT, 1600/1600 SAT, 5 on every AP I&apos;ve taken. For my
        students I&apos;ve distilled this into a small set of ideas for
        learning efficiently.
      </p>
      <p>
        Prices below are per 45-minute session, same online or in person, and
        include async homework help and review.
      </p>

      <hr />

      <section>
        <h2>$25</h2>
        <ul>
          <li>Algebra I &amp; II</li>
          <li>Geometry</li>
          <li>Precalculus</li>
          <li>Non-AP high school STEM</li>
          <li>AP Computer Science A (Java)</li>
        </ul>
      </section>

      <hr />

      <section>
        <h2>$30</h2>
        <ul>
          <li>AP Biology</li>
          <li>AP Statistics</li>
          <li>AP English Literature</li>
          <li>AP English Language</li>
          <li>AP Latin</li>
        </ul>
      </section>

      <hr />

      <section>
        <h2>$40</h2>
        <ul>
          <li>ACT / SAT</li>
          <li>AP Physics</li>
          <li>AP Chemistry</li>
          <li>Multivariable Calculus</li>
          <li>Linear Algebra</li>
          <li>College STEM</li>
        </ul>
      </section>

      <hr />

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
