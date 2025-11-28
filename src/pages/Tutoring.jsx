import { Link } from 'react-router-dom';

function Tutoring() {
  return (
    <div className="container">
      <h2>Tutoring Offers</h2>
      <section>
        <p>
          So why should you hire me? I'm an AP Scholar with Distinction,
          National Merit Finalist, Presidential Scholar Candidate, and{' '}
          <a href="https://cse.umn.edu/mathcep/university-minnesota-talented-youth-mathematics-program-umtymp">
            UMTYMP
          </a>{' '}
          grad. I've scored 36/36 on the ACT, 1600/1600 on the SAT, and a 5/5 on
          every AP I've taken. For my students, I've distilled my experience
          into a set of simple ideas to learn efficiently and effectively.
        </p>
        <p>
          The prices listed below are per 45 minute session. I charge the same
          amount for both online and in-person lessons. The cost also includes
          asynchronous homework help / review.
        </p>
      </section>
      <hr />
      <section>
        <h3>$25</h3>
        <ul>
          <li>Algebra I & II</li>
          <li>Geometry</li>
          <li>Precalculus</li>
          <li>Non-AP High School STEM</li>
          <li>AP Computer Science A (Java)</li>
        </ul>
      </section>
      <hr />
      <section>
        <h3>$30</h3>
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
        <h3>$40</h3>
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
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default Tutoring;
