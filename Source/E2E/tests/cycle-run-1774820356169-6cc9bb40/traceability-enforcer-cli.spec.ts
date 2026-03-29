import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

// Verifies: FR-TRACE-001
test.describe('Feature: Traceability Enforcer CLI', () => {
  test('should produce valid JSON with --json flag', () => {
    const result = execSync(
      'python3 tools/traceability-enforcer.py --json --file Plans/pr-traceability-report/requirements.md 2>&1 || true',
      { encoding: 'utf-8', cwd: process.cwd() }
    );
    const data = JSON.parse(result.trim());
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('total_frs');
    expect(data).toHaveProperty('covered_frs');
    expect(data).toHaveProperty('missing_frs');
    expect(data).toHaveProperty('coverage_percent');
    expect(data).toHaveProperty('requirements_file');
    expect(['passed', 'failed']).toContain(data.status);
    expect(typeof data.total_frs).toBe('number');
    expect(Array.isArray(data.covered_frs)).toBe(true);
    expect(Array.isArray(data.missing_frs)).toBe(true);
  });

  test('should produce human-readable text without --json flag', () => {
    const result = execSync(
      'python3 tools/traceability-enforcer.py --file Plans/pr-traceability-report/requirements.md 2>&1 || true',
      { encoding: 'utf-8', cwd: process.cwd() }
    );
    // Text output should NOT be JSON
    expect(() => JSON.parse(result.trim())).toThrow();
    // Should contain human-readable markers
    expect(result).toMatch(/Targeting requirements from:|TRACEABILITY/);
  });

  test('should return valid JSON for empty requirements', () => {
    const result = execSync(
      'python3 tools/traceability-enforcer.py --json --file /dev/null 2>&1',
      { encoding: 'utf-8', cwd: process.cwd() }
    );
    const data = JSON.parse(result.trim());
    expect(data.status).toBe('passed');
    expect(data.total_frs).toBe(0);
    expect(data.covered_frs).toEqual([]);
    expect(data.missing_frs).toEqual([]);
  });
});
