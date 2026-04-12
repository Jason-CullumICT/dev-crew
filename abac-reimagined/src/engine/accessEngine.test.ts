import { describe, it, expect } from 'vitest'
import { evaluateAccess, collectGrants } from './accessEngine'
import { buildNowContext } from './scheduleEngine'
import type { User, Group, Grant, Policy, Door, StoreSnapshot } from '../types'

const user: User = {
  id: 'u1', name: 'Sarah Chen', email: 's@co.com', department: 'Operations',
  role: 'analyst', type: 'employee', status: 'active',
  customAttributes: { clearanceLevel: '3' },
}

const group: Group = {
  id: 'g1', name: 'NOC Team', description: '', membershipType: 'dynamic',
  members: [],
  membershipRules: [{ id: 'r1', leftSide: 'user.department', operator: '==', rightSide: 'Operations' }],
  subGroups: [],
  inheritedPermissions: ['grant-unlock'],
  membershipLogic: 'AND',
}

const grant: Grant = {
  id: 'grant-unlock', name: 'Unlock Grant', description: '', scope: 'global',
  actions: ['unlock'], applicationMode: 'assigned',
  conditions: [], conditionLogic: 'AND', customAttributes: {},
}

const door: Door = {
  id: 'door-1', name: 'Server Room A', siteId: 'site-1',
  description: '', customAttributes: {},
}

const policy: Policy = {
  id: 'pol-1', name: 'Clearance Policy', description: '',
  rules: [{ id: 'pr1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
  logicalOperator: 'AND', doorIds: ['door-1'],
}

const store: StoreSnapshot = {
  allUsers: [user],
  allGroups: [group],
  allGrants: [grant],
  allSchedules: [],
  allPolicies: [policy],
  allDoors: [door],
  allZones: [],
  allSites: [],
  allControllers: [],
}

const now = buildNowContext()

describe('collectGrants', () => {
  it('returns grants from matched groups', () => {
    const grants = collectGrants(user, [group], [grant], [], now)
    expect(grants.map(g => g.id)).toContain('grant-unlock')
  })

  it('does not return grants from unmatched groups', () => {
    const otherGroup: Group = {
      ...group, id: 'g2', membershipRules: [{ id: 'r2', leftSide: 'user.department', operator: '==', rightSide: 'Finance' }],
      inheritedPermissions: ['grant-other'],
    }
    const grants = collectGrants(user, [otherGroup], [grant], [], now)
    expect(grants.map(g => g.id)).not.toContain('grant-other')
  })

  it('includes auto grants when conditions pass', () => {
    const autoGrant: Grant = {
      ...grant, id: 'grant-auto', applicationMode: 'auto',
      conditions: [{ id: 'c1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    }
    const grants = collectGrants(user, [], [autoGrant], [], now)
    expect(grants.map(g => g.id)).toContain('grant-auto')
  })
})

describe('evaluateAccess', () => {
  it('grants access when permission layer passes and no ABAC policies block', () => {
    const result = evaluateAccess(user, door, store, now)
    expect(result.permissionGranted).toBe(true)
    expect(result.abacPassed).toBe(true)
    expect(result.overallGranted).toBe(true)
  })

  it('denies when user clearance is too low for the policy', () => {
    const lowUser: User = { ...user, customAttributes: { clearanceLevel: '2' } }
    const result = evaluateAccess(lowUser, door, store, now)
    expect(result.abacPassed).toBe(false)
    expect(result.overallGranted).toBe(false)
  })

  it('denies when user has no grant covering the door', () => {
    const noGrantStore: StoreSnapshot = { ...store, allGroups: [] }
    const result = evaluateAccess(user, door, noGrantStore, now)
    expect(result.permissionGranted).toBe(false)
    expect(result.overallGranted).toBe(false)
  })

  it('returns policyResults with per-rule trace', () => {
    const result = evaluateAccess(user, door, store, now)
    expect(result.policyResults).toHaveLength(1)
    expect(result.policyResults[0].ruleResults).toHaveLength(1)
    expect(result.policyResults[0].ruleResults[0].leftSide).toBe('user.clearanceLevel')
    expect(result.policyResults[0].ruleResults[0].passed).toBe(true)
  })
})
