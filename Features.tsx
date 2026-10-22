import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, Check, CircleAlert, Clipboard, Download, ExternalLink, Github, LoaderCircle, Plus, Search, Sparkles, Upload, X } from 'lucide-react'
import { z } from 'zod'
import type { Developer, Project } from './types'
import { supabase } from './supabase-client'

type Account = { id: string; email: string; name: string }
type Notice = (message: string) => void
type Job = { id: string; owner_id: string; title: string; company: string; location: string; employment_type: string; description: string; skills: string[]; status: 'open' | 'closed'; created_at: string }
type GitHubUser = { login: string; name: string | null; avatar_url: string; html_url: string; bio: string | null; location: string | null; public_repos: number; followers: number }
type GitHubRepo = { id: number; name: string; description: string | null; html_url: string; language: string | null; stargazers_count: number; fork: boolean; updated_at: string }
const jobSchema = z.object({ title: z.string().trim().min(3).max(100), company: z.string().trim().min(2).max(100), location: z.string().trim().min(2).max(100), employment_type: z.enum(['Full-time', 'Contract', 'Part-time', 'Freelance']), description: z.string().trim().min(20).max(3000), skills: z.string().trim().min(2) })

export function JobsPage({ account, notify }: { account: Account | null; notify: Notice }) {
  const [jobs, setJobs] = useState<Job[]>([]); const [query, setQuery] = useState(''); const [loading, setLoading] = useState(true); const [showForm, setShowForm] = useState(false); const [error, setError] = useState('')
  const refresh = async () => { setLoading(true); if (supabase) { const { data, error: dbError } = await supabase.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }); if (dbError) setError(dbError.message); else setJobs((data ?? []) as Job[]) } else { try { setJobs(JSON.parse(localStorage.getItem('dd-jobs') ?? '[]') as Job[]) } catch { setJobs([]) } } setLoading(false) }
  useEffect(() => { void refresh() }, [])
  const filtered = useMemo(() => jobs.filter((job) => `${job.title} ${job.company} ${job.location} ${job.description} ${job.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [jobs, query])
  const postJob = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const result = jobSchema.safeParse(values); if (!result.success) { setError(result.error.issues[0]?.message ?? 'Review the job details.'); return } if (!account) { setError('Sign in before posting a job.'); return } const payload = { ...result.data, skills: result.data.skills.split(',').map((skill) => skill.trim()).filter(Boolean), owner_id: account.id, status: 'open' as const }; if (supabase) { const { error: insertError } = await supabase.from('jobs').insert(payload); if (insertError) { setError(insertError.message); return } } else { const next: Job = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }; const all = JSON.parse(localStorage.getItem('dd-jobs') ?? '[]') as Job[]; localStorage.setItem('dd-jobs', JSON.stringify([next, ...all])) } form.reset(); setShowForm(false); setError(''); notify('Your job is live.'); await refresh() }
  return <section className="feature-page container"><div className="feature-hero"><div><div className="eyebrow"><span className="eyebrow-line"/> THE JOB BOARD</div><h1>Good work is<br/><span>out there.</span></h1><p>Find thoughtful teams and projects that fit the way you like to work.</p></div><div className="job-hero-mark"><BriefcaseBusiness size={31}/><span>OPEN ROLES<br/><strong>{jobs.length.toString().padStart(2, '0')}</strong></span></div></div>
    <div className="jobs-toolbar"><label className="search-bar"><Search size={17}/><input aria-label="Search jobs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search role, company, skill, or location"/></label><button className="button button-light" onClick={() => { setShowForm(!showForm); setError('') }}><Plus size={16}/> Post a job</button></div>
    {showForm && <form className="feature-panel job-form" onSubmit={postJob}><div className="panel-heading"><div><h2>Share an opportunity</h2><p>Clear details help the right person find you.</p></div><button type="button" className="icon-button" aria-label="Close form" onClick={() => setShowForm(false)}><X size={17}/></button></div><div className="feature-form-grid"><label>Role title<input name="title" required maxLength={100} placeholder="Senior Product Engineer"/></label><label>Company<input name="company" required maxLength={100} placeholder="Company name"/></label><label>Location<input name="location" required maxLength={100} placeholder="Remote / city"/></label><label>Employment type<select name="employment_type"><option>Full-time</option><option>Contract</option><option>Part-time</option><option>Freelance</option></select></label></div><label>What will they work on?<textarea name="description" rows={5} required maxLength={3000} placeholder="Describe the product, team, responsibilities, and what makes this a good place to work."/></label><label>Skills <small>comma-separated</small><input name="skills" required placeholder="React, TypeScript, PostgreSQL"/></label>{error && <p className="form-error">{error}</p>}<button className="button button-light">Publish job <ArrowRight size={15}/></button></form>}
    <div className="job-results-head"><div><h2>Opportunities worth a look</h2><p>{loading ? 'Finding open roles…' : `${filtered.length} open ${filtered.length === 1 ? 'role' : 'roles'}`}</p></div><span className="live-indicator"><i/>LIVE LISTINGS</span></div>{error && !showForm && <div className="feature-alert"><CircleAlert size={16}/>{error}</div>}{loading ? <div className="feature-loading"><LoaderCircle className="spin"/> Loading opportunities</div> : filtered.length ? <div className="jobs-list">{filtered.map((job) => <article className="job-card" key={job.id}><div className="job-card-top"><span className="job-type">{job.employment_type}</span><small>{new Date(job.created_at).toLocaleDateString()}</small></div><h3>{job.title}</h3><div className="job-company">{job.company} <span>·</span> {job.location}</div><p>{job.description}</p><div className="skill-tags">{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="job-card-foot"><span>Posted by a DevDirectory member</span>{account && job.owner_id === account.id ? <button className="text-link" onClick={() => { void (async () => { if (supabase) { const { error: deleteError } = await supabase.from('jobs').delete().eq('id', job.id); if (deleteError) { notify(deleteError.message); return } } else { localStorage.setItem('dd-jobs', JSON.stringify(jobs.filter((item) => item.id !== job.id))) } notify('Job removed.'); await refresh() })() }}>Remove post <X size={14}/></button> : <Link className="text-link" to={`/developers/${job.owner_id}`}>Contact poster <ArrowRight size={14}/></Link>}</div></article>)}</div> : <div className="feature-empty"><BriefcaseBusiness size={24}/><h3>No open roles yet</h3><p>Try another search, or be the first to share an opportunity.</p><button className="button button-outline" onClick={() => setShowForm(true)}>Post a job <Plus size={15}/></button></div>}</section>
}

type SavedPost = { id: string; text: string; date: string }
type SavedLinks = { github: string; linkedin: string }
export function PostsLinksPage() {
  const [text, setText] = useState('')
  const [posts, setPosts] = useState<SavedPost[]>([])
  const [links, setLinks] = useState<SavedLinks>({ github: '', linkedin: '' })
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    try { setPosts(JSON.parse(localStorage.getItem('dd-posts') ?? '[]') as SavedPost[]); setLinks(JSON.parse(localStorage.getItem('dd-social-links') ?? '{"github":"","linkedin":""}') as SavedLinks) } catch { /* Keep the page usable if local storage is unavailable. */ }
  }, [])
  const savePost = (event: FormEvent) => { event.preventDefault(); const value=text.trim(); if (!value) return; const next=[{id:crypto.randomUUID(),text:value,date:new Date().toLocaleDateString()},...posts]; setPosts(next); localStorage.setItem('dd-posts',JSON.stringify(next)); setText('') }
  const saveLinks = (event: FormEvent) => { event.preventDefault(); localStorage.setItem('dd-social-links',JSON.stringify(links)); setSaved(true); window.setTimeout(()=>setSaved(false),2200) }
  const copy = async (value:string) => { try { await navigator.clipboard.writeText(value) } catch { /* The post remains visible for manual copying. */ } }
  const remove = (id:string) => { const next=posts.filter(post=>post.id!==id); setPosts(next); localStorage.setItem('dd-posts',JSON.stringify(next)) }
  return <section className="feature-page container"><div className="feature-hero"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR VOICE, YOUR WORK</div><h1>Posts & <span>professional links.</span></h1><p>Save a project update, copy it when you are ready to share, and keep your public profiles close at hand.</p></div></div><div className="posts-layout"><div className="feature-panel"><div className="panel-heading"><div><h2>Write a post</h2><p>Draft saved in this browser.</p></div><Clipboard size={18}/></div><form className="post-draft-form" onSubmit={savePost}><label>Post text<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={1200} required placeholder="Share a project milestone, lesson, or idea…" rows={7}/></label><div className="post-form-foot"><small>{text.length} / 1200</small><button className="button button-light">Save post</button></div></form><div className="social-links-form"><h2>GitHub & LinkedIn</h2><form onSubmit={saveLinks}><label>GitHub profile URL<input type="url" placeholder="https://github.com/username" value={links.github} onChange={e=>setLinks({...links,github:e.target.value})}/></label><label>LinkedIn profile URL<input type="url" placeholder="https://linkedin.com/in/username" value={links.linkedin} onChange={e=>setLinks({...links,linkedin:e.target.value})}/></label><button className="button button-outline">{saved ? 'Links saved' : 'Save profile links'}</button></form><div className="profile-link-actions">{links.github && <a href={links.github} target="_blank" rel="noreferrer">Open GitHub ↗</a>}{links.linkedin && <a href={links.linkedin} target="_blank" rel="noreferrer">Open LinkedIn ↗</a>}</div></div></div><div className="feature-panel"><div className="panel-heading"><div><h2>Saved posts</h2><p>{posts.length} draft{posts.length===1?'':'s'} in this browser</p></div></div>{posts.length ? posts.map(post=><article className="saved-post" key={post.id}><div className="saved-post-meta"><small>{post.date}</small><button type="button" aria-label="Delete post" onClick={()=>remove(post.id)}><X size={15}/></button></div><p>{post.text}</p><div className="saved-post-actions"><button type="button" className="button button-outline" onClick={()=>void copy(post.text)}><Clipboard size={13}/> Copy text</button><button type="button" className="text-link" onClick={()=>remove(post.id)}>Delete</button></div></article>) : <div className="feature-empty"><Clipboard size={23}/><h3>No posts yet</h3><p>Draft an update about something you have built or learned.</p></div>}</div></div></section>
}

export function CareerTools({ account, notify }: { account: Account | null; notify: Notice }) {
  const [username, setUsername] = useState(''); const [user, setUser] = useState<GitHubUser | null>(null); const [repos, setRepos] = useState<GitHubRepo[]>([]); const [selected, setSelected] = useState<number[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [resumeName, setResumeName] = useState(''); const [resumeBusy, setResumeBusy] = useState(false)
  useEffect(() => { if (!account) return; if (supabase) { void supabase.from('profiles').select('github_url').eq('id', account.id).maybeSingle().then(({ data }) => { const match = data?.github_url?.match(/github\.com\/([^/?#]+)/i); if (match?.[1]) setUsername(match[1]) }); void supabase.storage.from('resumes').list(account.id).then(({ data }) => { const resume = data?.find((file) => file.name === 'resume.pdf'); if (resume) setResumeName(resume.name) }) } else { const saved = localStorage.getItem(`dd-github-${account.id}`); if (saved) setUsername(saved) } }, [account])
  const fetchGithub = async (event?: FormEvent) => { event?.preventDefault(); setBusy(true); setError(''); setUser(null); setRepos([]); try { const login = username.trim(); if (!/^[a-zA-Z0-9-]{1,39}$/.test(login)) throw new Error('Enter a valid GitHub username.'); const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' }; const [userResponse, reposResponse] = await Promise.all([fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers }), fetch(`https://api.github.com/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=100&type=owner`, { headers })]); if (!userResponse.ok || !reposResponse.ok) throw new Error(userResponse.status === 404 ? 'That GitHub account was not found.' : 'GitHub could not load this public profile. Try again shortly.'); const ghUser = await userResponse.json() as GitHubUser; const repoList = (await reposResponse.json() as GitHubRepo[]).filter((repo) => !repo.fork).slice(0, 24); setUser(ghUser); setRepos(repoList); setSelected(repoList.slice(0, 4).map((repo) => repo.id)); if (supabase && account) { const { data: current, error: readError } = await supabase.from('profiles').select('full_name,location,bio').eq('id', account.id).maybeSingle(); if (readError) throw new Error(readError.message); const { error: saveError } = await supabase.from('profiles').update({ github_url: ghUser.html_url, avatar_url: ghUser.avatar_url, full_name: !current?.full_name || current.full_name === 'New member' ? ghUser.name || account.name : current.full_name, location: current?.location || ghUser.location || '', bio: current?.bio || ghUser.bio || '' }).eq('id', account.id); if (saveError) throw new Error(saveError.message) } else if (account) { localStorage.setItem(`dd-github-${account.id}`, ghUser.login); const key = `dd-profile-${account.id}`; const current = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<Developer>; const profile: Developer = { id: account.id, name: current.name && current.name !== account.email ? current.name : ghUser.name || ghUser.login, role: current.role || 'Independent developer', location: current.location || ghUser.location || 'Remote', timezone: current.timezone || '—', experience: current.experience || 0, availability: current.availability || 'Available', bio: current.bio || ghUser.bio || '', skills: current.skills || [], avatar: current.avatar || 'photo-1534528741775-53994a69daeb', avatarUrl: ghUser.avatar_url, github: ghUser.html_url, projects: current.projects || [] }; localStorage.setItem(key, JSON.stringify(profile)); const people = JSON.parse(localStorage.getItem('dd-profiles') ?? '[]') as Developer[]; localStorage.setItem('dd-profiles', JSON.stringify([...people.filter((person) => person.id !== account.id), profile])) }; notify(`Loaded ${ghUser.login}'s public GitHub work.`) } catch (e) { setError(e instanceof Error ? e.message : 'GitHub import failed.') } finally { setBusy(false) } }
  const importRepos = async () => { if (!account || !selected.length) return; setBusy(true); const chosen = repos.filter((repo) => selected.includes(repo.id)); if (supabase) { const rows = chosen.map((repo) => ({ owner_id: account.id, title: repo.name.slice(0, 80), description: (repo.description || `GitHub repository · ${repo.stargazers_count} stars`).slice(0, 500), technologies: repo.language ? [repo.language] : ['GitHub'], repository_url: repo.html_url })); const { error: insertError } = await supabase.from('projects').insert(rows); if (insertError) { setError(insertError.message); setBusy(false); return } } else { const key = `dd-profile-${account.id}`; const profile = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<Developer>; const existing = profile.projects ?? []; const added: Project[] = chosen.map((repo) => ({ id: String(repo.id), title: repo.name.slice(0, 80), description: (repo.description || `GitHub repository · ${repo.stargazers_count} stars`).slice(0, 500), technologies: repo.language ? [repo.language] : ['GitHub'], repoUrl: repo.html_url })); const updatedProfile = { ...profile, projects: [...existing, ...added] }; localStorage.setItem(key, JSON.stringify(updatedProfile)); const community = JSON.parse(localStorage.getItem('dd-profiles') ?? '[]') as Developer[]; localStorage.setItem('dd-profiles', JSON.stringify([...community.filter((person) => person.id !== account.id), updatedProfile as Developer])) } setBusy(false); notify(`Added ${chosen.length} repositories to your portfolio.`) }
  const uploadResume = async (event: FormEvent<HTMLInputElement>) => { const file = event.currentTarget.files?.[0]; if (!file || !account) return; if (file.type !== 'application/pdf' || file.size > 8 * 1024 * 1024) { setError('Choose a PDF smaller than 8 MB.'); return } if (!supabase) { setError('Resume storage needs a connected Supabase project. Your resume stays on your device.'); return } setResumeBusy(true); setError(''); const { error: uploadError } = await supabase.storage.from('resumes').upload(`${account.id}/resume.pdf`, file, { upsert: true, contentType: 'application/pdf' }); if (uploadError) setError(uploadError.message); else { setResumeName(file.name); notify('Resume uploaded privately.') } setResumeBusy(false) }
  const downloadResume = async () => { if (!supabase || !account) return; const { data, error: signedError } = await supabase.storage.from('resumes').createSignedUrl(`${account.id}/resume.pdf`, 60); if (signedError) setError(signedError.message); else window.open(data.signedUrl, '_blank', 'noopener,noreferrer') }
  return <section className="career-page container"><div className="eyebrow"><span className="eyebrow-line"/> YOUR CAREER TOOLS</div><h1>Bring your work<br/><span>with you.</span></h1><p className="career-lead">Import your public GitHub work and keep your resume ready for the next opportunity.</p>{!account && <div className="demo-notice"><CircleAlert size={16}/><span>Sign in to save profile details, projects, and resume storage.</span></div>}<div className="career-grid"><section className="feature-panel"><div className="panel-heading"><div><h2><Github size={18}/> Connect GitHub</h2><p>Import your public profile and repositories.</p></div><span className="live-indicator"><i/>PUBLIC API</span></div><form className="github-form" onSubmit={fetchGithub}><label>GitHub username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="octocat" maxLength={39}/></label><button className="button button-light" disabled={busy || !username}>{busy ? <LoaderCircle className="spin" size={15}/> : <Github size={15}/>} Load public work</button></form>{error && <p className="form-error">{error}</p>}{user && <div className="github-preview"><div className="github-user"><img src={user.avatar_url} alt=""/><div><strong>{user.name || user.login}</strong><small>@{user.login} · {user.location || 'Location not set'}</small></div><a href={user.html_url} target="_blank" rel="noreferrer" aria-label="Open GitHub profile"><ExternalLink size={15}/></a></div>{user.bio && <p className="github-bio">{user.bio}</p>}<div className="github-stats"><span><strong>{user.public_repos}</strong> public repos</span><span><strong>{user.followers}</strong> followers</span></div><div className="repo-list-head"><strong>Choose repositories to feature</strong><span>{selected.length} selected</span></div><div className="repo-list">{repos.map((repo) => <label className="repo-row" key={repo.id}><input type="checkbox" checked={selected.includes(repo.id)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, repo.id] : old.filter((id) => id !== repo.id))}/><span><strong>{repo.name}</strong><small>{repo.description || 'No description provided'}</small></span><span className="repo-language">{repo.language || '—'} · ★ {repo.stargazers_count}</span><a href={repo.html_url} target="_blank" rel="noreferrer" aria-label={`Open ${repo.name}`}><ExternalLink size={13}/></a></label>)}</div><button className="button button-light" disabled={!account || !selected.length || busy} onClick={importRepos}><Plus size={15}/> Add selected work to portfolio</button></div>}</section>
    <section className="feature-panel resume-panel"><div className="panel-heading"><div><h2><Upload size={18}/> Resume</h2><p>Private PDF storage, only accessible to you.</p></div></div><div className="resume-drop"><Upload size={24}/><strong>{resumeName || 'Add your resume'}</strong><small>PDF only · up to 8 MB · securely stored</small><label className="button button-outline">{resumeBusy ? 'Uploading…' : resumeName ? 'Replace PDF' : 'Choose PDF'}<input type="file" accept="application/pdf,.pdf" hidden onChange={uploadResume}/></label></div>{resumeName && <button className="text-link" onClick={downloadResume}><Download size={14}/> Download your resume</button>}<p className="private-note"><Check size={14}/> Your resume is stored in a private bucket. It is never shown on your public profile.</p></section></div></section>
}

type ChatLine = { role: 'user' | 'assistant'; content: string }
export function AssistantPage({ account }: { account: Account | null }) {
  const [messages, setMessages] = useState<ChatLine[]>([{ role: 'assistant', content: 'Hi, I’m your developer support agent. Tell me what you’re stuck on—code, debugging, architecture, interviews, or career planning.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const send = async (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || busy) return
    const next: ChatLine[] = [...messages, { role: 'user', content: message }]
    setMessages(next)
    setInput('')
    setError('')
    setBusy(true)
    const words = message.toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length > 2)
    let saved: MemoryNote[] = []
    try { saved = JSON.parse(localStorage.getItem('dd-memory-notes') ?? '[]') as MemoryNote[] } catch { saved = [] }
    const match = saved.map((note) => ({ note, score: words.reduce((sum, word) => sum + (`${note.title} ${note.text} ${note.tags}`.toLowerCase().includes(word) ? 1 : 0), 0) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)[0]?.note
    try {
      if (!supabase || !account) {
        const reply = match ? `I found a related note you saved on ${match.date}: ${match.text}${match.tags ? ` (Tags: ${match.tags})` : ''}` : localDeveloperHelp(message)
        setMessages((old) => [...old, { role: 'assistant', content: reply }])
        return
      }
      const { data, error: invokeError } = await supabase.functions.invoke('developer-assistant', {
        body: { messages: next.slice(-12).map(({ role, content }) => ({ role, content })) },
      })
      if (invokeError) throw new Error(invokeError.message)
      if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error(data?.error || 'The assistant returned no reply.')
      setMessages((old) => [...old, { role: 'assistant', content: data.reply }])
    } catch (cause) {
      setError(cause instanceof Error ? `AI assistant unavailable: ${cause.message}` : 'AI assistant unavailable. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return <section className="assistant-page container"><div className="eyebrow"><span className="eyebrow-line"/> DEVELOPER SUPPORT AGENT</div><div className="assistant-heading"><div><h1>Let’s solve<br/><span>the hard part.</span></h1><p>Ask for help with debugging, design decisions, code review, or your next career move.</p></div><span className="ai-badge"><Sparkles size={16}/> {supabase && account ? 'AI AGENT' : 'DEMO HELP'}</span></div><div className="assistant-card"><div className="assistant-messages" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? <Sparkles size={15}/> : (account?.name[0] ?? 'Y')}</span><p>{message.content}</p></div>)}{busy && <div className="chat-message assistant"><span><Sparkles size={15}/></span><p className="thinking"><i/><i/><i/></p></div>}</div>{error && <div className="feature-alert"><CircleAlert size={15}/>{error}</div>}<form className="assistant-input" onSubmit={send}><textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} maxLength={4000} placeholder="Describe the problem. Include the error message or relevant code…" aria-label="Message the developer assistant"/><button className="button button-light" disabled={busy || !input.trim()}>Send <ArrowRight size={15}/></button></form><div className="assistant-foot">{supabase && account ? 'Don’t share passwords, API keys, or private customer data.' : 'Demo help runs in this browser. Connect the AI backend for generated answers.'}</div></div><MemoryNotes/></section>
}

type MemoryNote = { id: string; title: string; text: string; tags: string; date: string }
function MemoryNotes() {
  const [notes,setNotes]=useState<MemoryNote[]>([]); const [query,setQuery]=useState('')
  useEffect(()=>{try{setNotes(JSON.parse(localStorage.getItem('dd-memory-notes')??'[]') as MemoryNote[])}catch{setNotes([])}},[])
  const save=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=event.currentTarget;const fd=new FormData(form);const text=String(fd.get('note')??'').trim();if(!text)return;const next=[{id:crypto.randomUUID(),title:text.split(/[.!?\n]/)[0].slice(0,70)||'Saved note',text,tags:String(fd.get('tags')??''),date:new Date().toLocaleDateString()},...notes];setNotes(next);localStorage.setItem('dd-memory-notes',JSON.stringify(next));form.reset()}
  const filtered=notes.filter(note=>`${note.title} ${note.text} ${note.tags}`.toLowerCase().includes(query.toLowerCase()))
  const remove=(id:string)=>{const next=notes.filter(note=>note.id!==id);setNotes(next);localStorage.setItem('dd-memory-notes',JSON.stringify(next))}
  return <div className="memory-layout"><section className="feature-panel memory-form-panel"><div className="panel-heading"><div><h2>Save a problem or idea</h2><p>Keep a note you can find again in this browser.</p></div><Sparkles size={18}/></div><form className="post-draft-form" onSubmit={save}><label>What should I remember?<textarea name="note" rows={5} required placeholder="Describe the issue, what you tried, and what worked…"/></label><label>Topic or tags<input name="tags" placeholder="login, React, college project"/></label><button className="button button-light">Save this note</button></form></section><section className="feature-panel"><div className="panel-heading"><div><h2>Saved notes</h2><p>{notes.length} note{notes.length===1?'':'s'} · local to this browser</p></div></div><input className="memory-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search saved notes…" aria-label="Search saved notes"/>{filtered.length?filtered.map(note=><article className="saved-post" key={note.id}><div className="saved-post-meta"><strong>{note.title}</strong><button type="button" aria-label="Delete note" onClick={()=>remove(note.id)}><X size={15}/></button></div><p>{note.text}</p><small>{note.tags} {note.tags&&' · '}{note.date}</small></article>):<div className="feature-empty"><Sparkles size={23}/><h3>{query?'No matching note':'Your saved notes will appear here'}</h3><p>{query?'Try another keyword.':'Save a problem or idea so you can search for it later.'}</p></div>}</section></div>
}

function localDeveloperHelp(message: string) {
  const text = message.toLowerCase()
  const disclosure = 'This is local demo guidance, not an AI-generated answer. Connect the Supabase Edge Function and OpenAI key for live AI.'
  if (/error|exception|failed|bug|crash|not working|doesn.t work/.test(text)) return ['Let’s narrow down the failure. Copy the exact error and note the action that triggers it. Check the browser console and server terminal for the first error. Then verify environment variables, network request status, and whether the failing input is null or empty. Share the exact error, the smallest relevant code snippet, and what you expected versus what happened.', disclosure].join(' ')
  if (/interview|resume|job|career/.test(text)) return ['Tailor your resume to one role: lead with the outcome you delivered, quantify the impact where possible, and name tools where they support that result. For interview practice, explain the problem, constraints, options you considered, and trade-offs. Share the role and your current draft or question for specific feedback.', disclosure].join(' ')
  if (/architecture|design|database|api|scale/.test(text)) return ['Write down the user flow, expected traffic, data ownership, and failure cases. Choose the simplest design that meets those needs, then make boundaries explicit: who can read or write each record, what happens on retries, and how you will observe failures. Share your stack and constraints to compare concrete options.', disclosure].join(' ')
  return ['Please include your language or framework, the smallest relevant code/configuration snippet, what you expected, and what happened instead. Remove secrets and private data before sharing.', disclosure].join(' ')
}
export function AdminPage({ account, notify }: { account: Account | null; notify: Notice }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string; title: string; location: string }>>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    if (!account) { setAuthorized(false); setLoading(false); return }
    if (!supabase) {
      try {
        const localProfiles = JSON.parse(localStorage.getItem('dd-profiles') ?? '[]') as Developer[]
        const localJobs = JSON.parse(localStorage.getItem('dd-jobs') ?? '[]') as Job[]
        setProfiles(localProfiles.map((p) => ({ id: p.id, full_name: p.name, title: p.role, location: p.location })))
        setJobs(localJobs)
        setAuthorized(true)
      } catch {
        setError('Could not read the demo data from this browser.')
        setAuthorized(true)
      }
      setLoading(false)
      return
    }
    void (async () => {
      try {
        const { data: role, error: roleError } = await supabase.from('admin_users').select('user_id').eq('user_id', account.id).maybeSingle()
        if (!active) return
        if (roleError) { setError(`Could not verify admin access: ${roleError.message}`); setAuthorized(false); return }
        setAuthorized(Boolean(role))
        if (!role) return
        const [peopleResult, jobsResult] = await Promise.all([
          supabase.from('profiles').select('id,full_name,title,location').order('created_at', { ascending: false }),
          supabase.from('jobs').select('*').order('created_at', { ascending: false }),
        ])
        if (!active) return
        if (peopleResult.error || jobsResult.error) setError(peopleResult.error?.message ?? jobsResult.error?.message ?? 'Could not load admin data.')
        setProfiles(peopleResult.data ?? [])
        setJobs((jobsResult.data ?? []) as Job[])
      } catch (cause) {
        if (active) { setAuthorized(false); setError(cause instanceof Error ? cause.message : 'Could not load admin data.') }
      } finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [account])

  const removeProfile = async (person: { id: string; full_name: string }) => {
    if (!window.confirm(`Remove the public profile for ${person.full_name}?`)) return
    if (supabase) {
      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', person.id)
      if (deleteError) { notify(deleteError.message); return }
    } else {
      try {
        const remaining = (JSON.parse(localStorage.getItem('dd-profiles') ?? '[]') as Developer[]).filter((item) => item.id !== person.id)
        localStorage.setItem('dd-profiles', JSON.stringify(remaining))
        localStorage.removeItem(`dd-profile-${person.id}`)
      } catch { notify('Could not update demo profiles in this browser.'); return }
    }
    setProfiles((old) => old.filter((item) => item.id !== person.id))
    notify('Public profile removed.')
  }

  const removeJob = async (job: Job) => {
    if (supabase) {
      const { error: deleteError } = await supabase.from('jobs').delete().eq('id', job.id)
      if (deleteError) { notify(deleteError.message); return }
    } else {
      try { localStorage.setItem('dd-jobs', JSON.stringify((JSON.parse(localStorage.getItem('dd-jobs') ?? '[]') as Job[]).filter((item) => item.id !== job.id))) }
      catch { notify('Could not update demo jobs in this browser.'); return }
    }
    setJobs((old) => old.filter((item) => item.id !== job.id))
    notify('Job posting removed.')
  }

  return <section className="admin-page container"><div className="eyebrow"><span className="eyebrow-line"/> ADMINISTRATION</div><h1>Community<br/><span>control room.</span></h1>{loading ? <div className="feature-loading"><LoaderCircle className="spin"/> Checking admin access…</div> : !authorized ? <div className="feature-alert"><CircleAlert size={17}/>{error || (!supabase ? 'Sign in to open the browser demo admin panel.' : 'This account is not an administrator. Promote it in the Supabase admin_users table.')}</div> : <><p className="career-lead">{supabase ? 'Moderate member profiles and job listings.' : 'Browser demo admin: changes affect demo data saved in this browser only.'}</p>{error && <div className="feature-alert"><CircleAlert size={15}/>{error}</div>}<div className="admin-stats"><div><strong>{profiles.length}</strong><span>MEMBER PROFILES</span></div><div><strong>{jobs.length}</strong><span>JOB POSTS</span></div></div><div className="feature-panel admin-table"><h2>Member profiles</h2>{profiles.length ? profiles.map((person) => <div className="admin-row" key={person.id}><span><strong>{person.full_name}</strong><small>{person.title || 'No title'} · {person.location || 'No location'}</small></span><div className="admin-actions"><Link className="text-link" to={`/developers/${person.id}`}>View profile <ExternalLink size={13}/></Link><button className="button button-outline" onClick={() => void removeProfile(person)}>Remove profile <X size={14}/></button></div></div>) : <p className="panel-empty">No member-created profiles yet.</p>}</div><div className="feature-panel admin-table"><h2>Job postings</h2>{jobs.length ? jobs.map((job) => <div className="admin-row" key={job.id}><span><strong>{job.title}</strong><small>{job.company} · {job.location} · {job.status}</small></span><button className="button button-outline" onClick={() => void removeJob(job)}>Remove <X size={14}/></button></div>) : <p className="panel-empty">No job posts yet.</p>}</div></>}</section>
}
