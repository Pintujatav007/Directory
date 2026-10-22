import { describe, expect, it } from 'vitest'
import { developers } from './data'
import { filterDevelopers } from './search'

describe('filterDevelopers', () => {
  it('matches a search across role and skills', () => {
    const result = filterDevelopers(developers, { query: 'typescript', skill: '', location: '', experience: '', availability: '', sort: 'relevance' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((person) => person.skills.includes('TypeScript'))).toBe(true)
  })
  it('combines filters and returns an empty result when none match', () => {
    const result = filterDevelopers(developers, { query: '', skill: 'Go', location: '', experience: '', availability: 'Available', sort: 'relevance' })
    expect(result).toHaveLength(0)
  })
})
