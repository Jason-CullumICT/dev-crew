// Verifies: FR-0001 — DependencyPicker modal component
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { DependencyLink, DependencyItemType, Bug, FeatureRequest } from '../../../../Shared/types';
import { searchItems, setDependencies } from '../../../../Shared/api';

export interface DependencyPickerProps {
  /** Type of the item being edited */
  itemType: DependencyItemType;
  /** ID of the item being edited */
  itemId: string;
  /** Currently selected blockers */
  currentBlockedBy: DependencyLink[];
  /** Called when the modal is closed without saving */
  onClose: () => void;
  /** Called after dependencies are saved successfully */
  onSave: () => void;
}

function getItemId(item: Bug | FeatureRequest): string {
  return item.id;
}

function getItemType(item: Bug | FeatureRequest): DependencyItemType {
  return item.id.startsWith('BUG-') ? 'bug' : 'feature_request';
}

function getTypeBadgeLabel(item: Bug | FeatureRequest): string {
  return item.id.startsWith('BUG-') ? 'Bug' : 'FR';
}

// Verifies: FR-0001 — circular dependency client-side guard
function wouldCreateDirectCycle(
  itemId: string,
  candidateId: string,
  candidateBlocks: DependencyLink[],
): boolean {
  return candidateBlocks.some((link) => link.item_id === itemId);
}

const modalStyles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    width: '520px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
  },
  body: {
    padding: '16px 20px',
    flex: 1,
    overflowY: 'auto' as const,
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  selectedChips: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginTop: '12px',
    marginBottom: '12px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    fontSize: '12px',
    color: '#1e40af',
  },
  removeChip: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#6b7280',
    padding: '0 2px',
    lineHeight: 1,
  },
  resultsList: {
    listStyle: 'none',
    padding: 0,
    margin: '8px 0 0 0',
    maxHeight: '240px',
    overflowY: 'auto' as const,
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    border: '1px solid transparent',
    transition: 'background-color 0.1s',
  },
  typeBadge: {
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 600,
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cancelBtn: {
    padding: '6px 16px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '6px 16px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
  },
  loading: {
    fontSize: '13px',
    color: '#6b7280',
    padding: '12px 0',
    textAlign: 'center' as const,
  },
};

// Verifies: FR-0001
export const DependencyPicker: React.FC<DependencyPickerProps> = ({
  itemType,
  itemId,
  currentBlockedBy,
  onClose,
  onSave,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<Bug | FeatureRequest>>([]);
  const [selected, setSelected] = useState<DependencyLink[]>(() => [...currentBlockedBy]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await searchItems(query.trim());
        // Filter out the current item itself
        const filtered = items.filter((item) => getItemId(item) !== itemId);
        setResults(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, itemId]);

  const handleSelect = useCallback(
    (item: Bug | FeatureRequest) => {
      const candidateId = getItemId(item);
      const candidateType = getItemType(item);

      // Already selected
      if (selected.some((s) => s.item_id === candidateId)) {
        return;
      }

      // Verifies: FR-0001 — Client-side circular dependency guard
      if ('blocks' in item && Array.isArray(item.blocks)) {
        if (wouldCreateDirectCycle(itemId, candidateId, item.blocks as DependencyLink[])) {
          setError(`Cannot add ${candidateId}: it would create a circular dependency (${candidateId} already blocks ${itemId})`);
          return;
        }
      }

      setSelected((prev) => [
        ...prev,
        {
          item_type: candidateType,
          item_id: candidateId,
          title: item.title,
          status: item.status,
        },
      ]);
      setError(null);
    },
    [selected, itemId],
  );

  const handleRemove = useCallback((removeId: string) => {
    setSelected((prev) => prev.filter((s) => s.item_id !== removeId));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const blockerIds = selected.map((s) => s.item_id);
      await setDependencies(itemType, itemId, blockerIds);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save dependencies');
    } finally {
      setSaving(false);
    }
  }, [selected, itemType, itemId, onSave]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const selectedIds = new Set(selected.map((s) => s.item_id));

  return (
    <div style={modalStyles.overlay} onClick={handleOverlayClick} data-testid="dependency-picker-modal">
      <div style={modalStyles.dialog} role="dialog" aria-label="Edit Dependencies" aria-modal="true">
        {/* Header */}
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>Edit Dependencies for {itemId}</h3>
          <button style={modalStyles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={modalStyles.body}>
          <input
            ref={inputRef}
            style={modalStyles.searchInput}
            type="text"
            placeholder="Search bugs and feature requests..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="dependency-search-input"
            aria-label="Search items"
          />

          {/* Selected items */}
          {selected.length > 0 && (
            <div style={modalStyles.selectedChips} data-testid="selected-dependencies">
              {selected.map((link) => (
                <span key={link.item_id} style={modalStyles.chip}>
                  [{link.item_id}] {link.title}
                  <button
                    style={modalStyles.removeChip}
                    onClick={() => handleRemove(link.item_id)}
                    aria-label={`Remove ${link.item_id}`}
                    data-testid={`remove-dep-${link.item_id}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={modalStyles.error} role="alert" data-testid="dependency-picker-error">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && <div style={modalStyles.loading}>Searching...</div>}

          {/* Search results */}
          {!loading && results.length > 0 && (
            <ul style={modalStyles.resultsList} data-testid="dependency-search-results">
              {results.map((item) => {
                const id = getItemId(item);
                const isSelected = selectedIds.has(id);
                const typeBadgeColor = id.startsWith('BUG-')
                  ? { backgroundColor: '#fee2e2', color: '#dc2626' }
                  : { backgroundColor: '#ede9fe', color: '#7c3aed' };

                return (
                  <li
                    key={id}
                    style={{
                      ...modalStyles.resultItem,
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      opacity: isSelected ? 0.6 : 1,
                    }}
                    onClick={() => !isSelected && handleSelect(item)}
                    data-testid={`search-result-${id}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span style={{ ...modalStyles.typeBadge, ...typeBadgeColor }}>
                      {getTypeBadgeLabel(item)}
                    </span>
                    <span style={{ fontWeight: 500, color: '#6b7280' }}>{id}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{item.status}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* No results */}
          {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
            <div style={modalStyles.loading}>No results found</div>
          )}
        </div>

        {/* Footer */}
        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onClose} data-testid="dependency-picker-cancel">
            Cancel
          </button>
          <button
            style={{
              ...modalStyles.saveBtn,
              ...(saving ? modalStyles.saveBtnDisabled : {}),
            }}
            onClick={handleSave}
            disabled={saving}
            data-testid="dependency-picker-save"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DependencyPicker;
