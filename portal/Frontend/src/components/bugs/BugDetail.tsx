// Verifies: FR-0001 — Bug detail view with dependency section integration
import React, { useEffect, useState, useCallback } from 'react';
import type { Bug } from '../../../../Shared/types';
import { getBug } from '../../../../Shared/api';
import { DependencySection } from '../shared/DependencySection';

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
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' };
  }
}

// Verifies: FR-0001
export const BugDetail: React.FC<BugDetailProps> = ({ bugId }) => {
  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <div style={styles.loading}>Loading bug...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!bug) {
    return <div style={styles.error}>Bug not found</div>;
  }

  return (
    <div style={styles.container} data-testid="bug-detail">
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.idLabel}>{bug.id}</span>
        <h1 style={styles.title}>{bug.title}</h1>
        <div style={styles.meta}>
          <span style={{ ...styles.statusBadge, ...getStatusStyle(bug.status) }}>{bug.status}</span>
          <span>Severity: {bug.severity}</span>
          <span>Created: {new Date(bug.created_at).toLocaleDateString()}</span>
        </div>
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
