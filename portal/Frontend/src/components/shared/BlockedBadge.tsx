// Verifies: FR-0001 — BlockedBadge component for list views
import React from 'react';

export interface BlockedBadgeProps {
  /** Whether the item has unresolved blockers */
  hasUnresolvedBlockers: boolean;
  /** Current status of the item */
  status: string;
}

const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '18px',
    whiteSpace: 'nowrap' as const,
  },
  blocked: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
  },
  pendingDependencies: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    border: '1px solid #fcd34d',
  },
};

/**
 * Inline badge for list views indicating dependency status.
 * - Red "Blocked" badge when has_unresolved_blockers is true
 * - Amber "Pending Dependencies" badge when status is pending_dependencies
 */
// Verifies: FR-0001
export const BlockedBadge: React.FC<BlockedBadgeProps> = ({ hasUnresolvedBlockers, status }) => {
  if (status === 'pending_dependencies') {
    return (
      <span
        style={{ ...styles.badge, ...styles.pendingDependencies }}
        role="status"
        aria-label="Pending Dependencies"
        data-testid="badge-pending-dependencies"
      >
        Pending Dependencies
      </span>
    );
  }

  if (hasUnresolvedBlockers) {
    return (
      <span
        style={{ ...styles.badge, ...styles.blocked }}
        role="status"
        aria-label="Blocked"
        data-testid="badge-blocked"
      >
        Blocked
      </span>
    );
  }

  return null;
};

export default BlockedBadge;
