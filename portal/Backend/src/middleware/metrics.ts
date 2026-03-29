// Verifies: FR-DUP-017 — Prometheus-style metrics for domain operations

export interface MetricEntry {
  name: string;
  value: number;
  labels: Record<string, string>;
}

const counters: Map<string, number> = new Map();

function counterKey(name: string, labels: Record<string, string>): string {
  const labelStr = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}="${v}"`).join(',');
  return `${name}{${labelStr}}`;
}

export const metrics = {
  increment(name: string, labels: Record<string, string> = {}): void {
    const key = counterKey(name, labels);
    counters.set(key, (counters.get(key) ?? 0) + 1);
  },

  get(name: string, labels: Record<string, string> = {}): number {
    const key = counterKey(name, labels);
    return counters.get(key) ?? 0;
  },

  reset(): void {
    counters.clear();
  },
};
