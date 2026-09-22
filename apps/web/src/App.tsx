import { Route, Routes } from 'react-router-dom';
import { EntryPage } from './pages/EntryPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>oh-story 创作平台</h1>
        <p className="app-subtitle">短剧创作产品 · 运行骨架</p>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
