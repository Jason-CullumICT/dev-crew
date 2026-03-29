// Verifies: FR-DUP-030 — Bug list view with hidden item toggle and visual treatment
import React, { useState, useEffect, useCallback } from 'react';
import type { Bug } from '../../../../Shared/types';
import type { ListResponse } from '../../../../Shared/api';
import { logger } from '../../../../Backend/src/middleware/logger';
import { metrics } from '../../../../Backend/src/middleware/metrics';

// --- Props ---

interface BugListProps {
  /** Fetch bugs from the API. Receives include_hidden flag. */
  fetchBugs: (includeHidden: boolean) => Promise<ListResponse<Bug>>;
  /** Navigate to bug detail page */
  onSelectBug: (bugId: string) => void;
}

// --- Sub-components ---

// Verifies: FR-DUP-031 — Status badge with muted styling for duplicate/deprecated
function StatusBadge({ status }: { status: Bug['status'] }) {
  const isHidden = status === 'duplicate' || status === 'deprecated';
  const colorMap: Record<string, { bg: string; text: string }> = {
    open: { bg: '#dbeafe', text: '#1e40af' },
    'in-progress': { bg: '#fef3c7', text: '#92400e' },
    resolved: { bg: '#d1fae5', text: '#065f46' },
    closed: { bg: '#e5e7eb', text: '#374151' },
    duplicate: { bg: '#fef3c7', text: '#92400e' },
    deprecated: { bg: '#f3f4f6', text: '#6b7280' },
  };
  const colors = colorMap[status] ?? colorMap.open;

  return (
    <span
      className="bug-list-status-badge"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: colors.bg,
        color: colors.text,
        opacity: isHidden ? 0.7 : 1,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

// Verifies: FR-DUP-032 — Duplicate count badge on canonical items
function DuplicateCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="bug-list-dup-count"
      title={`${count} duplicate${count !== 1 ? 's' : ''}`}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: '#e0e7ff',
        color: '#4338ca',
        marginLeft: '6px',
      }}
    >
      {count} dup{count !== 1 ? 's' : ''}
    </span>
  );
}

// --- Main Component ---

// Verifies: FR-DUP-030 — BugList with include_hidden toggle
export const BugList: React.FC<BugListProps> = ({ fetchBugs, onSelectBug }) => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verifies: FR-DUP-033 — Fetch bugs with include_hidden query param
  const loadBugs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchBugs(includeHidden);
      setBugs(response.data);
      logger.info('Bugs loaded', { count: response.data.length, includeHidden });
      metrics.increment('bug_list_fetch_total', { include_hidden: String(includeHidden) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bugs';
      setError(message);
      logger.error('Failed to load bugs', { error: message, includeHidden });
    } finally {
      setLoading(false);
    }
  }, [fetchBugs, includeHidden]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

  // Verifies: FR-DUP-034 — Toggle handler for showing hidden items
  const handleToggleHidden = () => {
    setIncludeHidden((prev) => !prev);
  };

  return (
    <div className="bug-list" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div
        className="bug-list-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}
      >
        <h2 style={{ margin: 0 }}>Bugs</h2>

        {/* Verifies: FR-DUP-034 — Show hidden items toggle */}
        <label
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={includeHidden}
            onChange={handleToggleHidden}
            style={{ cursor: 'pointer' }}
          />
          Show hidden items
        </label>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading bugs...</p>}
      {error && <p style={{ color: '#dc2626' }} role="alert">{error}</p>}

      {!loading && !error && bugs.length === 0 && (
        <p style={{ color: '#6b7280' }}>No bugs found.</p>
      )}

      {!loading && !error && bugs.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {bugs.map((bug) => {
            const isHidden = bug.status === 'duplicate' || bug.status === 'deprecated';
            const dupCount = bug.duplicated_by?.length ?? 0;

            return (
              // Verifies: FR-DUP-035 — Visual distinction for hidden items (reduced opacity)
              <li
                key={bug.id}
                className="bug-list-item"
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  opacity: isHidden ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
                onClick={() => onSelectBug(bug.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectBug(bug.id);
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af', flexShrink: 0 }}>{bug.id}</span>
                    <span
                      style={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textDecoration: isHidden ? 'line-through' : 'none',
                      }}
                    >
                      {bug.title}
                    </span>
                    {/* Verifies: FR-DUP-032 — Duplicate count badge */}
                    {dupCount > 0 && <DuplicateCountBadge count={dupCount} />}
                  </div>
                  <StatusBadge status={bug.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default BugList;
