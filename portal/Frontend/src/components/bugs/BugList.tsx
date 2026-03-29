// Verifies: FR-0001 — Bug list view with BlockedBadge integration
import React, { useEffect, useState } from 'react';
import type { Bug } from '../../../../Shared/types';
import { getBugs } from '../../../../Shared/api';
import { BlockedBadge } from '../shared/BlockedBadge';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    borderBottom: '2px solid #e5e7eb',
    color: '#6b7280',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
    verticalAlign: 'middle' as const,
  },
  idCell: {
    fontWeight: 600,
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  statusCell: {
    display: 'inline-flex',
    gap: '6px',
    alignItems: 'center',
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
  empty: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#9ca3af',
    fontSize: '14px',
  },
  severityBadge: {
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 600,
  },
};

function getSeverityStyle(severity: string): React.CSSProperties {
  switch (severity) {
    case 'critical':
      return { backgroundColor: '#fee2e2', color: '#dc2626' };
    case 'high':
      return { backgroundColor: '#ffedd5', color: '#ea580c' };
    case 'medium':
      return { backgroundColor: '#fef3c7', color: '#d97706' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#6b7280' };
  }
}

// Verifies: FR-0001
export const BugList: React.FC = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await getBugs();
        setBugs(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bugs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={styles.loading}>Loading bugs...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (bugs.length === 0) {
    return <div style={styles.empty}>No bugs found</div>;
  }

  return (
    <div style={styles.container} data-testid="bug-list">
      <h2 style={styles.header}>Bugs</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Severity</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug) => (
            <tr key={bug.id} data-testid={`bug-row-${bug.id}`}>
              <td style={styles.td}>
                <a href={`/bugs/${bug.id}`} style={styles.idCell}>
                  {bug.id}
                </a>
              </td>
              <td style={styles.td}>{bug.title}</td>
              <td style={styles.td}>
                <span style={{ ...styles.severityBadge, ...getSeverityStyle(bug.severity) }}>
                  {bug.severity}
                </span>
              </td>
              <td style={styles.td}>
                {/* Verifies: FR-0001 — BlockedBadge integration in list view */}
                <span style={styles.statusCell}>
                  <span>{bug.status}</span>
                  <BlockedBadge hasUnresolvedBlockers={bug.has_unresolved_blockers} status={bug.status} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BugList;
