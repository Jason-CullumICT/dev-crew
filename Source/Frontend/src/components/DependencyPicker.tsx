// Verifies: FR-dependency-picker

import React, { useState, useCallback } from 'react';
import type { WorkItem, DependencyLink } from '../../../Shared/types/workflow';
import { workItemsApi } from '../api/client';

interface BlockerRef {
  id: string;
  docId: string;
}

interface DependencyPickerProps {
  currentItemId: string;
  currentItemDocId: string;
  currentBlockedBy: DependencyLink[];
  blocksItems: DependencyLink[];
  onSave: () => void;
  onClose: () => void;
}

// Verifies: FR-dependency-picker — search typeahead, add/remove chips, circular dep guard, save via PATCH
export const DependencyPicker: React.FC<DependencyPickerProps> = ({
  currentItemId,
  currentItemDocId,
  currentBlockedBy,
  blocksItems,
  onSave,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<BlockerRef[]>(
    currentBlockedBy.map((l) => ({ id: l.blockerItemId, docId: l.blockerItemDocId })),
  );
  const [circularWarning, setCircularWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // IDs of items this item already blocks — adding any of these as blockers would be a direct cycle
  const blocksIdSet = new Set(blocksItems.map((l) => l.blockedItemId));

  const selectedIdSet = new Set(selectedRefs.map((r) => r.id));

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const result = await workItemsApi.searchItems(q);
        setSearchResults(result.data.filter((item) => item.id !== currentItemId));
      } catch {
        // Search errors are intentionally suppressed: UI falls back to empty results
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [currentItemId],
  );

  const handleAdd = useCallback(
    (item: WorkItem) => {
      if (selectedIdSet.has(item.id)) return;

      // Guard: direct circular dependency — this item already blocks the candidate
      if (blocksIdSet.has(item.id)) {
        setCircularWarning(
          `Adding ${item.docId} as a blocker would create a circular dependency — ` +
            `${currentItemDocId} already blocks ${item.docId}.`,
        );
        return;
      }

      setCircularWarning(null);
      setSelectedRefs((prev) => [...prev, { id: item.id, docId: item.docId }]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIdSet, blocksIdSet, currentItemDocId],
  );

  const handleRemove = useCallback((id: string) => {
    setCircularWarning(null);
    setSelectedRefs((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await workItemsApi.setDependencies(currentItemId, selectedRefs.map((r) => r.id));
      onSave();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save dependencies');
      setSaving(false);
    }
  }, [currentItemId, selectedRefs, onSave]);

  return (
    <div
      data-testid="dependency-picker-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Dependencies"
      style={overlayStyle}
    >
      <div style={modalStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Edit Dependencies</h2>
          <button
            data-testid="picker-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Selected blockers */}
        <div style={{ marginBottom: '16px' }}>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Blocked By (selected)
          </h3>
          {selectedRefs.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>None selected</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedRefs.map((ref) => (
                <span
                  key={ref.id}
                  data-testid={`selected-blocker-${ref.id}`}
                  style={selectedChipStyle}
                >
                  {ref.docId}
                  <button
                    onClick={() => handleRemove(ref.id)}
                    aria-label={`Remove ${ref.docId}`}
                    style={removeChipBtnStyle}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Circular dependency warning */}
        {circularWarning && (
          <div
            data-testid="circular-warning"
            role="alert"
            style={{
              padding: '10px',
              backgroundColor: '#fffbeb',
              color: '#92400e',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '12px',
              border: '1px solid #fcd34d',
            }}
          >
            {circularWarning}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="dep-search"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            Search work items
          </label>
          <input
            id="dep-search"
            data-testid="dep-search-input"
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type to search (min 2 chars)…"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Search state */}
        {searching && (
          <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 8px' }}>Searching…</p>
        )}

        {/* Search results */}
        {!searching && searchResults.length > 0 && (
          <ul
            data-testid="search-results"
            style={{
              listStyle: 'none',
              margin: '0 0 12px',
              padding: 0,
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            {searchResults.map((item) => {
              const alreadySelected = selectedIdSet.has(item.id);
              return (
                <li
                  key={item.id}
                  data-testid={`search-result-${item.id}`}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: alreadySelected ? '#f9fafb' : '#fff',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>
                    <strong style={{ marginRight: '8px' }}>{item.docId}</strong>
                    {item.title}
                  </span>
                  {!alreadySelected && (
                    <button
                      onClick={() => handleAdd(item)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Save error */}
        {saveError && (
          <p
            data-testid="save-error"
            style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 8px' }}
          >
            {saveError}
          </p>
        )}

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: '#fff',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            data-testid="picker-save-btn"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              backgroundColor: saving ? '#93c5fd' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Styles ---

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  padding: '24px',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '80vh',
  overflowY: 'auto',
};

const selectedChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  border: '1px solid #bfdbfe',
  borderRadius: '12px',
  backgroundColor: '#eff6ff',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1d4ed8',
};

const removeChipBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: 1,
  padding: '0 2px',
};
