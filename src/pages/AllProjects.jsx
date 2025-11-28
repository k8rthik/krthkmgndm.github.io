import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function AllProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/projects.json')
      .then(response => response.json())
      .then(data => {
        setProjects(data.filter(project => project.active));
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching projects:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <h2>All Projects</h2>
      <div id="project-container">
        {loading ? (
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
      <hr />
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default AllProjects;
