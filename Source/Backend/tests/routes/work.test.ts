// Verifies: FR-preflight-gating — POST /api/work route with pre-flight validation

import request from 'supertest';
import app from '../../src/app';
import { resetStore } from '../../src/store/workItemStore';

// Mock only the async GitHub-calling functions; keep parseRepoSlug real
jest.mock('../../src/services/preflightValidator', () => {
  const actual = jest.requireActual('../../src/services/preflightValidator');
  return {
    ...actual,
    validateRepoAccess: jest.fn(),
    validateBranch: jest.fn(),
  };
});

import * as preflightValidator from '../../src/services/preflightValidator';

const mockValidateRepoAccess = preflightValidator.validateRepoAccess as jest.Mock;
const mockValidateBranch = preflightValidator.validateBranch as jest.Mock;

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  // Restore a clean env copy before each test
  process.env = { ...ORIGINAL_ENV, GITHUB_TOKEN: 'ghp_test_token' };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

// ─── Required field validation ───────────────────────────────────────────────

describe('POST /api/work — field validation', () => {
  // Verifies: FR-preflight-gating — task is mandatory
  it('returns 400 when task field is missing', async () => {
    const res = await request(app).post('/api/work').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/task.*required/i);
  });

  it('returns 400 when task is an empty string', async () => {
    const res = await request(app).post('/api/work').send({ task: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/task.*required/i);
  });

  // Verifies: FR-preflight-gating — invalid repo format returns 400
  it('returns 400 when repo is provided but has an invalid format', async () => {
    const res = await request(app)
      .post('/api/work')
      .send({ task: 'fix login bug', repo: 'not-a-valid-repo-slug' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid repo format/i);
    expect(mockValidateRepoAccess).not.toHaveBeenCalled();
  });
});

// ─── No-repo path (no GitHub validation) ────────────────────────────────────

describe('POST /api/work — no repo provided', () => {
  // Verifies: FR-preflight-gating — submission without repo skips GitHub validation
  it('returns 202 when no repo is provided (no GitHub validation needed)', async () => {
    const res = await request(app)
      .post('/api/work')
      .send({ task: 'Implement dark mode toggle' });

    expect(res.status).toBe(202);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('accepted');
    expect(res.body.statusUrl).toMatch(/\/api\/work-items\//);
    expect(mockValidateRepoAccess).not.toHaveBeenCalled();
  });

  it('returns 202 and counts 0 attachments when no images provided', async () => {
    const res = await request(app)
      .post('/api/work')
      .send({ task: 'Build new feature' });

    expect(res.status).toBe(202);
    expect(res.body.attachments).toBe(0);
  });

  it('returns 202 and counts images in attachment field', async () => {
    const res = await request(app).post('/api/work').send({
      task: 'Build new feature',
      images: [
        { name: 'screenshot.png', data: 'base64abc' },
        { name: 'diagram.png', data: 'base64def' },
      ],
    });

    expect(res.status).toBe(202);
    expect(res.body.attachments).toBe(2);
  });
});

// ─── GITHUB_TOKEN missing ────────────────────────────────────────────────────

describe('POST /api/work — token missing', () => {
  // Verifies: FR-preflight-gating — return 401 when repo is given but no GITHUB_TOKEN
  it('returns 401 when repo is provided but GITHUB_TOKEN env var is not set', async () => {
    delete process.env.GITHUB_TOKEN;

    const res = await request(app)
      .post('/api/work')
      .send({ task: 'fix bug', repo: 'owner/myrepo' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/GITHUB_TOKEN/i);
    expect(mockValidateRepoAccess).not.toHaveBeenCalled();
  });
});

// ─── Repo access validation failures ────────────────────────────────────────

describe('POST /api/work — repo validation', () => {
  // Verifies: FR-preflight-gating — bad token → 401
  it('returns 401 when GitHub says the token is invalid (401)', async () => {
    mockValidateRepoAccess.mockResolvedValue({
      valid: false,
      statusCode: 401,
      error: 'GitHub token is invalid or lacks authentication.',
    });

    const res = await request(app)
      .post('/api/work')
      .send({ task: 'new feature', repo: 'owner/myrepo' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or lacks authentication/i);
  });

  // Verifies: FR-preflight-gating — repo not found → 404
  it('returns 404 when GitHub says the repo does not exist (404)', async () => {
    mockValidateRepoAccess.mockResolvedValue({
      valid: false,
      statusCode: 404,
      error: "Repository 'owner/ghost' not found or is not accessible with the provided token.",
    });

    const res = await request(app)
      .post('/api/work')
      .send({ task: 'new feature', repo: 'owner/ghost' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  // Verifies: FR-preflight-gating — valid repo → 202 accepted
  it('returns 202 when repo access is validated successfully', async () => {
    mockValidateRepoAccess.mockResolvedValue({ valid: true });

    const res = await request(app)
      .post('/api/work')
      .send({ task: 'implement feature', repo: 'owner/myrepo' });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('accepted');
    expect(mockValidateRepoAccess).toHaveBeenCalledWith(
      'ghp_test_token',
      'owner/myrepo',
    );
  });
});

// ─── Branch validation ───────────────────────────────────────────────────────

describe('POST /api/work — branch validation', () => {
  beforeEach(() => {
    // Repo access always passes in this describe block
    mockValidateRepoAccess.mockResolvedValue({ valid: true });
  });

  // Verifies: FR-preflight-gating — valid branch → 202
  it('returns 202 when both repo and branch are valid', async () => {
    mockValidateBranch.mockResolvedValue({ valid: true });

    const res = await request(app).post('/api/work').send({
      task: 'implement feature',
      repo: 'owner/myrepo',
      repoBranch: 'feature/my-branch',
    });

    expect(res.status).toBe(202);
    expect(res.body.branch).toBe('feature/my-branch');
    expect(mockValidateBranch).toHaveBeenCalledWith(
      'ghp_test_token',
      'owner/myrepo',
      'feature/my-branch',
    );
  });

  // Verifies: FR-preflight-gating — branch not found → 404
  it('returns 404 when the branch does not exist', async () => {
    mockValidateBranch.mockResolvedValue({
      valid: false,
      statusCode: 404,
      error: "Branch 'wrong-branch' not found in repository 'owner/myrepo'.",
    });

    const res = await request(app).post('/api/work').send({
      task: 'implement feature',
      repo: 'owner/myrepo',
      repoBranch: 'wrong-branch',
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  // Verifies: FR-preflight-gating — repoBranch without repo is ignored (no validation)
  it('ignores repoBranch when no repo is provided', async () => {
    const res = await request(app).post('/api/work').send({
      task: 'implement feature',
      repoBranch: 'main',
    });

    expect(res.status).toBe(202);
    expect(mockValidateBranch).not.toHaveBeenCalled();
  });
});

// ─── Response shape ──────────────────────────────────────────────────────────

describe('POST /api/work — response shape', () => {
  // Verifies: FR-preflight-gating — WorkSubmissionResponse fields are present
  it('returns the full WorkSubmissionResponse shape on success', async () => {
    mockValidateRepoAccess.mockResolvedValue({ valid: true });
    mockValidateBranch.mockResolvedValue({ valid: true });

    const res = await request(app).post('/api/work').send({
      task: 'Add login page',
      repo: 'owner/myrepo',
      repoBranch: 'main',
      images: [{ name: 'mock.png', data: 'abc' }],
    });

    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      status: 'accepted',
      message: expect.any(String),
      statusUrl: expect.stringMatching(/\/api\/work-items\//),
      attachments: 1,
      branch: 'main',
    });
  });
});
