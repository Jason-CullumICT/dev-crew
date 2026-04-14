// Verifies: FR-dependency-linking (DependenciesPanel — blocked-by/blocks chip display)
// Verifies: FR-dependency-ready-check (unresolved blocker highlighting)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkItemStatus } from '../../../Shared/types/workflow';
import type { DependencyLink } from '../../../Shared/types/workflow';

interface DependenciesPanelProps {
  itemId: string;
  blockedBy: DependencyLink[];
  blocks: DependencyLink[];
  hasUnresolvedBlockers?: boolean;
}

const RESOLVED_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.Completed,
];

// Verifies: FR-dependency-linking — shows blocked-by and blocks sections with clickable chips
// Verifies: FR-dependency-ready-check — highlights unresolved blockers when hasUnresolvedBlockers is true
export const DependenciesPanel: React.FC<DependenciesPanelProps> = ({
  blockedBy,
  blocks,
  hasUnresolvedBlockers = false,
}) => {
  const navigate = useNavigate();

  const isUnresolved = (link: DependencyLink): boolean =>
    !RESOLVED_STATUSES.includes(link.blockerStatus);

  return (
    <section
      data-testid="dependencies-panel"
      style={{
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#fff',
        marginBottom: '24px',
      }}
    >
      <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Dependencies</h2>

      {/* Blocked By Section */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Blocked By
        </div>
        {blockedBy.length === 0 ? (
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>None</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {blockedBy.map((link) => {
              const unresolved = hasUnresolvedBlockers && isUnresolved(link);
              return (
                <DependencyChip
                  key={link.id}
                  link={link}
                  testId="dependency-chip-blocked-by"
                  unresolved={unresolved}
                  onClick={() => navigate(`/work-items/${link.blockerItemId}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Blocks Section */}
      <div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Blocks
        </div>
        {blocks.length === 0 ? (
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>None</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {blocks.map((link) => (
              <DependencyChip
                key={link.id}
                link={link}
                testId="dependency-chip-blocks"
                unresolved={false}
                onClick={() => navigate(`/work-items/${link.blockerItemId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// --- Sub-component ---

interface DependencyChipProps {
  link: DependencyLink;
  testId: string;
  unresolved: boolean;
  onClick: () => void;
}

const STATUS_COLORS: Partial<Record<WorkItemStatus, string>> = {
  [WorkItemStatus.Completed]: '#059669',
  [WorkItemStatus.InProgress]: '#6366f1',
  [WorkItemStatus.Approved]: '#10b981',
  [WorkItemStatus.Rejected]: '#ef4444',
  [WorkItemStatus.Failed]: '#dc2626',
  [WorkItemStatus.Backlog]: '#6b7280',
  [WorkItemStatus.Proposed]: '#3b82f6',
  [WorkItemStatus.Reviewing]: '#f59e0b',
  [WorkItemStatus.Routing]: '#8b5cf6',
  [WorkItemStatus.PendingDependencies]: '#d97706',
};

// Verifies: FR-dependency-linking — each chip shows title, type, status badge with navigation
const DependencyChip: React.FC<DependencyChipProps> = ({ link, testId, unresolved, onClick }) => {
  const statusColor = STATUS_COLORS[link.blockerStatus] ?? '#6b7280';

  return (
    <button
      data-testid={testId}
      data-unresolved={String(unresolved)}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        border: `1px solid ${unresolved ? '#fca5a5' : '#e5e7eb'}`,
        borderRadius: '20px',
        backgroundColor: unresolved ? '#fef2f2' : '#f9fafb',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        color: '#1f2937',
        outline: 'none',
        transition: 'background-color 0.15s',
      }}
    >
      {/* Type badge */}
      <span
        data-testid="dep-type-badge"
        style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: '8px',
          backgroundColor: '#e5e7eb',
          color: '#374151',
          textTransform: 'capitalize',
        }}
      >
        {link.blockerItemType}
      </span>

      {/* Title */}
      <span>{link.blockerTitle}</span>

      {/* Status badge */}
      <span
        data-testid="dep-status-badge"
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '1px 6px',
          borderRadius: '8px',
          backgroundColor: statusColor,
          color: '#fff',
          textTransform: 'capitalize',
        }}
      >
        {link.blockerStatus}
      </span>
    </button>
  );
};
