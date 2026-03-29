// Verifies: FR-DUP-015 — In-memory database layer for bugs and feature requests

import { BugRow, FeatureRequestRow } from './schema';

// In-memory stores
let bugs: BugRow[] = [];
let featureRequests: FeatureRequestRow[] = [];

export function getBugsStore(): BugRow[] {
  return bugs;
}

export function getFeatureRequestsStore(): FeatureRequestRow[] {
  return featureRequests;
}

export function setBugsStore(data: BugRow[]): void {
  bugs = data;
}

export function setFeatureRequestsStore(data: FeatureRequestRow[]): void {
  featureRequests = data;
}

export function resetStores(): void {
  bugs = [];
  featureRequests = [];
}
