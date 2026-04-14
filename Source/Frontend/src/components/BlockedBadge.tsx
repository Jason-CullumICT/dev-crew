// Verifies: FR-dependency-blocked-badge

import React from 'react';

interface BlockedBadgeProps {
  hasUnresolvedBlockers?: boolean;
}

// Verifies: FR-dependency-blocked-badge — red badge when has_unresolved_blockers=true, nothing otherwise
export const BlockedBadge: React.FC<BlockedBadgeProps> = ({ hasUnresolvedBlockers }) => {
  if (!hasUnresolvedBlockers) return null;

  return (
    <span
      data-testid="blocked-badge"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: '#ef4444',
        marginLeft: '6px',
        verticalAlign: 'middle',
      }}
    >
      Blocked
    </span>
  );
};
