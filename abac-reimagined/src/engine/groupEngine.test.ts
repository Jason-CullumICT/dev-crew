import { describe, it, expect } from 'vitest'
import { resolveGroupMembership } from './groupEngine'
import type { User, Group } from '../types'

const baseUser: User = {
  id: 'u1', name: 'Test', email: 't@t.com', department: 'Operations',
  role: 'analyst', clearanceLevel: 3, type: 'employee', status: 'active',
  customAttributes: {},
}

const groups: Group[] = [
  {
    id: 'g-night', name: 'Night Shift', description: '', membershipType: 'static',
    members: ['u1'], membershipRules: [], subGroups: [], inheritedPermissions: ['grant-1'], membershipLogic: 'AND',
  },
  {
    id: 'g-noc', name: 'NOC Team', description: '', membershipType: 'dynamic',
    members: [], membershipRules: [{ id: 'r1', leftSide: 'user.department', operator: '==', rightSide: 'Operations' }],
    subGroups: ['g-night'], inheritedPermissions: ['grant-2'], membershipLogic: 'AND',
  },
  {
    id: 'g-other', name: 'Other', description: '', membershipType: 'static',
    members: ['u99'], membershipRules: [], subGroups: [], inheritedPermissions: [], membershipLogic: 'AND',
  },
]

describe('resolveGroupMembership', () => {
  it('includes directly matched static group', () => {
    const result = resolveGroupMembership(baseUser, groups)
    expect(result).toContain('g-night')
  })

  it('includes dynamic group when rule matches', () => {
    const result = resolveGroupMembership(baseUser, groups)
    expect(result).toContain('g-noc')
  })

  it('propagates membership upward through subGroups', () => {
    // staticOnlyUser is NOT in g-noc via dynamic rule (dept != Operations)
    // but IS in g-night via static members list
    // g-noc has g-night as subGroup, so staticOnlyUser IS in g-noc
    const staticOnlyUser: User = { ...baseUser, department: 'Finance' }
    const result = resolveGroupMembership(staticOnlyUser, groups)
    expect(result).toContain('g-night')
    expect(result).toContain('g-noc')
  })

  it('excludes groups the user does not match', () => {
    const result = resolveGroupMembership(baseUser, groups)
    expect(result).not.toContain('g-other')
  })

  it('does not infinite loop on circular subGroup references', () => {
    const circular: Group[] = [
      { id: 'ga', name: 'A', description: '', membershipType: 'static', members: ['u1'],
        membershipRules: [], subGroups: ['gb'], inheritedPermissions: [], membershipLogic: 'AND' },
      { id: 'gb', name: 'B', description: '', membershipType: 'static', members: [],
        membershipRules: [], subGroups: ['ga'], inheritedPermissions: [], membershipLogic: 'AND' },
    ]
    const result = resolveGroupMembership(baseUser, circular)
    expect(result).toContain('ga')
  })

  it('handles clearanceLevel >= rule', () => {
    const clearanceGroups: Group[] = [{
      id: 'g-l3', name: 'L3+', description: '', membershipType: 'dynamic',
      members: [], membershipRules: [{ id: 'r1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
      subGroups: [], inheritedPermissions: [], membershipLogic: 'AND',
    }]
    expect(resolveGroupMembership({ ...baseUser, clearanceLevel: 3 }, clearanceGroups)).toContain('g-l3')
    expect(resolveGroupMembership({ ...baseUser, clearanceLevel: 2 }, clearanceGroups)).not.toContain('g-l3')
  })
})
