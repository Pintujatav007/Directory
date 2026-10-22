export type Project = { id: string; title: string; description: string; technologies: string[]; image?: string; repoUrl?: string; demoUrl?: string }
export type Developer = {
  id: string; name: string; role: string; location: string; timezone: string; experience: number; availability: 'Available' | 'Open to offers' | 'Booked';
  bio: string; skills: string[]; avatar: string; avatarUrl?: string; website?: string; github?: string; linkedin?: string; featured?: boolean; projects: Project[]; views?: number
}
