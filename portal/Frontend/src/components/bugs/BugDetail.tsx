// Verifies: FR-DUP-020 — Bug detail view with duplicate/deprecated banners and actions
import React, { useState, useCallback } from 'react';
import type { Bug } from '../../../../Shared/types';
import type { MarkDuplicateInput, MarkDeprecatedInput } from '../../../../Shared/api';
import { logger } from '../../../../Backend/src/middleware/logger';
import { metrics } from '../../../../Backend/src/middleware/metrics';

// --- Props ---

interface BugDetailProps {
  bug: Bug;
  onUpdate: (id: string, payload: MarkDuplicateInput | MarkDeprecatedInput | { status: 'open' }) => Promise<void>;
}

// --- Sub-components ---

// Verifies: FR-DUP-021 — Duplicate banner with clickable link to canonical item
function DuplicateBanner({ duplicateOf }: { duplicateOf: string }) {
  return (
    <div
      className="bug-detail-banner bug-detail-banner--duplicate"
      role="alert"
      style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '16px' }} aria-hidden="true">&#9888;</span>
      <span>
        This item is a duplicate of{' '}
        <a
          href={`/bugs/${duplicateOf}`}
          style={{ color: '#d97706', fontWeight: 600, textDecoration: 'underline' }}
        >
          {duplicateOf}
        </a>
      </span>
    </div>
  );
}

// Verifies: FR-DUP-022 — Deprecated banner with reason
function DeprecatedBanner({ reason }: { reason?: string }) {
  return (
    <div
      className="bug-detail-banner bug-detail-banner--deprecated"
      role="alert"
      style={{
        backgroundColor: '#f3f4f6',
        border: '1px solid #9ca3af',
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '16px' }} aria-hidden="true">&#128683;</span>
      <span>
        This item has been deprecated.{' '}
        {reason ? `Reason: ${reason}` : 'No reason given.'}
      </span>
    </div>
  );
}

// Verifies: FR-DUP-023 — Duplicated-by badge showing count and IDs on canonical items
function DuplicatedByBadge({ duplicatedBy }: { duplicatedBy: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (duplicatedBy.length === 0) return null;

  return (
    <div className="bug-detail-duplicated-by" style={{ marginBottom: '12px' }}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          background: '#e0e7ff',
          border: '1px solid #818cf8',
          borderRadius: '12px',
          padding: '4px 12px',
          fontSize: '13px',
          color: '#4338ca',
          cursor: 'pointer',
        }}
        aria-expanded={expanded}
      >
        {duplicatedBy.length} duplicate{duplicatedBy.length !== 1 ? 's' : ''}
      </button>
      {expanded && (
        <ul style={{ margin: '8px 0 0 16px', padding: 0, listStyle: 'disc' }}>
          {duplicatedBy.map((id) => (
            <li key={id} style={{ marginBottom: '4px' }}>
              <a href={`/bugs/${id}`} style={{ color: '#4338ca', textDecoration: 'underline' }}>
                {id}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Verifies: FR-DUP-024 — Mark as Duplicate modal with ID picker
function MarkDuplicateModal({
  bugId,
  onConfirm,
  onCancel,
}: {
  bugId: string;
  onConfirm: (canonicalId: string) => void;
  onCancel: () => void;
}) {
  const [canonicalId, setCanonicalId] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = canonicalId.trim();
    if (!trimmed) {
      setError('Please enter the ID of the canonical item.');
      return;
    }
    if (trimmed === bugId) {
      setError('Cannot mark an item as a duplicate of itself.');
      return;
    }
    setError('');
    onConfirm(trimmed);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mark as Duplicate"
    >
      <div
        className="modal-content"
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '24px',
          minWidth: '360px',
          maxWidth: '480px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        <h3 style={{ margin: '0 0 16px' }}>Mark as Duplicate</h3>
        <label htmlFor="canonical-id-input" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Canonical Bug ID
        </label>
        <input
          id="canonical-id-input"
          type="text"
          value={canonicalId}
          onChange={(e) => setCanonicalId(e.target.value)}
          placeholder="e.g. BUG-0005"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p style={{ color: '#dc2626', fontSize: '13px', margin: '8px 0 0' }} role="alert">
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#f59e0b',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// Verifies: FR-DUP-025 — Mark as Deprecated modal with optional reason
function MarkDeprecatedModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mark as Deprecated"
    >
      <div
        className="modal-content"
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '24px',
          minWidth: '360px',
          maxWidth: '480px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        <h3 style={{ margin: '0 0 16px' }}>Mark as Deprecated</h3>
        <label htmlFor="deprecation-reason-input" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Reason (optional)
        </label>
        <textarea
          id="deprecation-reason-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Superseded by BUG-0012"
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#6b7280',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

// Verifies: FR-DUP-020 — BugDetail component with full duplicate/deprecated support
export const BugDetail: React.FC<BugDetailProps> = ({ bug, onUpdate }) => {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeprecatedModal, setShowDeprecatedModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHidden = bug.status === 'duplicate' || bug.status === 'deprecated';

  // Verifies: FR-DUP-026 — Handle marking as duplicate
  const handleMarkDuplicate = useCallback(
    async (canonicalId: string) => {
      setLoading(true);
      try {
        const payload: MarkDuplicateInput = { status: 'duplicate', duplicate_of: canonicalId };
        await onUpdate(bug.id, payload);
        logger.info('Bug marked as duplicate', { bugId: bug.id, canonicalId });
        metrics.increment('bug_status_change_total', { to_status: 'duplicate' });
      } finally {
        setLoading(false);
        setShowDuplicateModal(false);
      }
    },
    [bug.id, onUpdate],
  );

  // Verifies: FR-DUP-027 — Handle marking as deprecated
  const handleMarkDeprecated = useCallback(
    async (reason: string) => {
      setLoading(true);
      try {
        const payload: MarkDeprecatedInput = { status: 'deprecated', deprecation_reason: reason || undefined };
        await onUpdate(bug.id, payload);
        logger.info('Bug marked as deprecated', { bugId: bug.id, reason });
        metrics.increment('bug_status_change_total', { to_status: 'deprecated' });
      } finally {
        setLoading(false);
        setShowDeprecatedModal(false);
      }
    },
    [bug.id, onUpdate],
  );

  // Verifies: FR-DUP-028 — Handle restoring a hidden item back to open
  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      await onUpdate(bug.id, { status: 'open' });
      logger.info('Bug restored to open', { bugId: bug.id, previousStatus: bug.status });
      metrics.increment('bug_status_change_total', { to_status: 'open' });
    } finally {
      setLoading(false);
    }
  }, [bug.id, bug.status, onUpdate]);

  return (
    <div className="bug-detail" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Verifies: FR-DUP-021 — Duplicate banner */}
      {bug.status === 'duplicate' && bug.duplicate_of && (
        <DuplicateBanner duplicateOf={bug.duplicate_of} />
      )}

      {/* Verifies: FR-DUP-022 — Deprecated banner */}
      {bug.status === 'deprecated' && (
        <DeprecatedBanner reason={bug.deprecation_reason} />
      )}

      {/* Verifies: FR-DUP-023 — Duplicated-by badge */}
      {bug.duplicated_by && bug.duplicated_by.length > 0 && (
        <DuplicatedByBadge duplicatedBy={bug.duplicated_by} />
      )}

      {/* Bug details */}
      <h2 style={{ margin: '0 0 8px' }}>{bug.title}</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', fontSize: '13px', color: '#6b7280' }}>
        <span>{bug.id}</span>
        <span>&middot;</span>
        <span style={{ textTransform: 'capitalize' }}>{bug.status}</span>
        <span>&middot;</span>
        <span>Priority: {bug.priority}</span>
      </div>
      <p style={{ lineHeight: 1.6, color: '#374151' }}>{bug.description}</p>

      {/* Verifies: FR-DUP-024, FR-DUP-025 — Action buttons */}
      <div
        className="bug-detail-actions"
        style={{ display: 'flex', gap: '8px', marginTop: '24px' }}
      >
        {isHidden ? (
          <button
            type="button"
            onClick={handleRestore}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {loading ? 'Restoring...' : 'Restore'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowDuplicateModal(true)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                background: '#fffbeb',
                color: '#92400e',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              Mark as Duplicate
            </button>
            <button
              type="button"
              onClick={() => setShowDeprecatedModal(true)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                border: '1px solid #9ca3af',
                borderRadius: '6px',
                background: '#f9fafb',
                color: '#4b5563',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              Mark as Deprecated
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      {showDuplicateModal && (
        <MarkDuplicateModal
          bugId={bug.id}
          onConfirm={handleMarkDuplicate}
          onCancel={() => setShowDuplicateModal(false)}
        />
      )}
      {showDeprecatedModal && (
        <MarkDeprecatedModal
          onConfirm={handleMarkDeprecated}
          onCancel={() => setShowDeprecatedModal(false)}
        />
      )}
    </div>
  );
};

export default BugDetail;
