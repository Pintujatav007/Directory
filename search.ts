import type { Developer } from './types'

export type SearchFilters = { query: string; skill: string; location: string; experience: string; availability: string; sort: string }
export function filterDevelopers(developers: Developer[], filters: SearchFilters) {
  const query = filters.query.trim().toLowerCase()
  return developers.filter((person) => {
    const haystack = [person.name, person.role, person.location, person.bio, ...person.skills].join(' ').toLowerCase()
    return (!query || haystack.includes(query)) && (!filters.skill || person.skills.some((skill) => skill.toLowerCase() === filters.skill.toLowerCase())) && (!filters.location || person.location.toLowerCase().includes(filters.location.toLowerCase())) && (!filters.experience || (filters.experience === '0-3' ? person.experience <= 3 : filters.experience === '4-7' ? person.experience >= 4 && person.experience <= 7 : person.experience >= 8)) && (!filters.availability || person.availability === filters.availability)
  }).sort((a, b) => filters.sort === 'experience' ? b.experience - a.experience : filters.sort === 'name' ? a.name.localeCompare(b.name) : Number(b.featured) - Number(a.featured) || b.views! - a.views!)
}
