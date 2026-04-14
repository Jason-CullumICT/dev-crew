// Verifies: FR-026
// Verifies: FR-068
// Verifies: FR-085
// Verifies: FR-DUP-09, FR-DUP-10
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { BugReport, ImageAttachment } from '../../../../Shared/types'
import { HIDDEN_STATUSES } from '../../../../Shared/types'
import { bugs, images, orchestrator, repos } from '../../api/client'
import { ImageThumbnails } from '../common/ImageThumbnails'
import { ImageUpload } from '../common/ImageUpload'
import { DependencySection } from '../shared/DependencySection'

interface BugDetailProps {
  bug: BugReport
  onUpdate: (bug: BugReport) => void
  onClose: () => void
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-gray-100 text-gray-500 border-gray-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_COLORS: Record<string, string> = {
  reported: 'bg-gray-100 text-gray-700',
  triaged: 'bg-blue-100 text-blue-700',
  in_development: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  pending_dependencies: 'bg-amber-50 text-amber-600 border border-amber-200',
  duplicate: 'bg-purple-100 text-purple-700',      // Verifies: FR-DUP-10
  deprecated: 'bg-gray-200 text-gray-500',          // Verifies: FR-DUP-10
}

export function BugDetail({ bug, onUpdate, onClose }: BugDetailProps) {
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submittingToOrch, setSubmittingToOrch] = useState(false)
  // Verifies: FR-DUP-09
  const [showDuplicateForm, setShowDuplicateForm] = useState(false)
  const [duplicateOfId, setDuplicateOfId] = useState('')
  const [showDeprecatedForm, setShowDeprecatedForm] = useState(false)
  const [deprecationReason, setDeprecationReason] = useState('')
  const [markingStatus, setMarkingStatus] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState(bug.target_repo || "https://github.com/Jason-CullumICT/dev-crew")
  const [sessionToken, setSessionToken] = useState("")
  const [tokenLabel, setTokenLabel] = useState("")
  const [pipelineMode, setPipelineMode] = useState<'local' | 'github_actions'>('local')
  const [knownRepos, setKnownRepos] = useState<{ name: string; url: string }[]>([
    { name: "dev-crew", url: "https://github.com/Jason-CullumICT/dev-crew" },
  ])

  // FR-085: Fetch images on mount
  const fetchImages = useCallback(async () => {
    try {
      const result = await images.list('bugs', bug.id)
      setAttachedImages(result.data)
    } catch {
      // Image fetch failure is non-blocking
    }
  }, [bug.id])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  useEffect(() => {
    repos.list().then((r) => {
      let repoList = r.data;
      // Ensure the saved target_repo is in the list so the dropdown preserves it
      const saved = bug.target_repo;
      if (saved && !repoList.some((repo) => repo.url === saved)) {
        const name = saved.split("/").pop() || saved;
        const fullName = saved.replace("https://github.com/", "");
        repoList = [{ name, fullName, url: saved }, ...repoList];
      }
      setKnownRepos(repoList);
    }).catch(() => {})
  }, [])

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return
    try {
      await images.upload('bugs', bug.id, files)
      fetchImages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images')
    }
  }

  const handleImageDelete = async (imageId: string) => {
    try {
      await images.delete('bugs', bug.id, imageId)
      setAttachedImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image')
    }
  }

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
        `Fix bug: ${bug.title}

${bug.description}

Severity: ${bug.severity}`,
        { repo: selectedRepo, images: imageFiles.length > 0 ? imageFiles : undefined, claudeSessionToken: sessionToken || undefined, tokenLabel: tokenLabel || undefined, pipelineMode }
      )
      // Update bug status to in_development
      const updated = await bugs.update(bug.id, { status: "in_development" })
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit to orchestrator")
    } finally {
      setSubmittingToOrch(false)
    }
  }

  // Verifies: FR-DUP-09
  const handleMarkDuplicate = async () => {
    const trimmed = duplicateOfId.trim().toUpperCase()
    if (!trimmed || !trimmed.startsWith('BUG-')) {
      setError('Please enter a valid bug ID (e.g. BUG-0003)')
      return
    }
    if (trimmed === bug.id) {
      setError('A bug cannot be a duplicate of itself')
      return
    }
    setMarkingStatus(true)
    setError(null)
    try {
      const updated = await bugs.update(bug.id, { status: 'duplicate', duplicate_of: trimmed })
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
      const updated = await bugs.update(bug.id, {
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

  const isHidden = HIDDEN_STATUSES.includes(bug.status)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
      {/* Verifies: FR-DUP-10 — Duplicate banner */}
      {bug.status === 'duplicate' && bug.duplicate_of && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
          This bug is a duplicate of{' '}
          <Link to="/bugs" className="font-semibold underline hover:text-purple-900">
            {bug.duplicate_of}
          </Link>
        </div>
      )}

      {/* Verifies: FR-DUP-10 — Deprecated banner */}
      {bug.status === 'deprecated' && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700">
          This bug is deprecated.{bug.deprecation_reason ? ` Reason: ${bug.deprecation_reason}` : ''}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className="text-xs font-mono text-gray-400">{bug.id}</span>
          <h3 className="text-lg font-semibold text-gray-900 mt-0.5">{bug.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              SEVERITY_COLORS[bug.severity] ?? 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {bug.severity} severity
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
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{bug.description}</p>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Dependencies
        </h4>
        <DependencySection
          blockedBy={bug.blocked_by ?? []}
          blocks={bug.blocks ?? []}
          itemType="bug"
          itemId={bug.id}
          editable={true}
          status={bug.status}
          onDependenciesChanged={() => {
            bugs.getById(bug.id).then(onUpdate)
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
          <div className="mt-0.5">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                STATUS_COLORS[bug.status] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {bug.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        {bug.source_system && (
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Source System
            </span>
            <p className="text-gray-700 mt-0.5">{bug.source_system}</p>
          </div>
        )}
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Reported
          </span>
          <p className="text-gray-700 mt-0.5">{new Date(bug.created_at).toLocaleString()}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Last Updated
          </span>
          <p className="text-gray-700 mt-0.5">{new Date(bug.updated_at).toLocaleString()}</p>
        </div>
      </div>

      {/* FR-085: Image Attachments */}
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
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>

      {/* Submit to orchestrator */}
      {(bug.status === "reported" || bug.status === "triaged") && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Target repo:</label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {knownRepos.map((r) => (
                <option key={r.url} value={r.url}>{r.name}</option>
              ))}
            </select>
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
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50 self-start">
              <button
                type="button"
                onClick={() => setPipelineMode('local')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pipelineMode === 'local' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🐳 Local
              </button>
              <button
                type="button"
                onClick={() => setPipelineMode('github_actions')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pipelineMode === 'github_actions' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ⚡ GitHub Actions
              </button>
            </div>
          <button
            onClick={handleSubmitToOrchestrator}
            disabled={submittingToOrch}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submittingToOrch ? "Submitting..." : "Submit to Orchestrator"}
          </button>
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
              <label className="text-sm font-medium text-purple-800">Canonical Bug ID</label>
              <input
                type="text"
                value={duplicateOfId}
                onChange={(e) => setDuplicateOfId(e.target.value)}
                placeholder="BUG-0003"
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
                placeholder="e.g. Superseded by new auth system"
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

      {/* FR-068: Related work item and cycle links */}
      {(bug.related_work_item_id || bug.related_cycle_id) && (
        <div className="border-t border-gray-100 pt-4 space-y-2" data-testid="bug-traceability">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Traceability
          </h4>
          <div className="flex flex-wrap gap-3 text-sm">
            {bug.related_work_item_id && (
              <Link
                to={bug.related_work_item_type === 'feature_request' ? '/feature-requests' : '/bugs'}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                data-testid="related-work-item-link"
              >
                <span className="text-xs font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                  {bug.related_work_item_id}
                </span>
                <span className="text-xs text-gray-400">
                  ({bug.related_work_item_type === 'feature_request' ? 'Feature Request' : 'Bug'})
                </span>
              </Link>
            )}
            {bug.related_cycle_id && (
              <Link
                to="/cycle"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                data-testid="related-cycle-link"
              >
                <span className="text-xs font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                  {bug.related_cycle_id}
                </span>
                <span className="text-xs text-gray-400">(Cycle)</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
