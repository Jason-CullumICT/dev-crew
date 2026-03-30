// Verifies: FR-DUP-10, FR-DUP-11, FR-DUP-12
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FeatureRequestList } from '../src/components/feature-requests/FeatureRequestList'
import { FeatureRequestDetail } from '../src/components/feature-requests/FeatureRequestDetail'
import { FeatureRequestsPage } from '../src/pages/FeatureRequestsPage'
import { BugReportsPage } from '../src/pages/BugReportsPage'
import type { FeatureRequest } from '../../Shared/types'

// Mock API client
vi.mock('../src/api/client', () => ({
  featureRequests: {
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    vote: vi.fn(),
    approve: vi.fn(),
    deny: vi.fn(),
  },
  bugs: {
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
  },
  images: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    upload: vi.fn(),
    delete: vi.fn(),
  },
  orchestrator: {
    submitWork: vi.fn(),
  },
  repos: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

import { featureRequests, bugs } from '../src/api/client'

const baseFR: FeatureRequest = {
  id: 'FR-0001',
  title: 'Test Feature',
  description: 'Test description',
  source: 'manual',
  status: 'potential',
  priority: 'medium',
  votes: [],
  human_approval_comment: null,
  human_approval_approved_at: null,
  duplicate_warning: false,
  target_repo: null,
  duplicate_of: null,
  deprecation_reason: null,
  duplicated_by: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('FeatureRequestList duplicate/deprecated support', () => {
  // Verifies: FR-DUP-11
  it('renders duplicate status with correct color class', () => {
    const duplicateFR = { ...baseFR, id: 'FR-0010', status: 'duplicate' as const, duplicate_of: 'FR-0001' }
    render(
      <MemoryRouter>
        <FeatureRequestList items={[duplicateFR]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('duplicate')).toBeInTheDocument()
  })

  // Verifies: FR-DUP-11
  it('renders deprecated status with correct color class', () => {
    const deprecatedFR = { ...baseFR, id: 'FR-0011', status: 'deprecated' as const, deprecation_reason: 'No longer needed' }
    render(
      <MemoryRouter>
        <FeatureRequestList items={[deprecatedFR]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('deprecated')).toBeInTheDocument()
  })

  // Verifies: FR-DUP-11
  it('applies opacity to hidden items', () => {
    const duplicateFR = { ...baseFR, id: 'FR-0010', status: 'duplicate' as const, duplicate_of: 'FR-0001' }
    const { container } = render(
      <MemoryRouter>
        <FeatureRequestList items={[duplicateFR]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('opacity-60')
  })

  // Verifies: FR-DUP-12
  it('shows duplicate count badge on canonical items', () => {
    const canonicalFR = { ...baseFR, id: 'FR-0001', duplicated_by: ['FR-0010', 'FR-0011'] }
    render(
      <MemoryRouter>
        <FeatureRequestList items={[canonicalFR]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('2 duplicates')).toBeInTheDocument()
  })

  // Verifies: FR-DUP-12
  it('shows singular duplicate text for single duplicate', () => {
    const canonicalFR = { ...baseFR, id: 'FR-0001', duplicated_by: ['FR-0010'] }
    render(
      <MemoryRouter>
        <FeatureRequestList items={[canonicalFR]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('1 duplicate')).toBeInTheDocument()
  })
})

describe('FeatureRequestDetail duplicate/deprecated banners', () => {
  // Verifies: FR-DUP-10
  it('shows duplicate banner with link to canonical item', () => {
    const duplicateFR = { ...baseFR, id: 'FR-0010', status: 'duplicate' as const, duplicate_of: 'FR-0001' }
    render(
      <MemoryRouter>
        <FeatureRequestDetail fr={duplicateFR} onUpdate={vi.fn()} onClose={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText(/This feature request is a duplicate of/)).toBeInTheDocument()
    expect(screen.getByText('FR-0001')).toBeInTheDocument()
  })

  // Verifies: FR-DUP-10
  it('shows deprecated banner with reason', () => {
    const deprecatedFR = { ...baseFR, id: 'FR-0011', status: 'deprecated' as const, deprecation_reason: 'Superseded by v2' }
    render(
      <MemoryRouter>
        <FeatureRequestDetail fr={deprecatedFR} onUpdate={vi.fn()} onClose={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText(/This feature request is deprecated/)).toBeInTheDocument()
    expect(screen.getByText(/Superseded by v2/)).toBeInTheDocument()
  })

  // Verifies: FR-DUP-10
  it('shows deprecated banner without reason when none provided', () => {
    const deprecatedFR = { ...baseFR, id: 'FR-0012', status: 'deprecated' as const }
    render(
      <MemoryRouter>
        <FeatureRequestDetail fr={deprecatedFR} onUpdate={vi.fn()} onClose={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('This feature request is deprecated.')).toBeInTheDocument()
  })
})

describe('FeatureRequestsPage show hidden toggle', () => {
  beforeEach(() => {
    vi.mocked(featureRequests.list).mockResolvedValue({ data: [baseFR] })
  })

  // Verifies: FR-DUP-11
  it('renders show hidden checkbox', async () => {
    render(
      <MemoryRouter>
        <FeatureRequestsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('Show hidden (duplicate/deprecated)')).toBeInTheDocument()
    })
  })

  // Verifies: FR-DUP-11
  it('passes include_hidden when toggle is checked', async () => {
    render(
      <MemoryRouter>
        <FeatureRequestsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(featureRequests.list).toHaveBeenCalled()
    })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(featureRequests.list).toHaveBeenCalledWith(
        expect.objectContaining({ include_hidden: true })
      )
    })
  })
})

describe('BugReportsPage show hidden toggle', () => {
  beforeEach(() => {
    vi.mocked(bugs.list).mockResolvedValue({ data: [] })
  })

  // Verifies: FR-DUP-11
  it('renders show hidden checkbox', async () => {
    render(
      <MemoryRouter>
        <BugReportsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('Show hidden (duplicate/deprecated)')).toBeInTheDocument()
    })
  })

  // Verifies: FR-DUP-11
  it('passes include_hidden when toggle is checked', async () => {
    render(
      <MemoryRouter>
        <BugReportsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(bugs.list).toHaveBeenCalled()
    })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(bugs.list).toHaveBeenCalledWith(
        expect.objectContaining({ include_hidden: true })
      )
    })
  })
})
