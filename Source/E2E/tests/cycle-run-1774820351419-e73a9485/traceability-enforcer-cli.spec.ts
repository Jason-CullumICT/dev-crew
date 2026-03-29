// Verifies: FR-TRACE-001
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Feature: Traceability Enforcer CLI', () => {
  test('--json flag produces valid JSON output', () => {
    // Run the enforcer with --json and a known requirements file
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
    expect(typeof data.coverage_percent).toBe('number');
  });

  test('without --json flag produces human-readable output', () => {
    const result = execSync(
      'python3 tools/traceability-enforcer.py --file Plans/pr-traceability-report/requirements.md 2>&1 || true',
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    expect(result).toContain('Targeting requirements from:');
    expect(result).toContain('Scanning');
  });

  test('--json with empty requirements file returns zero FRs', () => {
    // Create a temp empty file
    const fs = require('fs');
    const tmpFile = '/tmp/empty-reqs-e2e.md';
    fs.writeFileSync(tmpFile, '# No FRs here\n');

    const result = execSync(
      `python3 tools/traceability-enforcer.py --json --file ${tmpFile} 2>&1`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    const data = JSON.parse(result.trim());
    expect(data.status).toBe('passed');
    expect(data.total_frs).toBe(0);
    expect(data.covered_frs).toEqual([]);
    expect(data.missing_frs).toEqual([]);
  });
});
