import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Canvas from './pages/Canvas';
import About from './pages/About';
import ProjectDetail from './pages/ProjectDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Canvas />} />
        <Route path="/about" element={<About />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
