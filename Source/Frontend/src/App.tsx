// Verifies: FR-WF-009 (React app scaffolding with routing)

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { WorkItemListPage } from './pages/WorkItemListPage';
import { WorkItemDetailPage } from './pages/WorkItemDetailPage';
import { CreateWorkItemPage } from './pages/CreateWorkItemPage';
import { DebugPortalPage } from './pages/DebugPortalPage';

// Verifies: FR-WF-009 — React Router with all routes (/, /work-items, /work-items/new, /work-items/:id, /debug)
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/work-items" element={<WorkItemListPage />} />
          <Route path="/work-items/new" element={<CreateWorkItemPage />} />
          <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
          <Route path="/debug" element={<DebugPortalPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
