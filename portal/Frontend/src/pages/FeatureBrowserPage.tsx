// Verifies: FR-029
// @deprecated — Hidden from nav. Pipeline does not write Feature records to the portal.
// Re-enable by adding to Sidebar navItems when a pipeline stage calls POST /api/features.
import React from 'react'
import { Header } from '../components/layout/Header'
import { FeatureBrowser } from '../components/features/FeatureBrowser'

export function FeatureBrowserPage() {
  return (
    <div>
      <Header
        title="Feature Browser"
        subtitle="Browse completed features delivered through the development pipeline"
      />
      <div className="p-6">
        <FeatureBrowser />
      </div>
    </div>
  )
}
