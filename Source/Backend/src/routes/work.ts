// Verifies: FR-preflight-gating — POST /api/work — Work submission with pre-flight validation
// Validates GitHub token access and branch existence before accepting the submission,
// surfacing clear 401/404 errors instead of failing 5+ minutes into a pipeline container.

import { Router, Request, Response } from 'express';
import {
  WorkSubmissionRequest,
  WorkSubmissionResponse,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import {
  parseRepoSlug,
  validateRepoAccess,
  validateBranch,
} from '../services/preflightValidator';
import { preflightValidationsCounter } from '../metrics';
import logger from '../logger';

const router = Router();

// Verifies: FR-preflight-gating — POST /api/work
// Accepts a WorkSubmissionRequest, runs pre-flight validation, and returns 202 on success.
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as WorkSubmissionRequest;

    // ── 1. Validate required fields ──────────────────────────────────────────
    if (!body.task || !body.task.trim()) {
      res.status(400).json({ error: 'task is required and must not be empty' });
      return;
    }

    // ── 2. If a repo is specified, validate its format and GitHub access ─────
    if (body.repo) {
      // 2a. Validate the owner/name format before making any network calls
      const parsed = parseRepoSlug(body.repo);
      if (!parsed) {
        preflightValidationsCounter.inc({ result: 'failed', failureReason: 'invalid_format' });
        logger.warn({ msg: 'Pre-flight rejected: invalid repo format', repo: body.repo });
        res.status(400).json({
          error: `Invalid repo format '${body.repo}'. Expected 'owner/name' (e.g. 'myorg/myrepo').`,
        });
        return;
      }

      // 2b. Require a GitHub token — without it we cannot validate access
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        preflightValidationsCounter.inc({ result: 'failed', failureReason: 'token_missing' });
        logger.warn({ msg: 'Pre-flight rejected: GITHUB_TOKEN not configured', repo: body.repo });
        res.status(401).json({
          error:
            'GITHUB_TOKEN is not configured on this server. ' +
            'A GitHub token is required to validate repository access.',
        });
        return;
      }

      // 2c. Validate repo access (token auth + repo existence)
      const repoResult = await validateRepoAccess(token, body.repo);
      if (!repoResult.valid) {
        const failureReason = repoResult.statusCode === 401 ? 'unauthorized' : 'repo_not_found';
        preflightValidationsCounter.inc({ result: 'failed', failureReason });
        logger.warn({
          msg: 'Pre-flight rejected: repo access validation failed',
          repo: body.repo,
          statusCode: repoResult.statusCode,
          error: repoResult.error,
        });
        res.status(repoResult.statusCode ?? 400).json({ error: repoResult.error });
        return;
      }

      // 2d. If a branch is also specified, validate it exists
      if (body.repoBranch) {
        const branchResult = await validateBranch(token, body.repo, body.repoBranch);
        if (!branchResult.valid) {
          preflightValidationsCounter.inc({ result: 'failed', failureReason: 'branch_not_found' });
          logger.warn({
            msg: 'Pre-flight rejected: branch not found',
            repo: body.repo,
            branch: body.repoBranch,
            statusCode: branchResult.statusCode,
          });
          res.status(branchResult.statusCode ?? 404).json({ error: branchResult.error });
          return;
        }
      }
    }

    // ── 3. Pre-flight passed — record the work submission as a work item ─────
    // Truncate task to 200 chars for the title; store full text as description.
    const title = body.task.substring(0, 200).trim();
    const workItem = store.createWorkItem({
      title,
      description: body.task,
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });

    preflightValidationsCounter.inc({ result: 'passed', failureReason: 'none' });

    logger.info({
      msg: 'Work submission accepted after pre-flight validation',
      workItemId: workItem.id,
      docId: workItem.docId,
      repo: body.repo ?? null,
      repoBranch: body.repoBranch ?? null,
      attachments: body.images?.length ?? 0,
    });

    const response: WorkSubmissionResponse = {
      id: workItem.id,
      status: 'accepted',
      message: 'Pre-flight validation passed. Work submission accepted.',
      statusUrl: `/api/work-items/${workItem.id}`,
      attachments: body.images?.length ?? 0,
      branch: body.repoBranch,
    };

    res.status(202).json(response);
  } catch (err: unknown) {
    // Re-throw after logging — errorHandler middleware will return 500
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Work submission pre-flight error', error: message });
    throw err;
  }
});

export default router;
