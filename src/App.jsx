import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AllPosts from './pages/AllPosts';
import AllProjects from './pages/AllProjects';
import Post from './pages/Post';
import Tutoring from './pages/Tutoring';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/all-posts" element={<AllPosts />} />
      <Route path="/all-projects" element={<AllProjects />} />
      <Route path="/post/:slug" element={<Post />} />
      <Route path="/tutoring" element={<Tutoring />} />
    </Routes>
  );
}

export default App;
