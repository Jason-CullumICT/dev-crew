// Verifies: dev-crew debug portal — embedded container-test viewer
import React from 'react';

export const DebugPortalPage: React.FC = () => {
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';

  return (
    <div style={{ margin: '-24px', height: 'calc(100vh - 56px)' }}>
      <iframe
        src={portalUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Debug Portal"
      />
    </div>
  );
};
