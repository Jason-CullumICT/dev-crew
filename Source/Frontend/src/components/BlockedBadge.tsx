// Verifies: FR-dependency-ready-check (BlockedBadge — inline badge for list views)
// Verifies: FR-dependency-dispatch-gating (PendingDependencies status badge)

import React from 'react';
import { WorkItemStatus } from '../../../Shared/types/workflow';

interface BlockedBadgeProps {
  hasUnresolvedBlockers: boolean;
  status: WorkItemStatus;
}

// Verifies: FR-dependency-ready-check — shows "Blocked" badge when hasUnresolvedBlockers is true
// Verifies: FR-dependency-dispatch-gating — shows "Pending Dependencies" badge when status = pending-dependencies
export const BlockedBadge: React.FC<BlockedBadgeProps> = ({ hasUnresolvedBlockers, status }) => {
  const isPending = status === WorkItemStatus.PendingDependencies;

  if (!hasUnresolvedBlockers && !isPending) return null;

  return (
    <>
      {hasUnresolvedBlockers && (
        <span
          data-testid="blocked-badge"
          data-variant="blocked"
          style={{
            display: 'inline-block',
            padding: '2px 7px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#fff',
            backgroundColor: '#dc2626',
            marginLeft: '4px',
            verticalAlign: 'middle',
          }}
        >
          Blocked
        </span>
      )}
      {isPending && (
        <span
          data-testid="pending-dependencies-badge"
          data-variant="pending"
          style={{
            display: 'inline-block',
            padding: '2px 7px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#fff',
            backgroundColor: '#d97706',
            marginLeft: '4px',
            verticalAlign: 'middle',
          }}
        >
          Pending Dependencies
        </span>
      )}
    </>
  );
};
