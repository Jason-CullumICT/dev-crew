// Verifies: FR-025
// Verifies: FR-084
// Verifies: FR-087
// Verifies: FR-DUP-09, FR-DUP-10
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { FeatureRequest, ImageAttachment } from '../../../../Shared/types'
import { HIDDEN_STATUSES } from '../../../../Shared/types'
import { VoteResults } from './VoteResults'
import { featureRequests, images, orchestrator, repos } from '../../api/client'
import { ImageThumbnails } from '../common/ImageThumbnails'
import { ImageUpload } from '../common/ImageUpload'
import { DependencySection } from '../shared/DependencySection'

interface FeatureRequestDetailProps {
  fr: FeatureRequest
  onUpdate: (updated: FeatureRequest) => void
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  potential: 'bg-gray-100 text-gray-700',
  voting: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  in_development: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  pending_dependencies: 'bg-amber-50 text-amber-600 border border-amber-200',
  duplicate: 'bg-purple-100 text-purple-700',      // Verifies: FR-DUP-10
  deprecated: 'bg-gray-200 text-gray-500',          // Verifies: FR-DUP-10
}

export function FeatureRequestDetail({ fr, onUpdate, onClose }: FeatureRequestDetailProps) {
  const [loading, setLoading] = useState(false)
  const [denyComment, setDenyComment] = useState('')
  const [showDenyForm, setShowDenyForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([])
  const [submittingToOrch, setSubmittingToOrch] = useState(false)
  // Verifies: FR-DUP-09
  const [showDuplicateForm, setShowDuplicateForm] = useState(false)
  const [duplicateOfId, setDuplicateOfId] = useState('')
  const [showDeprecatedForm, setShowDeprecatedForm] = useState(false)
  const [deprecationReason, setDeprecationReason] = useState('')
  const [markingStatus, setMarkingStatus] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState(fr.target_repo || "https://github.com/Jason-CullumICT/dev-crew")
  const [sessionToken, setSessionToken] = useState("")
  const [tokenLabel, setTokenLabel] = useState("")
  const [customRepo, setCustomRepo] = useState("")
  const [showCustomRepo, setShowCustomRepo] = useState(false)
  const [validatingRepo, setValidatingRepo] = useState(false)
  const [knownRepos, setKnownRepos] = useState<{ name: string; fullName: string; url: string }[]>([])

  // FR-084: Fetch images on mount and when FR changes
  const fetchImages = useCallback(async () => {
    try {
      const result = await images.list('feature-requests', fr.id)
      setAttachedImages(result.data)
    } catch {
      // Image fetch failure is non-blocking
    }
  }, [fr.id])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  useEffect(() => {
    repos.list().then((r) => {
      let repoList = r.data;
      // Ensure the saved target_repo is in the list so the dropdown preserves it
      const saved = fr.target_repo;
      if (saved && !repoList.some((repo) => repo.url === saved)) {
        const name = saved.split("/").pop() || saved;
        const fullName = saved.replace("https://github.com/", "");
        repoList = [{ name, fullName, url: saved }, ...repoList];
      }
      setKnownRepos(repoList);
    }).catch(() => {})
  }, [])

  // FR-084: Handle image upload from detail view
  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return
    try {
      await images.upload('feature-requests', fr.id, files)
      fetchImages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images')
    }
  }

  // FR-084: Handle image deletion
  const handleImageDelete = async (imageId: string) => {
    try {
      await images.delete('feature-requests', fr.id, imageId)
      setAttachedImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image')
    }
  }

  // FR-087: Submit to orchestrator with images
  const handleSubmitToOrchestrator = async () => {
    setSubmittingToOrch(true)
    setError(null)
    try {
      const imageFiles: File[] = []
      for (const img of attachedImages) {
        const res = await fetch(`/uploads/${img.filename}`)
        const blob = await res.blob()
        imageFiles.push(new File([blob], img.original_name, { type: img.mime_type }))
      }
      await orchestrator.submitWork(
        `Implement feature: ${fr.title}\n\n${fr.description}`,
        { images: imageFiles.length > 0 ? imageFiles : undefined, claudeSessionToken: sessionToken || undefined, tokenLabel: tokenLabel || undefined }
      )
      // Update feature request status to in_development
      const updated = await featureRequests.update(fr.id, { status: "in_development" })
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit to orchestrator')
    } finally {
      setSubmittingToOrch(false)
    }
  }

  const handleVote = async () => {
    setLoading(true)
    setError(null)
    try {
      const updated = await featureRequests.vote(fr.id)
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger voting')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setLoading(true)
    setError(null)
    try {
      const updated = await featureRequests.approve(fr.id)
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  const handleDeny = async () => {
    if (!denyComment.trim()) {
      setError('A comment is required to deny')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const updated = await featureRequests.deny(fr.id, { comment: denyComment.trim() })
      onUpdate(updated)
      setShowDenyForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny')
    } finally {
      setLoading(false)
    }
  }

  // Verifies: FR-DUP-09
  const handleMarkDuplicate = async () => {
    const trimmed = duplicateOfId.trim().toUpperCase()
    if (!trimmed || !trimmed.startsWith('FR-')) {
      setError('Please enter a valid feature request ID (e.g. FR-0008)')
      return
    }
    if (trimmed === fr.id) {
      setError('An item cannot be a duplicate of itself')
      return
    }
    setMarkingStatus(true)
    setError(null)
    try {
      const updated = await featureRequests.update(fr.id, { status: 'duplicate', duplicate_of: trimmed })
      onUpdate(updated)
      setShowDuplicateForm(false)
      setDuplicateOfId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as duplicate')
    } finally {
      setMarkingStatus(false)
    }
  }

  // Verifies: FR-DUP-09
  const handleMarkDeprecated = async () => {
    setMarkingStatus(true)
    setError(null)
    try {
      const updated = await featureRequests.update(fr.id, {
        status: 'deprecated',
        deprecation_reason: deprecationReason.trim() || undefined,
      })
      onUpdate(updated)
      setShowDeprecatedForm(false)
      setDeprecationReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as deprecated')
    } finally {
      setMarkingStatus(false)
    }
  }

  const isHidden = HIDDEN_STATUSES.includes(fr.status)
  const canVote = fr.status === 'potential'
  const canApprove = fr.status === 'voting'
  const canDeny = fr.status === 'potential' || fr.status === 'voting'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
      {/* Verifies: FR-DUP-10 — Duplicate banner */}
      {fr.status === 'duplicate' && fr.duplicate_of && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
          This feature request is a duplicate of{' '}
          <Link to="/feature-requests" className="font-semibold underline hover:text-purple-900">
            {fr.duplicate_of}
          </Link>
        </div>
      )}

      {/* Verifies: FR-DUP-10 — Deprecated banner */}
      {fr.status === 'deprecated' && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700">
          This feature request is deprecated.{fr.deprecation_reason ? ` Reason: ${fr.deprecation_reason}` : ''}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{fr.id}</span>
            {fr.duplicate_warning && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                ⚠ Possible duplicate
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{fr.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              STATUS_COLORS[fr.status] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {fr.status.replace('_', ' ')}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Description
        </h4>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{fr.description}</p>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Dependencies
        </h4>
        <DependencySection
          blockedBy={fr.blocked_by ?? []}
          blocks={fr.blocks ?? []}
          itemType="feature_request"
          itemId={fr.id}
          editable={true}
          status={fr.status}
          onDependenciesChanged={() => {
            featureRequests.getById(fr.id).then(onUpdate)
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</span>
          <p className="text-gray-700 mt-0.5 capitalize">{fr.source.replace('_', ' ')}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</span>
          <p className="text-gray-700 mt-0.5 capitalize">{fr.priority}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</span>
          <p className="text-gray-700 mt-0.5">{new Date(fr.created_at).toLocaleString()}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Updated</span>
          <p className="text-gray-700 mt-0.5">{new Date(fr.updated_at).toLocaleString()}</p>
        </div>
      </div>

      {fr.human_approval_comment && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <span className="font-medium text-gray-600">Approval comment: </span>
          <span className="text-gray-700">{fr.human_approval_comment}</span>
        </div>
      )}

      {/* FR-084: Image Attachments */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Attachments ({attachedImages.length})
        </h4>
        <ImageThumbnails
          images={attachedImages}
          allowDelete
          onDelete={handleImageDelete}
        />
        <div className="mt-2">
          <ImageUpload onFilesSelected={handleImageUpload} />
        </div>
      </div>

      {/* Vote Results */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          AI Vote Results ({fr.votes.length})
        </h4>
        <VoteResults votes={fr.votes} />
      </div>

      {/* Actions */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        {canVote && (
          <button
            onClick={handleVote}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Trigger AI Voting'}
          </button>
        )}
        {canApprove && (
          <button
            onClick={handleApprove}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
        )}
        {canDeny && !showDenyForm && (
          <button
            onClick={() => setShowDenyForm(true)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Deny
          </button>
        )}
        {/* FR-087: Submit approved FR to orchestrator with repo selection */}
        {fr.status === 'approved' && (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Target repo:</label>
              <select
                value={showCustomRepo ? "__custom__" : selectedRepo}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setShowCustomRepo(true)
                  } else {
                    setShowCustomRepo(false)
                    setSelectedRepo(e.target.value)
                  }
                }}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {knownRepos.map((r) => (
                  <option key={r.url} value={r.url}>{r.name}</option>
                ))}
                <option value="__custom__">+ New repo...</option>
              </select>
              {showCustomRepo && (
                <input
                  type="text"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  placeholder="owner/repo-name"
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            <div className="flex gap-2 items-end mt-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Session Token (optional)</label>
                <input
                  type="password"
                  value={sessionToken}
                  onChange={(e) => setSessionToken(e.target.value)}
                  placeholder="sk-ant-oat01-..."
                  className="text-xs font-mono border border-gray-300 rounded-lg px-2 py-1 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Token Label</label>
                <input
                  type="text"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                  placeholder="e.g. jason's token"
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleSubmitToOrchestrator}
              disabled={submittingToOrch || validatingRepo}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 self-start"
            >
              {validatingRepo ? 'Validating repo...' : submittingToOrch ? 'Submitting...' : 'Submit to Orchestrator'}
            </button>
          </div>
        )}
      </div>

      {showDenyForm && (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
          <h4 className="text-sm font-medium text-red-800">Deny Feature Request</h4>
          <textarea
            value={denyComment}
            onChange={(e) => setDenyComment(e.target.value)}
            placeholder="Reason for denial (required)"
            rows={3}
            className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDeny}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Deny'}
            </button>
            <button
              onClick={() => { setShowDenyForm(false); setDenyComment('') }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Verifies: FR-DUP-09 — Mark as Duplicate / Deprecated actions */}
      {!isHidden && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Disposition</h4>
          <div className="flex flex-wrap gap-2">
            {!showDuplicateForm && !showDeprecatedForm && (
              <>
                <button
                  onClick={() => { setShowDuplicateForm(true); setShowDeprecatedForm(false) }}
                  className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
                >
                  Mark as Duplicate
                </button>
                <button
                  onClick={() => { setShowDeprecatedForm(true); setShowDuplicateForm(false) }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                >
                  Mark as Deprecated
                </button>
              </>
            )}
          </div>

          {showDuplicateForm && (
            <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 space-y-2">
              <label className="text-sm font-medium text-purple-800">Canonical Feature Request ID</label>
              <input
                type="text"
                value={duplicateOfId}
                onChange={(e) => setDuplicateOfId(e.target.value)}
                placeholder="FR-0008"
                className="w-full px-3 py-1.5 border border-purple-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleMarkDuplicate}
                  disabled={markingStatus}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {markingStatus ? 'Saving...' : 'Confirm Duplicate'}
                </button>
                <button
                  onClick={() => { setShowDuplicateForm(false); setDuplicateOfId('') }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showDeprecatedForm && (
            <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
              <label className="text-sm font-medium text-gray-700">Deprecation Reason (optional)</label>
              <input
                type="text"
                value={deprecationReason}
                onChange={(e) => setDeprecationReason(e.target.value)}
                placeholder="e.g. Superseded by FR-0009"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleMarkDeprecated}
                  disabled={markingStatus}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {markingStatus ? 'Saving...' : 'Confirm Deprecated'}
                </button>
                <button
                  onClick={() => { setShowDeprecatedForm(false); setDeprecationReason('') }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
