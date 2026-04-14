// Verifies: FR-preflight-validator — Pre-flight GitHub validation service tests

import {
  parseRepoSlug,
  validateRepoAccess,
  validateBranch,
  HttpGetFn,
} from '../../src/services/preflightValidator';

// Helper to create a mock HttpGetFn that resolves with a given status
function mockHttp(status: number): HttpGetFn {
  return jest.fn().mockResolvedValue({ status });
}

// Helper to create a mock HttpGetFn that rejects
function failingHttp(message: string): HttpGetFn {
  return jest.fn().mockRejectedValue(new Error(message));
}

// ─── parseRepoSlug ──────────────────────────────────────────────────────────

describe('parseRepoSlug', () => {
  // Verifies: FR-preflight-validator — Valid owner/name slug formats
  it('parses standard owner/name format', () => {
    expect(parseRepoSlug('octocat/hello-world')).toEqual({
      owner: 'octocat',
      name: 'hello-world',
    });
  });

  it('parses org with dots and underscores', () => {
    expect(parseRepoSlug('my-org/my_repo.v2')).toEqual({
      owner: 'my-org',
      name: 'my_repo.v2',
    });
  });

  it('parses numeric segments', () => {
    expect(parseRepoSlug('user123/repo456')).toEqual({
      owner: 'user123',
      name: 'repo456',
    });
  });

  // Verifies: FR-preflight-validator — Invalid slug formats return null
  it('returns null for a string with no slash', () => {
    expect(parseRepoSlug('notaslug')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseRepoSlug('')).toBeNull();
  });

  it('returns null for a multi-slash path', () => {
    expect(parseRepoSlug('a/b/c')).toBeNull();
  });

  it('returns null for a leading slash', () => {
    expect(parseRepoSlug('/noslash')).toBeNull();
  });

  it('returns null for a trailing slash', () => {
    expect(parseRepoSlug('owner/')).toBeNull();
  });
});

// ─── validateRepoAccess ─────────────────────────────────────────────────────

describe('validateRepoAccess', () => {
  // Verifies: FR-preflight-validator — 200 means the token has access
  it('returns valid:true when GitHub API responds 200', async () => {
    const result = await validateRepoAccess('ghp_validtoken', 'owner/repo', mockHttp(200));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Verifies: FR-preflight-validator — 401 from GitHub → token invalid
  it('returns valid:false with statusCode 401 when GitHub returns 401', async () => {
    const result = await validateRepoAccess('bad-token', 'owner/repo', mockHttp(401));
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.error).toMatch(/invalid or lacks authentication/i);
  });

  // Verifies: FR-preflight-validator — 403 from GitHub → token lacks access, surface as 401
  it('returns valid:false with statusCode 401 when GitHub returns 403', async () => {
    const result = await validateRepoAccess('no-scope-token', 'owner/repo', mockHttp(403));
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.error).toMatch(/does not have access/i);
  });

  // Verifies: FR-preflight-validator — 404 from GitHub → repo not found
  it('returns valid:false with statusCode 404 when GitHub returns 404', async () => {
    const result = await validateRepoAccess('ghp_validtoken', 'owner/nonexistent', mockHttp(404));
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.error).toMatch(/not found/i);
  });

  // Verifies: FR-preflight-validator — invalid format short-circuits before HTTP call
  it('returns valid:false with statusCode 400 for invalid repo format', async () => {
    const http = mockHttp(200);
    const result = await validateRepoAccess('ghp_validtoken', 'notavalidformat', http);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.error).toMatch(/invalid repo format/i);
    expect(http).not.toHaveBeenCalled();
  });

  // Verifies: FR-preflight-validator — unexpected status codes are surfaced
  it('returns valid:false with the raw status code for unexpected responses', async () => {
    const result = await validateRepoAccess('ghp_validtoken', 'owner/repo', mockHttp(500));
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(500);
  });

  // Verifies: FR-preflight-validator — network errors are re-thrown (not swallowed)
  it('re-throws when the HTTP call fails with a network error', async () => {
    await expect(
      validateRepoAccess('ghp_validtoken', 'owner/repo', failingHttp('ECONNREFUSED')),
    ).rejects.toThrow('ECONNREFUSED');
  });
});

// ─── validateBranch ─────────────────────────────────────────────────────────

describe('validateBranch', () => {
  // Verifies: FR-preflight-validator — branch exists
  it('returns valid:true when GitHub responds 200 for the branch', async () => {
    const result = await validateBranch('ghp_validtoken', 'owner/repo', 'main', mockHttp(200));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Verifies: FR-preflight-validator — 404 → branch not found
  it('returns valid:false with statusCode 404 when branch does not exist', async () => {
    const result = await validateBranch(
      'ghp_validtoken',
      'owner/repo',
      'nonexistent-branch',
      mockHttp(404),
    );
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.error).toMatch(/branch.*not found/i);
  });

  // Verifies: FR-preflight-validator — invalid repo format short-circuits
  it('returns valid:false with statusCode 400 for invalid repo format', async () => {
    const http = mockHttp(200);
    const result = await validateBranch('ghp_validtoken', 'notvalid', 'main', http);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(http).not.toHaveBeenCalled();
  });

  // Verifies: FR-preflight-validator — network errors are re-thrown (not swallowed)
  it('re-throws when the HTTP call fails with a network error', async () => {
    await expect(
      validateBranch('ghp_validtoken', 'owner/repo', 'main', failingHttp('ETIMEDOUT')),
    ).rejects.toThrow('ETIMEDOUT');
  });

  it('surfaces unexpected status codes from GitHub', async () => {
    const result = await validateBranch('ghp_validtoken', 'owner/repo', 'main', mockHttp(503));
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(503);
  });
});
