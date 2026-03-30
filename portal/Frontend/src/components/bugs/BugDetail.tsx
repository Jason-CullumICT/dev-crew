// Verifies: FR-0001 — Bug detail view with dependency section integration
// Verifies: FR-0008 — Duplicate/deprecated banners and action buttons
import React, { useEffect, useState, useCallback } from 'react';
import type { Bug } from '../../../../Shared/types';
import { HIDDEN_STATUSES } from '../../../../Shared/types';
import { getBug, markAsDuplicate, markAsDeprecated, updateBug } from '../../../../Shared/api';
import { DependencySection } from '../shared/DependencySection';
import { DuplicateDeprecatedBanner } from '../shared/DuplicateDeprecatedBanner';

export interface BugDetailProps {
  /** Bug ID, e.g. "BUG-0010" */
  bugId: string;
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '16px',
  },
  idLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: '4px 0 0 0',
  },
  meta: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  description: {
    marginTop: '16px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    whiteSpace: 'pre-wrap' as const,
  },
  loading: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '16px 0',
  },
  // Verifies: FR-0008 — Action button styles
  actionBar: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  } as React.CSSProperties,
  actionButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    color: '#374151',
  } as React.CSSProperties,
  restoreButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #93c5fd',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  } as React.CSSProperties,
  inlineForm: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  } as React.CSSProperties,
  input: {
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    flex: 1,
  } as React.CSSProperties,
  submitButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
  } as React.CSSProperties,
  cancelButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    color: '#6b7280',
  } as React.CSSProperties,
};

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'resolved':
    case 'closed':
      return { backgroundColor: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7' };
    case 'pending_dependencies':
      return { backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d' };
    case 'in_development':
      return { backgroundColor: '#dbeafe', color: '#2563eb', border: '1px solid #93c5fd' };
    // Verifies: FR-0008 — Status styles for duplicate and deprecated
    case 'duplicate':
      return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    case 'deprecated':
      return { backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' };
  }
}

// Verifies: FR-0001
// Verifies: FR-0008 — Enhanced with duplicate/deprecated UI
export const BugDetail: React.FC<BugDetailProps> = ({ bugId }) => {
  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Verifies: FR-0008 — Action form state
  const [showDuplicateForm, setShowDuplicateForm] = useState(false);
  const [showDeprecatedForm, setShowDeprecatedForm] = useState(false);
  const [duplicateOfInput, setDuplicateOfInput] = useState('');
  const [deprecationReasonInput, setDeprecationReasonInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBug = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBug(bugId);
      setBug(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bug');
    } finally {
      setLoading(false);
    }
  }, [bugId]);

  useEffect(() => {
    loadBug();
  }, [loadBug]);

  // Verifies: FR-0008 — Submit mark-as-duplicate
  const handleMarkDuplicate = async () => {
    if (!duplicateOfInput.trim()) return;
    setActionError(null);
    try {
      await markAsDuplicate('bug', bugId, duplicateOfInput.trim());
      setShowDuplicateForm(false);
      setDuplicateOfInput('');
      await loadBug();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as duplicate');
    }
  };

  // Verifies: FR-0008 — Submit mark-as-deprecated
  const handleMarkDeprecated = async () => {
    setActionError(null);
    try {
      await markAsDeprecated('bug', bugId, deprecationReasonInput.trim() || undefined);
      setShowDeprecatedForm(false);
      setDeprecationReasonInput('');
      await loadBug();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as deprecated');
    }
  };

  // Verifies: FR-0008 — Restore from duplicate/deprecated to 'new'
  const handleRestore = async () => {
    setActionError(null);
    try {
      await updateBug(bugId, { status: 'new' });
      await loadBug();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to restore');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading bug...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!bug) {
    return <div style={styles.error}>Bug not found</div>;
  }

  const isHidden = HIDDEN_STATUSES.includes(bug.status);

  return (
    <div style={styles.container} data-testid="bug-detail">
      {/* Verifies: FR-0008 — Duplicate/deprecated banners */}
      <DuplicateDeprecatedBanner
        status={bug.status}
        duplicateOf={bug.duplicate_of}
        deprecationReason={bug.deprecation_reason}
        duplicatedBy={bug.duplicated_by}
      />

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.idLabel}>{bug.id}</span>
        <h1 style={styles.title}>{bug.title}</h1>
        <div style={styles.meta}>
          <span style={{ ...styles.statusBadge, ...getStatusStyle(bug.status) }}>{bug.status}</span>
          <span>Severity: {bug.severity}</span>
          <span>Created: {new Date(bug.created_at).toLocaleDateString()}</span>
        </div>

        {/* Verifies: FR-0008 — Action buttons */}
        {!isHidden && (
          <div style={styles.actionBar}>
            <button
              style={styles.actionButton}
              onClick={() => { setShowDuplicateForm(true); setShowDeprecatedForm(false); }}
              data-testid="mark-duplicate-btn"
            >
              Mark as Duplicate
            </button>
            <button
              style={styles.actionButton}
              onClick={() => { setShowDeprecatedForm(true); setShowDuplicateForm(false); }}
              data-testid="mark-deprecated-btn"
            >
              Mark as Deprecated
            </button>
          </div>
        )}

        {/* Verifies: FR-0008 — Restore button for hidden items */}
        {isHidden && (
          <div style={styles.actionBar}>
            <button style={styles.restoreButton} onClick={handleRestore} data-testid="restore-btn">
              Restore
            </button>
          </div>
        )}

        {/* Verifies: FR-0008 — Inline duplicate form */}
        {showDuplicateForm && (
          <div style={styles.inlineForm} data-testid="duplicate-form">
            <input
              style={styles.input}
              type="text"
              placeholder="Canonical item ID (e.g. BUG-0001 or FR-0009)"
              value={duplicateOfInput}
              onChange={(e) => setDuplicateOfInput(e.target.value)}
              data-testid="duplicate-of-input"
            />
            <button style={styles.submitButton} onClick={handleMarkDuplicate} data-testid="duplicate-submit">
              Submit
            </button>
            <button style={styles.cancelButton} onClick={() => setShowDuplicateForm(false)}>
              Cancel
            </button>
          </div>
        )}

        {/* Verifies: FR-0008 — Inline deprecated form */}
        {showDeprecatedForm && (
          <div style={styles.inlineForm} data-testid="deprecated-form">
            <input
              style={styles.input}
              type="text"
              placeholder="Reason (optional)"
              value={deprecationReasonInput}
              onChange={(e) => setDeprecationReasonInput(e.target.value)}
              data-testid="deprecation-reason-input"
            />
            <button style={styles.submitButton} onClick={handleMarkDeprecated} data-testid="deprecated-submit">
              Submit
            </button>
            <button style={styles.cancelButton} onClick={() => setShowDeprecatedForm(false)}>
              Cancel
            </button>
          </div>
        )}

        {/* Verifies: FR-0008 — Action error display */}
        {actionError && (
          <div style={{ ...styles.error, marginTop: '8px' }} data-testid="action-error">
            {actionError}
          </div>
        )}
      </div>

      {/* Description */}
      <div style={styles.description}>{bug.description}</div>

      <hr style={styles.divider} />

      {/* Verifies: FR-0001 — Dependency section integration */}
      <DependencySection
        blockedBy={bug.blocked_by}
        blocks={bug.blocks}
        itemType="bug"
        itemId={bug.id}
        editable={true}
        status={bug.status}
        onDependenciesChanged={loadBug}
      />
    </div>
  );
};

export default BugDetail;
