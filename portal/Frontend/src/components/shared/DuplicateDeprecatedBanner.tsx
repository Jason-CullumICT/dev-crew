// Verifies: FR-0008 — Banners for duplicate and deprecated items in detail views
import React from 'react';

export interface DuplicateDeprecatedBannerProps {
  status: string;
  duplicateOf?: string | null;
  deprecationReason?: string | null;
  duplicatedBy?: string[];
}

const bannerStyles = {
  duplicate: {
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#92400e',
  } as React.CSSProperties,
  deprecated: {
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#4b5563',
  } as React.CSSProperties,
  duplicatedByBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#dbeafe',
    border: '1px solid #93c5fd',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#1d4ed8',
    marginBottom: '12px',
  } as React.CSSProperties,
  link: {
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'underline',
  } as React.CSSProperties,
};

// Verifies: FR-0008 — Infer route from item ID prefix
function getItemRoute(id: string): string {
  if (id.startsWith('BUG-')) return `/bugs/${id}`;
  if (id.startsWith('FR-')) return `/feature-requests/${id}`;
  return '#';
}

// Verifies: FR-0008
export const DuplicateDeprecatedBanner: React.FC<DuplicateDeprecatedBannerProps> = ({
  status,
  duplicateOf,
  deprecationReason,
  duplicatedBy,
}) => {
  return (
    <>
      {/* Verifies: FR-0008 — Duplicate banner with link to canonical item */}
      {status === 'duplicate' && duplicateOf && (
        <div style={bannerStyles.duplicate} data-testid="duplicate-banner">
          This item is a duplicate of{' '}
          <a href={getItemRoute(duplicateOf)} style={bannerStyles.link}>
            {duplicateOf}
          </a>
        </div>
      )}

      {/* Verifies: FR-0008 — Deprecated banner with optional reason */}
      {status === 'deprecated' && (
        <div style={bannerStyles.deprecated} data-testid="deprecated-banner">
          This item has been deprecated
          {deprecationReason ? `: ${deprecationReason}` : ''}
        </div>
      )}

      {/* Verifies: FR-0008 — Duplicated-by badge on canonical items */}
      {duplicatedBy && duplicatedBy.length > 0 && (
        <span style={bannerStyles.duplicatedByBadge} data-testid="duplicated-by-badge">
          {duplicatedBy.length} duplicate{duplicatedBy.length !== 1 ? 's' : ''} point to this item
        </span>
      )}
    </>
  );
};

export default DuplicateDeprecatedBanner;
