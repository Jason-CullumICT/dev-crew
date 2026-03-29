// Verifies: FR-0001 — DependencySection component for detail views
import React, { useState, useCallback } from 'react';
import type { DependencyLink, DependencyItemType } from '../../../../Shared/types';
import { RESOLVED_STATUSES } from '../../../../Shared/types';
import { DependencyPicker } from './DependencyPicker';

export interface DependencySectionProps {
  /** Items that block this item */
  blockedBy: DependencyLink[];
  /** Items that this item blocks */
  blocks: DependencyLink[];
  /** Type of the current item */
  itemType: DependencyItemType;
  /** ID of the current item */
  itemId: string;
  /** Whether the user can edit dependencies */
  editable: boolean;
  /** Current status of the item */
  status?: string;
  /** Callback when dependencies are saved */
  onDependenciesChanged?: () => void;
}

// Verifies: FR-0001
function isResolved(status: string): boolean {
  return RESOLVED_STATUSES.includes(status);
}

// Verifies: FR-0001
function getStatusBadgeStyle(status: string): React.CSSProperties {
  if (isResolved(status)) {
    return { backgroundColor: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7' };
  }
  if (status === 'pending_dependencies') {
    return { backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d' };
  }
  return { backgroundColor: '#e0e7ff', color: '#4f46e5', border: '1px solid #a5b4fc' };
}

function itemTypeToRoutePrefix(itemType: DependencyItemType): string {
  return itemType === 'bug' ? '/bugs' : '/feature-requests';
}

// Verifies: FR-0001
const DependencyChip: React.FC<{ link: DependencyLink }> = ({ link }) => {
  const routePrefix = itemTypeToRoutePrefix(link.item_type);
  const resolved = isResolved(link.status);

  return (
    <a
      href={`${routePrefix}/${link.item_id}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        textDecoration: 'none',
        color: '#111827',
        fontSize: '13px',
        lineHeight: '20px',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      data-testid={`dependency-chip-${link.item_id}`}
      aria-label={`${link.item_id} ${link.title} — ${link.status}`}
    >
      <span style={{ fontWeight: 600, color: '#6b7280' }}>[{link.item_id}]</span>
      <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {link.title}
      </span>
      <span
        style={{
          ...getStatusBadgeStyle(link.status),
          padding: '1px 6px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {link.status}
        {resolved ? ' \u2713' : ''}
      </span>
    </a>
  );
};

const sectionStyles = {
  container: {
    marginTop: '16px',
    marginBottom: '16px',
  },
  heading: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chipList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  empty: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic' as const,
  },
  editButton: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  pendingWarning: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    color: '#92400e',
    fontSize: '13px',
    marginBottom: '12px',
  },
};

// Verifies: FR-0001
export const DependencySection: React.FC<DependencySectionProps> = ({
  blockedBy,
  blocks,
  itemType,
  itemId,
  editable,
  status,
  onDependenciesChanged,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const unresolvedBlockers = blockedBy.filter((link) => !isResolved(link.status));
  const isPendingDeps = status === 'pending_dependencies';

  const handlePickerClose = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const handlePickerSave = useCallback(() => {
    setPickerOpen(false);
    onDependenciesChanged?.();
  }, [onDependenciesChanged]);

  return (
    <div style={sectionStyles.container} data-testid="dependency-section">
      {/* Pending dependencies warning */}
      {isPendingDeps && unresolvedBlockers.length > 0 && (
        <div style={sectionStyles.pendingWarning} role="alert" data-testid="pending-deps-warning">
          <strong>Dispatch blocked:</strong> This item is waiting on {unresolvedBlockers.length} unresolved{' '}
          {unresolvedBlockers.length === 1 ? 'dependency' : 'dependencies'} before it can be dispatched to the
          orchestrator.
        </div>
      )}

      {/* Blocked By section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={sectionStyles.heading}>
          <span>Blocked By</span>
          {editable && (
            <button
              style={sectionStyles.editButton}
              onClick={() => setPickerOpen(true)}
              data-testid="edit-dependencies-btn"
              aria-label="Edit dependencies"
            >
              Edit Dependencies
            </button>
          )}
        </div>
        {blockedBy.length > 0 ? (
          <div style={sectionStyles.chipList}>
            {blockedBy.map((link) => (
              <DependencyChip key={`${link.item_type}-${link.item_id}`} link={link} />
            ))}
          </div>
        ) : (
          <div style={sectionStyles.empty}>No blockers</div>
        )}
      </div>

      {/* Blocks section */}
      <div>
        <div style={sectionStyles.heading}>
          <span>Blocks</span>
        </div>
        {blocks.length > 0 ? (
          <div style={sectionStyles.chipList}>
            {blocks.map((link) => (
              <DependencyChip key={`${link.item_type}-${link.item_id}`} link={link} />
            ))}
          </div>
        ) : (
          <div style={sectionStyles.empty}>Does not block any items</div>
        )}
      </div>

      {/* Dependency Picker Modal */}
      {pickerOpen && (
        <DependencyPicker
          itemType={itemType}
          itemId={itemId}
          currentBlockedBy={blockedBy}
          onClose={handlePickerClose}
          onSave={handlePickerSave}
        />
      )}
    </div>
  );
};

export default DependencySection;
