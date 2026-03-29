// Verifies: FR-0001 — Feature request list view with BlockedBadge integration
import React, { useEffect, useState } from 'react';
import type { FeatureRequest } from '../../../../Shared/types';
import { getFeatureRequests } from '../../../../Shared/api';
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
    color: '#7c3aed',
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
  priorityBadge: {
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 600,
  },
};

function getPriorityStyle(priority: string): React.CSSProperties {
  switch (priority) {
    case 'high':
      return { backgroundColor: '#fee2e2', color: '#dc2626' };
    case 'medium':
      return { backgroundColor: '#fef3c7', color: '#d97706' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#6b7280' };
  }
}

// Verifies: FR-0001
export const FeatureRequestList: React.FC = () => {
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await getFeatureRequests();
        setFeatureRequests(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feature requests');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={styles.loading}>Loading feature requests...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (featureRequests.length === 0) {
    return <div style={styles.empty}>No feature requests found</div>;
  }

  return (
    <div style={styles.container} data-testid="feature-request-list">
      <h2 style={styles.header}>Feature Requests</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Priority</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {featureRequests.map((fr) => (
            <tr key={fr.id} data-testid={`fr-row-${fr.id}`}>
              <td style={styles.td}>
                <a href={`/feature-requests/${fr.id}`} style={styles.idCell}>
                  {fr.id}
                </a>
              </td>
              <td style={styles.td}>{fr.title}</td>
              <td style={styles.td}>
                <span style={{ ...styles.priorityBadge, ...getPriorityStyle(fr.priority) }}>
                  {fr.priority}
                </span>
              </td>
              <td style={styles.td}>
                {/* Verifies: FR-0001 — BlockedBadge integration in list view */}
                <span style={styles.statusCell}>
                  <span>{fr.status}</span>
                  <BlockedBadge hasUnresolvedBlockers={fr.has_unresolved_blockers} status={fr.status} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FeatureRequestList;
