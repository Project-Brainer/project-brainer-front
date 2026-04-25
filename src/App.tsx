import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProjectPage } from './pages/ProjectPage';
import { ProjectsListPage } from './pages/ProjectsListPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsListPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
