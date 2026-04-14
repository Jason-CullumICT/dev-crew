// Verifies: FR-preflight-validator — GitHub pre-flight validation service
// Validates repo access and branch existence via GitHub API before creating a run,
// failing fast instead of discovering problems 5+ minutes deep in a pipeline container.

import * as https from 'https';
import logger from '../logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreflightResult {
  valid: boolean;
  /** HTTP status code to surface to the caller (400 | 401 | 404 | …) */
  statusCode?: number;
  /** Human-readable error message for API response */
  error?: string;
}

/**
 * Minimal HTTP GET abstraction injected for testability.
 * Production code uses `defaultHttpGet`; tests pass a jest.fn() mock.
 */
export type HttpGetFn = (
  url: string,
  headers: Record<string, string>,
) => Promise<{ status: number }>;

// ─── Default HTTP implementation (Node built-in https) ──────────────────────

export const defaultHttpGet: HttpGetFn = (url, headers) =>
  new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers }, (res) => {
      // Drain the response body to free the socket; we only need the status
      res.resume();
      resolve({ status: res.statusCode ?? 0 });
    });
    req.on('error', reject);
    req.end();
  });

// ─── parseRepoSlug ──────────────────────────────────────────────────────────

/**
 * Verifies: FR-preflight-validator — Parse and validate "owner/name" repo slug.
 * Returns `{ owner, name }` on success, or `null` for any invalid format.
 */
export function parseRepoSlug(repo: string): { owner: string; name: string } | null {
  // GitHub owner/name allows alphanumerics, hyphens, underscores, and dots.
  const match = repo.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (!match) return null;
  return { owner: match[1], name: match[2] };
}

// ─── validateRepoAccess ─────────────────────────────────────────────────────

/**
 * Verifies: FR-preflight-validator — Validate that `token` has read access to `repoSlug`.
 *
 * Calls GET /repos/{owner}/{name} on the GitHub API and maps responses:
 *   200 → valid (access confirmed)
 *   401 → token is invalid or not authenticated
 *   403 → token is valid but lacks access to this repo (surfaced as 401 to caller)
 *   404 → repo does not exist or is private and not accessible with this token
 */
export async function validateRepoAccess(
  token: string,
  repoSlug: string,
  httpGet: HttpGetFn = defaultHttpGet,
): Promise<PreflightResult> {
  const parsed = parseRepoSlug(repoSlug);
  if (!parsed) {
    return {
      valid: false,
      statusCode: 400,
      error: `Invalid repo format '${repoSlug}'. Expected 'owner/name' (e.g. 'myorg/myrepo').`,
    };
  }

  const url = `https://api.github.com/repos/${parsed.owner}/${parsed.name}`;
  const headers: Record<string, string> = {
    'User-Agent': 'dev-crew-preflight/1.0',
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };

  let response: { status: number };
  try {
    response = await httpGet(url, headers);
  } catch (err: unknown) {
    // Re-throw — never swallow network errors silently
    const message = err instanceof Error ? err.message : 'GitHub API unreachable';
    logger.error({ msg: 'Pre-flight repo access check: network error', error: message, repoSlug });
    throw err;
  }

  const { status } = response;

  if (status === 200) {
    return { valid: true };
  }

  if (status === 401) {
    return {
      valid: false,
      statusCode: 401,
      error:
        'GitHub token is invalid or lacks authentication. ' +
        'Please provide a valid GITHUB_TOKEN with repo read access.',
    };
  }

  if (status === 403) {
    return {
      valid: false,
      statusCode: 401, // Surface as 401 — it is an access/auth problem
      error: `GitHub token does not have access to repository '${repoSlug}'. ` +
        'Ensure the token has the required repo scope.',
    };
  }

  if (status === 404) {
    return {
      valid: false,
      statusCode: 404,
      error:
        `Repository '${repoSlug}' not found or is not accessible with the provided token. ` +
        'Check the repo name and token permissions.',
    };
  }

  // Unexpected status — surface without crashing
  logger.warn({
    msg: 'Pre-flight repo access check: unexpected GitHub response',
    repoSlug,
    status,
  });
  return {
    valid: false,
    statusCode: status,
    error: `Unexpected GitHub API response (${status}) while checking repository access.`,
  };
}

// ─── validateBranch ─────────────────────────────────────────────────────────

/**
 * Verifies: FR-preflight-validator — Validate that `branch` exists in `repoSlug`.
 *
 * Calls GET /repos/{owner}/{name}/branches/{branch} on the GitHub API:
 *   200 → branch exists
 *   404 → branch does not exist in this repository
 */
export async function validateBranch(
  token: string,
  repoSlug: string,
  branch: string,
  httpGet: HttpGetFn = defaultHttpGet,
): Promise<PreflightResult> {
  const parsed = parseRepoSlug(repoSlug);
  if (!parsed) {
    return {
      valid: false,
      statusCode: 400,
      error: `Invalid repo format '${repoSlug}'. Expected 'owner/name'.`,
    };
  }

  const encodedBranch = encodeURIComponent(branch);
  const url = `https://api.github.com/repos/${parsed.owner}/${parsed.name}/branches/${encodedBranch}`;
  const headers: Record<string, string> = {
    'User-Agent': 'dev-crew-preflight/1.0',
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };

  let response: { status: number };
  try {
    response = await httpGet(url, headers);
  } catch (err: unknown) {
    // Re-throw — never swallow network errors silently
    const message = err instanceof Error ? err.message : 'GitHub API unreachable';
    logger.error({
      msg: 'Pre-flight branch check: network error',
      error: message,
      repoSlug,
      branch,
    });
    throw err;
  }

  const { status } = response;

  if (status === 200) {
    return { valid: true };
  }

  if (status === 404) {
    return {
      valid: false,
      statusCode: 404,
      error: `Branch '${branch}' not found in repository '${repoSlug}'. ` +
        'Check the branch name and ensure it has been pushed.',
    };
  }

  logger.warn({
    msg: 'Pre-flight branch check: unexpected GitHub response',
    repoSlug,
    branch,
    status,
  });
  return {
    valid: false,
    statusCode: status,
    error: `Unexpected GitHub API response (${status}) while checking branch existence.`,
  };
}
