// Verifies: FR-022
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { FeatureRequestsPage } from './pages/FeatureRequestsPage'
import { BugReportsPage } from './pages/BugReportsPage'
import { OrchestratorCyclesPage } from './pages/OrchestratorCyclesPage'
import { FeatureBrowserPage } from './pages/FeatureBrowserPage'
import { LearningsPage } from './pages/LearningsPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { DevelopmentCyclePage } from './pages/DevelopmentCyclePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/feature-requests" element={<FeatureRequestsPage />} />
          <Route path="/bugs" element={<BugReportsPage />} />
          {/* Verifies: FR-075 */}
          <Route path="/cycle" element={<OrchestratorCyclesPage />} />
          <Route path="/features" element={<FeatureBrowserPage />} />
          <Route path="/learnings" element={<LearningsPage />} />
          {/* Verifies: FR-028 */}
          <Route path="/approvals" element={<ApprovalsPage />} />
          {/* Verifies: FR-027 */}
          <Route path="/development" element={<DevelopmentCyclePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
