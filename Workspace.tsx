import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, Check, CircleAlert, CircleCheck, FolderKanban, LoaderCircle, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react'
import { supabase } from './supabase-client'

type Account = { id: string; email: string; name: string }
type Project = { id: string; owner_id: string; title: string; summary: string; status: 'planning' | 'active' | 'paused' | 'complete'; due_date: string | null; technologies: string[]; created_at: string }
type Task = { id: string; owner_id: string; project_id: string | null; title: string; due_date: string | null; is_completed: boolean; created_at: string }
type Goal = { id: string; owner_id: string; title: string; category: 'DSA' | 'Learning' | 'Skill'; unit: string; target: number; progress: number; updated_at: string }
type Activity = { id: string; owner_id: string; message: string; type: string; read_at: string | null; created_at: string }
type WorkspaceData = { projects: Project[]; tasks: Task[]; goals: Goal[]; notifications: Activity[] }
const emptyData: WorkspaceData = { projects: [], tasks: [], goals: [], notifications: [] }
const localKey = (userId: string) => `dd-workspace-${userId}`
const newId = () => crypto.randomUUID()
const dateToday = () => new Date().toISOString().slice(0, 10)

export function WorkspacePage({ account }: { account: Account | null }) {
  const [data, setData] = useState<WorkspaceData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projectForm, setProjectForm] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState(false)
  const [goalForm, setGoalForm] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!account) { setLoading(false); return }
    let active = true
    setLoading(true)
    setError('')
    if (!supabase) {
      try {
        const saved = JSON.parse(localStorage.getItem(localKey(account.id)) ?? 'null') as WorkspaceData | null
        setData(saved ?? emptyData)
      } catch {
        setData(emptyData)
        setError('Workspace data could not be read from this browser.')
      }
      setLoading(false)
      return () => { active = false }
    }
    void (async () => {
      try {
        const [projects, tasks, goals, notifications] = await Promise.all([
          supabase.from('workspace_projects').select('*').eq('owner_id', account.id).order('created_at', { ascending: false }),
          supabase.from('workspace_tasks').select('*').eq('owner_id', account.id).order('created_at', { ascending: false }),
          supabase.from('learning_goals').select('*').eq('owner_id', account.id).order('updated_at', { ascending: false }),
          supabase.from('workspace_notifications').select('*').eq('owner_id', account.id).order('created_at', { ascending: false }).limit(30),
        ])
        const failed = projects.error || tasks.error || goals.error || notifications.error
        if (failed) throw failed
        if (active) setData({ projects: projects.data ?? [], tasks: tasks.data ?? [], goals: goals.data ?? [], notifications: notifications.data ?? [] } as WorkspaceData)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load your workspace.')
      } finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [account])

  const persistDemo = (next: WorkspaceData) => {
    setData(next)
    if (!supabase && account) {
      try { localStorage.setItem(localKey(account.id), JSON.stringify(next)) }
      catch { setError('Could not save changes in this browser. Check available storage.') }
    }
  }
  const addActivity = async (message: string) => {
    if (!account) return
    if (supabase) {
      const { data: row, error: insertError } = await supabase.from('workspace_notifications').insert({ owner_id: account.id, message, type: 'activity' }).select().single()
      if (insertError) { setError(insertError.message); return }
      setData((current) => ({ ...current, notifications: [row as Activity, ...current.notifications].slice(0, 30) }))
      return
    }
    const item: Activity = { id: newId(), owner_id: account.id, message, type: 'activity', read_at: null, created_at: new Date().toISOString() }
    setData((current) => { const next = { ...current, notifications: [item, ...current.notifications].slice(0, 30) }; if (!supabase) { try { localStorage.setItem(localKey(account.id), JSON.stringify(next)) } catch { setError('Could not save activity in this browser.') } } return next })
  }
  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!account || busy) return
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>
    if (values.title.trim().length < 3 || values.summary.trim().length < 8) { setError('Add a project title and a useful short description.'); return }
    setBusy(true); setError('')
    try {
      const payload = { owner_id: account.id, title: values.title.trim(), summary: values.summary.trim(), status: values.status as Project['status'], due_date: values.due_date || null, technologies: values.technologies.split(',').map((item) => item.trim()).filter(Boolean) }
      const existing = data.projects.find((project) => project.id === editingProjectId)
      let item: Project
      if (supabase && editingProjectId) { const { data: row, error: updateError } = await supabase.from('workspace_projects').update(payload).eq('id', editingProjectId).select().single(); if (updateError) throw updateError; item = row as Project }
      else if (supabase) { const { data: row, error: insertError } = await supabase.from('workspace_projects').insert(payload).select().single(); if (insertError) throw insertError; item = row as Project }
      else if (existing) { item = { ...existing, ...payload }; persistDemo({ ...data, projects: data.projects.map((project) => project.id === item.id ? item : project) }) }
      else { item = { ...payload, id: newId(), created_at: new Date().toISOString() }; persistDemo({ ...data, projects: [item, ...data.projects] }) }
      if (supabase) setData((current) => ({ ...current, projects: editingProjectId ? current.projects.map((project) => project.id === item.id ? item : project) : [item, ...current.projects] }))
      setProjectForm(false); setEditingProjectId(null); form.reset(); await addActivity(`${existing ? 'Updated' : 'Started'} project: ${item.title}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this project.') } finally { setBusy(false) }
  }
  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!account || busy) return
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>
    if (values.title.trim().length < 3) { setError('Task title needs at least 3 characters.'); return }
    setBusy(true); setError('')
    try {
      const payload = { owner_id: account.id, title: values.title.trim(), project_id: values.project_id || null, due_date: values.due_date || null, is_completed: false }
      let item: Task
      if (supabase) { const { data: row, error: insertError } = await supabase.from('workspace_tasks').insert(payload).select().single(); if (insertError) throw insertError; item = row as Task }
      else { item = { ...payload, id: newId(), created_at: new Date().toISOString() }; persistDemo({ ...data, tasks: [item, ...data.tasks] }) }
      if (supabase) setData((current) => ({ ...current, tasks: [item, ...current.tasks] }))
      setTaskForm(false); form.reset(); await addActivity(`Added a task: ${item.title}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this task.') } finally { setBusy(false) }
  }
  const createGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!account || busy) return
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>
    const target = Number(values.target)
    if (values.title.trim().length < 3 || !Number.isInteger(target) || target < 1) { setError('Add a goal title and a target greater than zero.'); return }
    setBusy(true); setError('')
    try {
      const payload = { owner_id: account.id, title: values.title.trim(), category: values.category as Goal['category'], unit: values.unit.trim() || 'sessions', target, progress: 0 }
      let item: Goal
      if (supabase) { const { data: row, error: insertError } = await supabase.from('learning_goals').insert(payload).select().single(); if (insertError) throw insertError; item = row as Goal }
      else { item = { ...payload, id: newId(), updated_at: new Date().toISOString() }; persistDemo({ ...data, goals: [item, ...data.goals] }) }
      if (supabase) setData((current) => ({ ...current, goals: [item, ...current.goals] }))
      setGoalForm(false); form.reset(); await addActivity(`Set a new ${item.category.toLowerCase()} goal: ${item.title}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this goal.') } finally { setBusy(false) }
  }
  const updateProjectStatus = async (project: Project, status: Project['status']) => {
    if (supabase) { const { error: updateError } = await supabase.from('workspace_projects').update({ status }).eq('id', project.id); if (updateError) { setError(updateError.message); return } }
    persistDemoOrState({ ...data, projects: data.projects.map((item) => item.id === project.id ? { ...item, status } : item) })
    void addActivity(`Updated ${project.title} to ${status}.`)
  }
  const toggleTask = async (task: Task) => {
    const is_completed = !task.is_completed
    if (supabase) { const { error: updateError } = await supabase.from('workspace_tasks').update({ is_completed }).eq('id', task.id); if (updateError) { setError(updateError.message); return } }
    const next = { ...data, tasks: data.tasks.map((item) => item.id === task.id ? { ...item, is_completed } : item) }
    persistDemoOrState(next)
    if (is_completed) void addActivity(`Completed a task: ${task.title}.`)
  }
  const updateGoal = async (goal: Goal, amount: number) => {
    const progress = Math.max(0, Math.min(goal.target, goal.progress + amount))
    if (supabase) { const { error: updateError } = await supabase.from('learning_goals').update({ progress, updated_at: new Date().toISOString() }).eq('id', goal.id); if (updateError) { setError(updateError.message); return } }
    persistDemoOrState({ ...data, goals: data.goals.map((item) => item.id === goal.id ? { ...item, progress, updated_at: new Date().toISOString() } : item) })
    if (amount > 0) void addActivity(`Logged progress on ${goal.title}: ${progress} of ${goal.target} ${goal.unit}.`)
  }
  const deleteItem = async (table: 'workspace_projects' | 'workspace_tasks' | 'learning_goals', kind: 'projects' | 'tasks' | 'goals', id: string) => {
    if (supabase) { const { error: deleteError } = await supabase.from(table).delete().eq('id', id); if (deleteError) { setError(deleteError.message); return } }
    persistDemoOrState({ ...data, [kind]: data[kind].filter((item) => item.id !== id) })
  }
  const markRead = async (item: Activity) => {
    const read_at = new Date().toISOString()
    if (supabase) { const { error: updateError } = await supabase.from('workspace_notifications').update({ read_at }).eq('id', item.id); if (updateError) { setError(updateError.message); return } }
    persistDemoOrState({ ...data, notifications: data.notifications.map((notice) => notice.id === item.id ? { ...notice, read_at } : notice) })
  }
  function persistDemoOrState(next: WorkspaceData) { if (supabase) setData(next); else persistDemo(next) }

  const openTasks = useMemo(() => data.tasks.filter((task) => !task.is_completed), [data.tasks])
  const unread = data.notifications.filter((item) => !item.read_at).length
  const projectName = (id: string | null) => data.projects.find((project) => project.id === id)?.title ?? 'Independent task'

  if (!account) return <section className="workspace-page container"><div className="workspace-gate"><FolderKanban size={30}/><h1>Your work, in one place.</h1><p>Sign in to plan projects, track small wins and keep your learning goals moving.</p><Link to="/login" className="button button-light">Log in to your workspace <ArrowRight size={15}/></Link></div></section>
  return <section className="workspace-page container">
    <div className="workspace-top"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR DEVELOPER WORKSPACE</div><h1>Make progress<br/><span>you can see.</span></h1><p>Plan your builds, keep the next task clear, and turn practice into progress.</p></div><div className="workspace-actions"><Link className="button button-outline" to="/dashboard">Edit public profile <ArrowRight size={14}/></Link><span className="workspace-local"><i/>{supabase ? 'SYNCED WORKSPACE' : 'SAVED IN THIS BROWSER'}</span></div></div>
    {error && <div className="feature-alert workspace-alert"><CircleAlert size={15}/>{error}</div>}
    <div className="workspace-stats"><div><FolderKanban/><span>PROJECTS</span><strong>{data.projects.length}</strong><small>{data.projects.filter((project) => project.status === 'active').length} active</small></div><div><Check/><span>OPEN TASKS</span><strong>{openTasks.length}</strong><small>{data.tasks.filter((task) => task.is_completed).length} completed</small></div><div><BookOpen/><span>LEARNING GOALS</span><strong>{data.goals.length}</strong><small>{data.goals.filter((goal) => goal.progress >= goal.target).length} reached</small></div><div><TrendingUp/><span>UPDATES</span><strong>{unread}</strong><small>unread activity</small></div></div>
    <div className="workspace-layout"><main className="workspace-main">
      <section className="workspace-section"><div className="workspace-section-head"><div><span className="workspace-kicker">BUILD TRACKER</span><h2>Projects</h2><p>Keep the goal and next milestone visible.</p></div><button className="button button-light" onClick={() => { setEditingProjectId(null); setProjectForm(!projectForm); setError('') }}><Plus size={15}/> New project</button></div>
        {projectForm && <form key={editingProjectId ?? 'new-project'} className="workspace-form" onSubmit={createProject}><div className="workspace-form-grid"><label>Project name<input name="title" required minLength={3} maxLength={100} defaultValue={data.projects.find((project) => project.id === editingProjectId)?.title ?? ''} placeholder="e.g. Portfolio refresh"/></label><label>Project status<select name="status" defaultValue={data.projects.find((project) => project.id === editingProjectId)?.status ?? 'active'}><option value="active">Active</option><option value="planning">Planning</option><option value="paused">Paused</option><option value="complete">Complete</option></select></label><label>Target date<input name="due_date" type="date" min={dateToday()} defaultValue={data.projects.find((project) => project.id === editingProjectId)?.due_date ?? ''}/></label><label>Tools / technologies<input name="technologies" defaultValue={data.projects.find((project) => project.id === editingProjectId)?.technologies.join(', ') ?? ''} placeholder="React, TypeScript"/></label></div><label>What are you building?<textarea name="summary" required minLength={8} maxLength={500} rows={3} defaultValue={data.projects.find((project) => project.id === editingProjectId)?.summary ?? ''} placeholder="A short description and what success looks like."/></label><div className="workspace-form-actions"><button type="button" className="button button-outline" onClick={() => { setProjectForm(false); setEditingProjectId(null) }}>Cancel</button><button className="button button-light" disabled={busy}>{busy ? 'Saving…' : editingProjectId ? 'Save changes' : 'Save project'}</button></div></form>}
        {loading ? <div className="workspace-empty"><LoaderCircle className="spin"/> Loading projects…</div> : data.projects.length ? <div className="workspace-project-grid">{data.projects.map((project) => { const tasks = data.tasks.filter((task) => task.project_id === project.id); const done = tasks.filter((task) => task.is_completed).length; const percent = tasks.length ? Math.round(done / tasks.length * 100) : project.status === 'complete' ? 100 : 0; return <article className="workspace-project-card" key={project.id}><div className="workspace-project-meta"><select className={`project-status-select ${project.status}`} aria-label={`Update ${project.title} status`} value={project.status} onChange={(event) => void updateProjectStatus(project, event.target.value as Project['status'])}><option value="active">Active</option><option value="planning">Planning</option><option value="paused">Paused</option><option value="complete">Complete</option></select><div className="workspace-card-actions"><button className="workspace-delete" aria-label={`Edit ${project.title}`} onClick={() => { setEditingProjectId(project.id); setProjectForm(true); setError('') }}><Pencil size={13}/></button><button className="workspace-delete" aria-label={`Delete ${project.title}`} onClick={() => void deleteItem('workspace_projects','projects',project.id)}><Trash2 size={14}/></button></div></div><h3>{project.title}</h3><p>{project.summary}</p><div className="workspace-progress"><span style={{ width: `${percent}%` }}/></div><div className="workspace-project-foot"><span>{done}/{tasks.length} tasks</span>{project.due_date && <span><CalendarDays size={12}/>{project.due_date}</span>}</div>{project.technologies.length > 0 && <div className="skill-tags">{project.technologies.slice(0,4).map((technology) => <span key={technology}>{technology}</span>)}</div>}</article> })}</div> : <div className="workspace-empty"><FolderKanban size={22}/><strong>Start with one small project.</strong><span>Give it a clear goal, then add the next task.</span></div>}
      </section>
      <section className="workspace-section"><div className="workspace-section-head"><div><span className="workspace-kicker">NEXT ACTIONS</span><h2>Tasks</h2><p>Small, specific steps make projects easier to finish.</p></div><button className="button button-outline" onClick={() => { setTaskForm(!taskForm); setError('') }}><Plus size={15}/> Add task</button></div>
        {taskForm && <form className="workspace-form" onSubmit={createTask}><div className="workspace-form-grid"><label>Task<input name="title" required minLength={3} maxLength={140} placeholder="e.g. Set up the project database"/></label><label>Project<select name="project_id"><option value="">Independent task</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label></div><label>Due date<input name="due_date" type="date" min={dateToday()}/></label><div className="workspace-form-actions"><button type="button" className="button button-outline" onClick={() => setTaskForm(false)}>Cancel</button><button className="button button-light" disabled={busy}>{busy ? 'Saving…' : 'Add task'}</button></div></form>}
        {loading ? <div className="workspace-empty"><LoaderCircle className="spin"/> Loading tasks…</div> : data.tasks.length ? <div className="workspace-task-list">{data.tasks.map((task) => <article className={`workspace-task ${task.is_completed ? 'completed' : ''}`} key={task.id}><button className="task-check" aria-label={task.is_completed ? 'Mark task incomplete' : 'Complete task'} onClick={() => void toggleTask(task)}>{task.is_completed && <Check size={14}/>}</button><div><strong>{task.title}</strong><small>{projectName(task.project_id)}{task.due_date ? ` · Due ${task.due_date}` : ''}</small></div><button className="workspace-delete" aria-label={`Delete task ${task.title}`} onClick={() => void deleteItem('workspace_tasks','tasks',task.id)}><Trash2 size={14}/></button></article>)}</div> : <div className="workspace-empty"><Check size={22}/><strong>No tasks on the list.</strong><span>Add one clear next step when you’re ready.</span></div>}
      </section>
    </main><aside className="workspace-side">
      <section className="workspace-section goal-section"><div className="workspace-section-head"><div><span className="workspace-kicker">PRACTICE & LEARNING</span><h2>Goals</h2><p>Turn study time into milestones.</p></div><button className="icon-button" aria-label="Add a learning goal" onClick={() => { setGoalForm(!goalForm); setError('') }}><Plus size={17}/></button></div>
        {goalForm && <form className="workspace-form" onSubmit={createGoal}><label>Goal<input name="title" required minLength={3} maxLength={120} placeholder="Solve graph problems"/></label><div className="workspace-form-grid"><label>Type<select name="category"><option>DSA</option><option>Learning</option><option>Skill</option></select></label><label>Count by<input name="unit" placeholder="problems"/></label><label>Target<input name="target" type="number" min="1" max="100000" required placeholder="40"/></label></div><div className="workspace-form-actions"><button type="button" className="button button-outline" onClick={() => setGoalForm(false)}>Cancel</button><button className="button button-light" disabled={busy}>{busy ? 'Saving…' : 'Set goal'}</button></div></form>}
        {loading ? <div className="workspace-empty"><LoaderCircle className="spin"/></div> : data.goals.length ? <div className="workspace-goals">{data.goals.map((goal) => { const percent = Math.min(100, Math.round(goal.progress / goal.target * 100)); return <article className="workspace-goal" key={goal.id}><div className="goal-title"><span className="goal-type">{goal.category}</span><button className="workspace-delete" aria-label={`Delete goal ${goal.title}`} onClick={() => void deleteItem('learning_goals','goals',goal.id)}><Trash2 size={13}/></button></div><strong>{goal.title}</strong><div className="workspace-progress"><span style={{ width: `${percent}%` }}/></div><div className="goal-progress-label"><span>{goal.progress} / {goal.target} {goal.unit}</span><span>{percent}%</span></div><button className="goal-log-button" disabled={goal.progress >= goal.target} onClick={() => void updateGoal(goal, 1)}><Plus size={13}/> Log one {goal.unit.replace(/s$/,'')}</button></article> })}</div> : <div className="workspace-empty"><BookOpen size={21}/><strong>Choose one thing to learn.</strong><span>Set a target and log each practice session.</span></div>}
      </section>
      <section className="workspace-section activity-section"><div className="workspace-section-head"><div><span className="workspace-kicker">YOUR RECENT WINS</span><h2>Activity</h2><p>Recent updates from this workspace.</p></div><CircleCheck size={17}/></div>{data.notifications.length ? <div className="workspace-activity-list">{data.notifications.slice(0,8).map((item) => <button className={`workspace-activity ${item.read_at ? 'read' : ''}`} key={item.id} onClick={() => !item.read_at && void markRead(item)}><i/><span>{item.message}<small>{new Date(item.created_at).toLocaleString()}</small></span>{!item.read_at && <b>NEW</b>}</button>)}</div> : <div className="workspace-empty"><span>Project starts, task completions, and practice sessions show up here.</span></div>}</section>
      <Link to="/discover" className="workspace-directory-link"><BriefcaseBusiness size={16}/><span><strong>Find a collaborator</strong><small>Meet developers in the directory</small></span><ArrowRight size={15}/></Link>
    </aside></div>
  </section>
}
