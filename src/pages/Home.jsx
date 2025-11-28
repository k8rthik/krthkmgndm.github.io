import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Home() {
  const [posts, setPosts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    // Fetch blog posts
    fetch('/api/posts')
      .then(response => response.json())
      .then(data => {
        setPosts(data.filter(post => post.active !== 0).slice(0, 3));
        setLoadingPosts(false);
      })
      .catch(error => {
        console.error('Error fetching blog posts:', error);
        setLoadingPosts(false);
      });

    // Fetch projects
    fetch('/projects.json')
      .then(response => response.json())
      .then(data => {
        setProjects(data.filter(project => project.active));
        setLoadingProjects(false);
      })
      .catch(error => {
        console.error('Error fetching projects:', error);
        setLoadingProjects(false);
      });
  }, []);

  return (
    <div className="container">
      <h2>Keerthik Muruganandam</h2>
      <p className="subtitle">human</p>
      <p>
        murug030 [at] umn [dot] edu <br />
        <a href="https://www.linkedin.com/in/mkeerthik/">LinkedIn</a> /
        <a href="https://github.com/krthkmgndm">GitHub</a>
      </p>
      <p>
        I'm a biomedical engineering and computer science undergrad at the{' '}
        <a href="https://twin-cities.umn.edu/">University of Minnesota</a>. My
        interests include machine learning, cell programming, bioinformatics,
        bioengineering, productivity, politics, and entrepreneurship. Shoot me
        an email or DM on{' '}
        <a href="https://linkedin.com/in/mkeerthik">LinkedIn</a> if you want to
        chat!
      </p>
      <hr />
      <section className="blog-recent">
        <h2>Recent Blog Posts</h2>
        <div id="blog-container">
          {loadingPosts ? (
            'Loading...'
          ) : posts.length === 0 ? (
            'No posts available.'
          ) : (
            posts.map(post => (
              <p key={post.slug}>
                <span>
                  <Link to={`/post/${post.slug}`}>{post.title}</Link>
                </span>
                <span>
                  <em>
                    {new Date(post.date).toLocaleDateString()} • {post.time} minute read
                  </em>
                </span>
                <span>{post.description}</span>
              </p>
            ))
          )}
        </div>
        <p>
          A full list of blog posts can be found <Link to="/all-posts">here</Link>.
        </p>
      </section>
      <hr />
      <section className="experience">
        <h2>Experience</h2>
        <p>
          <span>
            <strong>Student Researcher</strong> (Dec 2024 - Present)
          </span>
          <span>
            <em>Sachs Lab (The Laboratory of Molecular Therapeutics)</em>
          </span>
          <span>
            Learning a ton of laboratory techniques and getting my hands dirty with
            bench work.
          </span>
        </p>
        <p>
          <span>
            <strong>Analyst</strong> (Oct 2024 - Present)
          </span>
          <span>
            <em>Atland Ventures</em>
          </span>
          <span>
            Sourcing pre-seed & seed stage startups to conduct due diligence on
            and present for investment to the fund.
          </span>
        </p>
      </section>
      <hr />
      <section className="projects">
        <h2>Projects</h2>
        <div id="project-container">
          {loadingProjects ? (
            'Loading...'
          ) : projects.length === 0 ? (
            'No projects available.'
          ) : (
            projects.map(project => (
              <p key={project.name}>
                <span>
                  <strong>{project.name}</strong>
                </span>
                <span>{project.description}</span>
                <span>
                  [<a href={project.demo}>demo</a>] [<a href={project.code}>code</a>]
                </span>
              </p>
            ))
          )}
        </div>
      </section>
      <hr />
      <section className="education">
        <h2>Education</h2>
        <p>
          <span>
            <strong>University of Minnesota, Twin Cities</strong> (Sep 2024 - Present)
          </span>
          <span>
            <em>
              B.Eng. Biomedical Engineering, B.S. Computer Science, Minor in
              Mathematics
            </em>
          </span>
        </p>
        <p>
          <span>
            <strong>University of Minnesota, Twin Cities</strong> (Sep 2023 - May 2024)
          </span>
          <span>
            <em>
              <a href="https://ccaps.umn.edu/post-secondary-enrollment-options-pseo">
                Post-Secondary Enrollment Options
              </a>
            </em>
          </span>
        </p>
        <p>
          <span>
            <strong>Edina Senior High School</strong> (Aug 2020 - Jun 2024)
          </span>
          <span>
            <em>Graduated with Distinction</em>
          </span>
        </p>
        <p>
          <span>
            <strong>University of Minnesota, Twin Cities</strong> (Sep 2018 - May 2023)
          </span>
          <span>
            <em>
              <a href="https://cse.umn.edu/mathcep/university-minnesota-talented-youth-mathematics-program-umtymp">
                University of Minnesota Talented Youth Mathematics Program
              </a>
            </em>
          </span>
        </p>
      </section>
      <hr />
      <p className="subtitle">Last updated March 21, 2025</p>
    </div>
  );
}

export default Home;
