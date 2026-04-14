// Verifies: FR-dependency-section

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorkItem } from '../../../Shared/types/workflow';
import { WorkItemStatus } from '../../../Shared/types/workflow';
import { DependencyPicker } from './DependencyPicker';

interface DependencySectionProps {
  item: WorkItem;
  onRefresh: () => void;
}

// Terminal statuses: editing dependencies is disallowed
const TERMINAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.Completed,
  WorkItemStatus.Rejected,
  WorkItemStatus.Failed,
];

// Verifies: FR-dependency-section — "Blocked By" + "Blocks" subsections, chips, edit button
export const DependencySection: React.FC<DependencySectionProps> = ({ item, onRefresh }) => {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isEditable = !TERMINAL_STATUSES.includes(item.status);
  const hasBlockers = item.hasUnresolvedBlockers === true;

  return (
    <section
      data-testid="dependency-section"
      style={{
        padding: '20px',
        border: hasBlockers ? '1px solid #ef4444' : '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: hasBlockers ? '#fff5f5' : '#fff',
        marginBottom: '24px',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Dependencies</h2>
        {isEditable && (
          <button
            data-testid="edit-dependencies-btn"
            onClick={() => setPickerOpen(true)}
            style={{
              padding: '6px 14px',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Edit Dependencies
          </button>
        )}
      </div>

      {/* Blocked By subsection */}
      {/* Verifies: FR-dependency-section — "Blocked By" chips with unresolved highlight */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Blocked By
          {hasBlockers && (
            <span style={{ marginLeft: '8px', color: '#ef4444', fontWeight: 700 }}>
              ⚠ Unresolved
            </span>
          )}
        </h3>
        {!item.blockedBy || item.blockedBy.length === 0 ? (
          <p data-testid="no-blockers-msg" style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
            No blockers
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {item.blockedBy.map((link) => (
              <button
                key={link.blockerItemId}
                data-testid={`blocker-chip-${link.blockerItemId}`}
                onClick={() => navigate(`/work-items/${link.blockerItemId}`)}
                style={chipStyle}
              >
                {link.blockerItemDocId}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Blocks subsection */}
      {/* Verifies: FR-dependency-section — "Blocks" chips */}
      <div>
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Blocks
        </h3>
        {!item.blocks || item.blocks.length === 0 ? (
          <p data-testid="no-blocks-msg" style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
            Blocks nothing
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {item.blocks.map((link) => (
              <button
                key={link.blockedItemId}
                data-testid={`blocks-chip-${link.blockedItemId}`}
                onClick={() => navigate(`/work-items/${link.blockedItemId}`)}
                style={chipStyle}
              >
                {link.blockedItemDocId}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Verifies: FR-dependency-picker — picker modal opened from within section */}
      {pickerOpen && (
        <DependencyPicker
          currentItemId={item.id}
          currentItemDocId={item.docId}
          currentBlockedBy={item.blockedBy ?? []}
          blocksItems={item.blocks ?? []}
          onSave={() => {
            setPickerOpen(false);
            onRefresh();
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  );
};

const chipStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  backgroundColor: '#f3f4f6',
  fontSize: '13px',
  cursor: 'pointer',
  fontWeight: 600,
  color: '#374151',
};
