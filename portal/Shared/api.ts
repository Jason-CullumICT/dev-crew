// Verifies: FR-DUP-007 — API input types for duplicate/deprecated tagging

// Input type for marking an item as a duplicate
// Verifies: FR-DUP-008
export interface MarkDuplicateInput {
  status: 'duplicate';
  duplicate_of: string;  // required — ID of the canonical item
}

// Input type for marking an item as deprecated
// Verifies: FR-DUP-009
export interface MarkDeprecatedInput {
  status: 'deprecated';
  deprecation_reason?: string;  // optional reason
}

// Union type for all status-change inputs that carry extra metadata
export type StatusChangeInput = MarkDuplicateInput | MarkDeprecatedInput;

// Generic list response wrapper
// Verifies: FR-DUP-010
export interface ListResponse<T> {
  data: T[];
}

// Query parameters for list endpoints
export interface ListQueryParams {
  include_hidden?: boolean;
}
