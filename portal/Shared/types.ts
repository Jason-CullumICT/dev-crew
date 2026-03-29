// Verifies: FR-DUP-001 — Shared type definitions for bugs and feature requests

// --- Bug Types ---

export type BugStatus =
  | 'open'
  | 'in-progress'
  | 'resolved'
  | 'closed'
  | 'duplicate'    // Verifies: FR-DUP-002
  | 'deprecated';  // Verifies: FR-DUP-003

export interface Bug {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  duplicate_of?: string;        // Verifies: FR-DUP-004 — ID of canonical bug (e.g. "BUG-0012")
  deprecation_reason?: string;  // Verifies: FR-DUP-005 — reason for deprecation
  duplicated_by?: string[];     // Verifies: FR-DUP-006 — IDs of bugs that are duplicates of this one
}

// --- Feature Request Types ---

export type FeatureRequestStatus =
  | 'open'
  | 'in-progress'
  | 'completed'
  | 'closed'
  | 'duplicate'    // Verifies: FR-DUP-002
  | 'deprecated';  // Verifies: FR-DUP-003

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  duplicate_of?: string;        // Verifies: FR-DUP-004
  deprecation_reason?: string;  // Verifies: FR-DUP-005
  duplicated_by?: string[];     // Verifies: FR-DUP-006
}
