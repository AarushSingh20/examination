import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, CalendarDays, Users, GraduationCap, ClipboardList, LogOut, Plus, Check, Clock, ChartNoAxesColumnIncreasing, Menu, Search, Bell, ChevronLeft, ChevronRight, FileQuestion, ShieldCheck, ArrowRight, LockKeyhole, Mail, UserRound, ClipboardCheck, CalendarCheck2, AlertCircle } from 'lucide-react';
import './source-workspace.css';
import { api, errorMessage } from './api';

const icons = { Sources: BookOpen, Invitations: Mail, Overview: LayoutDashboard, Courses: BookOpen, Exams: ClipboardList, People: Users, Slots: CalendarDays, Availability: CalendarCheck2, Bookings: CalendarDays, Questions: FileQuestion, Results: ChartNoAxesColumnIncreasing, 'My Courses': GraduationCap };
const menus = { admin: ['Overview', 'Courses', 'Exams', 'Invitations', 'People', 'Slots', 'Bookings', 'Results'], examiner: ['Overview', 'Exams', 'Sources', 'Invitations', 'Availability', 'Questions', 'Bookings', 'Results'], student: ['Overview', 'My Courses', 'Exams', 'Slots', 'Bookings', 'Results'] };
const colors = ['purple', 'blue', 'orange', 'green', 'pink'];

function App() {
    const [user, setUser] = useState(() => { try { return JSON.parse(sessionStorage.getItem('examination_user') || 'null') } catch { return null } });
    const [busy, setBusy] = useState(false);
    function signedIn(data) { sessionStorage.setItem('examination_token', data.access_token); sessionStorage.setItem('examination_user', JSON.stringify(data.user)); setUser(data.user) }
    function logout() { sessionStorage.removeItem('examination_token'); sessionStorage.removeItem('examination_user'); setUser(null) }
    useEffect(() => { if (!user) return; api.get('/auth/me').then(({ data }) => setUser(data)).catch(logout) }, []);
    return <Routes><Route path="/login" element={user ? <Navigate to="/" replace /> : <Auth onLogin={signedIn} busy={busy} setBusy={setBusy} />} /><Route path="/*" element={user ? <Workspace user={user} logout={logout} /> : <Navigate to="/login" replace />} /></Routes>;
}

function Brand() { return <div className="brand"><span className="brand-icon"><GraduationCap size={23} /></span><span>examination<span className="brand-period">.</span><small>MANAGEMENT PORTAL</small></span></div> }
function Auth({ onLogin, busy, setBusy }) {
    const [register, setRegister] = useState(false), [form, setForm] = useState({ name: '', email: '', password: '' }), [error, setError] = useState('');
    const update = e => setForm({ ...form, [e.target.name]: e.target.value });
    async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { const { data } = await api.post(register ? '/auth/register' : '/auth/login', form); onLogin(data) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) } }
    return <div className="auth-page"><div className="auth-feature"><div className="auth-brand"><Brand /></div><div className="auth-feature-content"><span className="pill">EDUCATION, REIMAGINED</span><h1>Smarter exams.<br /><em>Brighter futures.</em></h1><p>Plan assessments, manage schedules, track outcomes, and empower every learner—all from one beautiful workspace.</p><div className="auth-decor"><div><ChartNoAxesColumnIncreasing size={25} /> <span>Performance at a glance</span></div><div><ShieldCheck size={25} /> <span>Role-based security</span></div></div></div><div className="auth-feature-foot">Built for modern institutions · 2026</div></div><div className="auth-form-side"><div className="auth-form"><span className="auth-kicker">WELCOME TO EXAMINATION</span><h2>{register ? 'Create your account' : 'Welcome back'}</h2><p className="muted">{register ? 'Sign up as a student to get started.' : 'Sign in to access your personalized dashboard.'}</p><form onSubmit={submit}>{register && <label>Full name<div className="input-icon"><UserRound size={18} /><input name="name" placeholder="Your full name" value={form.name} onChange={update} required /></div></label>}<label>Email address<div className="input-icon"><Mail size={18} /><input type="email" name="email" placeholder="you@university.edu" value={form.email} onChange={update} required /></div></label><label>Password<div className="input-icon"><LockKeyhole size={18} /><input type="password" name="password" placeholder="At least 8 characters" value={form.password} onChange={update} minLength={register ? 8 : 1} required /></div></label>{error && <div className="alert error"><AlertCircle size={16} />{error}</div>}<button className="btn primary wide" disabled={busy}>{busy ? 'Please wait...' : register ? 'Create student account' : 'Sign in to dashboard'}<ArrowRight size={17} /></button></form><div className="auth-switch">{register ? 'Already have an account?' : 'New student?'} <button className="text-button" onClick={() => { setRegister(!register); setError('') }}>{register ? 'Sign in' : 'Create an account'}</button></div><p className="auth-hint">Admin and examiner accounts are created by the administrator.</p></div></div></div>;
}

function NotificationBell({ go }) {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState({ items: [], next_before_id: null });
    const [cursor, setCursor] = useState(null);
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [marking, setMarking] = useState(null);
    useEffect(() => {
        let active = true;
        let timer;
        async function load() {
            try {
                const { data } = await api.get('/notifications', { params: cursor ? { before_id: cursor } : {} });
                if (active) { setPage(data); setCount(data.unread_count); setError(''); }
            } catch (err) {
                if (active) setError(errorMessage(err));
            } finally {
                if (active) { setLoading(false); timer = setTimeout(load, 30000); }
            }
        }
        setLoading(true);
        load();
        return () => { active = false; clearTimeout(timer); };
    }, [cursor, open, version]);
    async function mark(id) {
        setMarking(id);
        try {
            await api.patch(`/notifications/${id}/read`);
            setVersion(v => v + 1);
        } catch (err) { setError(errorMessage(err)); }
        finally { setMarking(null); }
    }
    return <div style={{ position: 'relative' }}>
        <button className="btn secondary small" aria-label={`Notifications, ${count} unread`}
            aria-expanded={open} onClick={() => { setCursor(null); setOpen(!open); }}>
            <Bell size={18} />{count > 0 && <strong>{count}</strong>}
        </button>
        {open && <section aria-label="Notifications" className="panel"
            style={{ position: 'fixed', top: '4.5rem', right: '1rem', width: 'min(25rem, calc(100vw - 2rem))', maxHeight: '70vh', overflowY: 'auto', zIndex: 50, background: 'white' }}>
            <div className="panel-head"><h3>Notifications</h3><Button secondary onClick={() => setOpen(false)}>Close</Button></div>
            <Notice message={error} />
            {loading ? <p>Loading…</p> : !error && !page.items.length && <p>No notifications yet.</p>}
            {!loading && page.items.map(note => <article key={note.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #ddd' }}>
                <strong>{note.title}</strong><p>{note.body}</p><small>{date(note.created_at)}</small>
                {!note.is_read && <div><Button disabled={marking !== null} onClick={() => mark(note.id)}>Mark as read</Button></div>}
            </article>)}
            <div className="inline-actions">
                {cursor && <Button secondary onClick={() => setCursor(null)}>Newest</Button>}
                {!loading && page.next_before_id && <Button secondary onClick={() => setCursor(page.next_before_id)}>Older</Button>}
                <Button onClick={() => { setOpen(false); go('Invitations'); }}>Open invitations</Button>
            </div>
        </section>}
    </div>;
}

function Workspace({ user, logout }) {
    const [section, setSection] = useState('Overview'), [drawer, setDrawer] = useState(false), [refresh, setRefresh] = useState(0);
    const update = () => setRefresh(n => n + 1);
    const navigate = useNavigate();
    const sections = menus[user.role] || menus.student;
    const go = s => { setSection(s); setDrawer(false) };
    return <div className="app-shell"><aside className={`sidebar ${drawer ? 'open' : ''}`}><Brand /><div className="workspace-label">WORKSPACE</div><nav>{sections.map(s => { const I = icons[s]; return <button key={s} onClick={() => go(s)} className={`nav-link ${s === section ? 'active' : ''}`}><I size={19} /><span>{s}</span>{s === section && <span className="active-indicator" />}</button> })}</nav><div className="sidebar-bottom"><div className="support-card"><span className="support-icon"><GraduationCap size={20} /></span><strong>One portal. Every exam.</strong><small>Better assessment management starts here.</small></div><button className="nav-link" onClick={logout}><LogOut size={19} /> Sign out</button></div></aside><main className="main"><header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setDrawer(!drawer)}><Menu size={21} /></button><div className="breadcrumb">Workspace <ChevronRight size={15} /> <strong>{section}</strong></div></div><div className="top-actions">{(user.role === 'admin' || user.role === 'examiner') && <NotificationBell key={user.id} go={go} />}<span className="role-label">{user.role} workspace</span><span className="avatar">{user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}</span><div className="account-name"><strong>{user.name}</strong><small>{user.email}</small></div></div></header><div className="content"><div className="page-heading"><div><p className="eyebrow">{user.role.toUpperCase()} / {section.toUpperCase()}</p><h1>{section === 'Overview' ? `Good to see you, ${user.name.split(' ')[0]} 👋` : section}</h1><p className="muted">{section === 'Overview' ? `Here's what's happening across your ${user.role} workspace.` : 'Manage your examination workflow in one place.'}</p></div><div className="date-chip"><CalendarDays size={17} />{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div></div><Section key={`${user.role}-${section}`} section={section} user={user} refresh={refresh} update={update} navigateTo={go} /></div></main>{drawer && <div className="backdrop" onClick={() => setDrawer(false)} />}</div>;
}

function useLoad(url, refresh = 0) { const [data, setData] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''); useEffect(() => { let live = true; setLoading(true); api.get(url).then(r => { if (live) { setData(r.data); setError('') } }).catch(e => { if (live) setError(errorMessage(e)) }).finally(() => { if (live) setLoading(false) }); return () => { live = false } }, [url, refresh]); return { data, loading, error } }
function Notice({ message, type = 'error' }) { return message ? <div className={`alert ${type}`}>{type === 'error' ? <AlertCircle size={17} /> : <Check size={17} />} {message}</div> : null }
function ActionForm({ fields, onSave, submit = 'Create', onDone }) { const initial = Object.fromEntries(fields.map(f => [f.name, f.default ?? ''])); const [form, setForm] = useState(initial), [working, setWorking] = useState(false), [error, setError] = useState(''); async function send(e) { e.preventDefault(); setWorking(true); setError(''); try { await onSave(form); setForm(initial); onDone?.() } catch (e) { setError(errorMessage(e)) } finally { setWorking(false) } } return <form className="form-grid" onSubmit={send}>{fields.map(f => <label key={f.name} className={f.wide ? 'span-2' : ''}>{f.label}<div>{f.type === 'select' ? <select required={f.required !== false} value={form[f.name]} onChange={e => setForm({ ...form, [f.name]: e.target.value })}><option value="">{f.placeholder ?? `Select ${f.label}`}</option>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : f.type === 'textarea' ? <textarea required={f.required !== false} value={form[f.name]} placeholder={f.placeholder || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} /> : <input type={f.type || 'text'} value={form[f.name]} min={f.min} placeholder={f.placeholder || ''} required={f.required !== false} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />}</div></label>)}<div className="span-2"><Notice message={error} /><button disabled={working} className="btn primary" type="submit"><Plus size={17} />{working ? 'Saving...' : submit}</button></div></form> }
function Panel({ title, sub, children, action }) { return <div className="panel"><div className="panel-head"><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>{action}</div>{children}</div> }
function Table({ headers, rows, empty = 'Nothing here yet' }) { return <div className="table-scroll"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>) : <tr><td colSpan={headers.length} className="empty">{empty}</td></tr>}</tbody></table></div> }
function Chip({ children, tone = 'gray' }) { return <span className={`chip ${tone}`}>{children}</span> }
function date(s) { return s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—' }
function Button({ children, onClick, secondary = false, disabled = false }) { return <button disabled={disabled} className={`btn ${secondary ? 'secondary' : 'primary'} small`} onClick={onClick}>{children}</button> }
function Section({ section, user, refresh, update, navigateTo }) { switch (section) { case 'Sources': return <Sources />; case 'Invitations': return <Invitations user={user} refresh={refresh} update={update} />; case 'Overview': return <Overview user={user} refresh={refresh} navigateTo={navigateTo} />; case 'Courses': case 'My Courses': return <Courses user={user} refresh={refresh} update={update} />; case 'People': return <People refresh={refresh} update={update} />; case 'Exams': return <Exams user={user} refresh={refresh} update={update} />; case 'Availability': return <Availability refresh={refresh} update={update} />; case 'Slots': return <Slots user={user} refresh={refresh} update={update} />; case 'Bookings': return <Bookings user={user} refresh={refresh} />; case 'Questions': return <Questions user={user} refresh={refresh} update={update} />; case 'Results': return <Results user={user} refresh={refresh} />; default: return null } }
function Overview({ user, refresh, navigateTo }) { const { data, loading, error } = useLoad('/dashboard', refresh); const stats = data.stats || {}; const statIcons = [Users, BookOpen, ClipboardList, CalendarDays, ChartNoAxesColumnIncreasing]; return <><Notice message={error} /><div className="stats-grid">{Object.entries(stats).map(([name, value], i) => { const I = statIcons[i % statIcons.length]; return <div className="stat-card" key={name}><div className={`stat-icon ${colors[i % colors.length]}`}><I size={22} /></div><span className="stat-label">{name}</span><div className="stat-number">{value}</div><div className="stat-foot">Live workspace data <span>↗</span></div></div> })}{loading && <p className="muted">Loading dashboard...</p>}</div><div className="overview-grid"><Panel title={user.role === 'student' ? 'Your upcoming bookings' : 'Recently managed exams'} sub="A quick look at your activity" action={<button className="text-button" onClick={() => navigateTo(user.role === 'student' ? 'Bookings' : 'Exams')}>View all <ArrowRight size={14} /></button>}>{user.role === 'student' ? <Table headers={['Exam', 'Scheduled for']} rows={(data.bookings || []).map(x => [x.exam, date(x.starts_at)])} /> : <Table headers={['Exam', 'Course', 'Status']} rows={(data.recent_exams || []).map(x => [x.title, x.course, <Chip tone={x.status === 'published' ? 'green' : 'orange'}>{x.status}</Chip>])} />}</Panel><Panel title="Quick actions" sub="Pick up where you left off"><div className="quick-actions">{(user.role === 'admin' ? [['Manage courses', 'Courses'], ['Schedule examinations', 'Exams'], ['Manage exam slots', 'Slots']] : user.role === 'examiner' ? [['View assigned exams', 'Exams'], ['Write exam questions', 'Questions'], ['Set availability', 'Availability']] : [['Find available exams', 'Exams'], ['Book a slot', 'Slots'], ['View results', 'Results']]).map(([name, target]) => <button key={name} onClick={() => navigateTo(target)}><span>{name}</span><ArrowRight size={17} /></button>)}</div></Panel></div></> }
function Courses({ user, refresh, update }) { const { data, error } = useLoad('/courses', refresh); const mine = useLoad('/enrollments/me', refresh); const [message, setMessage] = useState(''); const enrolled = new Set((mine.data || []).map(x => x.id)); async function enroll(course) { try { await api.post('/enrollments', { course_id: course.id }); setMessage('Enrolled successfully'); update() } catch (e) { setMessage(errorMessage(e)) } } return <><Notice message={error} /><Notice message={message} type={message === 'Enrolled successfully' ? 'success' : 'error'} />{user.role === 'admin' && <Panel title="Create a course" sub="Add a new course to your catalog"><ActionForm fields={[{ name: 'code', label: 'Course code', placeholder: 'CS201' }, { name: 'title', label: 'Course title', placeholder: 'Data Structures' }, { name: 'description', label: 'Description', wide: true, required: false }]} onSave={d => api.post('/courses', d)} onDone={update} /></Panel>}<Panel title="Course catalog" sub={`${data.length} available courses`}><Table headers={['Code', 'Course name', 'Description', ...(user.role === 'student' ? ['Enrollment'] : [])]} rows={data.map(c => [<strong>{c.code}</strong>, c.title, c.description || '—', ...(user.role === 'student' ? [enrolled.has(c.id) ? <Chip tone="green">Enrolled</Chip> : <Button onClick={() => enroll(c)}>Enroll</Button>] : [])])} /></Panel></> }
function People({ refresh, update }) { const { data, error } = useLoad('/users', refresh); return <><Notice message={error} /><Panel title="Add an examiner" sub="Examiner login credentials are created here"><ActionForm fields={[{ name: 'name', label: 'Full name', placeholder: 'Dr. Aditi Sharma' }, { name: 'email', label: 'Email', type: 'email', placeholder: 'faculty@university.edu' }, { name: 'password', label: 'Temporary password', type: 'password', wide: true, placeholder: 'At least 8 characters' }]} onSave={d => api.post('/users/examiners', d)} onDone={update} /></Panel><Panel title="Directory" sub={`${data.length} registered users`}><Table headers={['Name', 'Email', 'Role']} rows={data.map(u => [<strong>{u.name}</strong>, u.email, <Chip tone={u.role === 'admin' ? 'purple' : u.role === 'examiner' ? 'blue' : 'green'}>{u.role}</Chip>])} /></Panel></> }
function Sources() {
    const { data: exams, error, loading } = useLoad('/exams');
    const [selected, setSelected] = useState('');
    return <>
        <Panel title="Exam sources" sub="Choose the assigned exam for this PDF.">
            <Notice message={error} />
            {loading ? <p>Loading exams…</p> : !error && (
                exams.length ? <label className="select-alone">Examination
                    <select value={selected} onChange={event => setSelected(event.target.value)}>
                        <option value="">Select an exam</option>
                        {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title} (#{exam.id})</option>)}
                    </select>
                </label> : <p>You have no assigned exams yet.</p>
            )}
        </Panel>
        {selected && <ExamSources key={selected} examId={selected} editable={exams.some(exam => String(exam.id) === selected && exam.status === 'draft')} />}
    </>;
}

function PaperQuestion({ examId, draft }) {
    const [expanded, setExpanded] = useState(false);
    const [prompt, setPrompt] = useState(draft.question);
    const [alternatives, setAlternatives] = useState(['', '', '']);
    const [position, setPosition] = useState(0);
    const [marks, setMarks] = useState(1);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    async function save(event) {
        event.preventDefault();
        if (saving || saved) return;
        const options = alternatives.map(value => value.trim());
        options.splice(position, 0, draft.answer.trim());
        if (!prompt.trim() || options.some(value => !value) ||
            new Set(options.map(value => value.toLowerCase())).size !== options.length) {
            setError('Enter a question and four distinct options.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.post('/exams/' + examId + '/questions', {
                prompt: prompt.trim(), options, correct_index: position, marks: Number(marks)
            });
            setSaved(true);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    if (saved) return <Notice type="success" message="Added to this exam paper." />;
    return <div className="paper-review">
        <button type="button" className="btn primary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Close review' : 'Review and add to paper'}</button>
        {expanded && (
            <form className="form-grid" onSubmit={save}>
                <label className="span-2">Question<textarea value={prompt} required onChange={e => setPrompt(e.target.value)} /></label>
                <label>Correct answer position<select value={position} onChange={e => setPosition(Number(e.target.value))}>
                    {['A', 'B', 'C', 'D'].map((letter, i) => <option key={letter} value={i}>{letter}</option>)}
                </select></label>
                <label>Marks<input type="number" min="1" step="1" required value={marks} onChange={e => setMarks(e.target.value)} /></label>
                {alternatives.map((value, i) => <label key={i}>Incorrect option {'ABCD'[i < position ? i : i + 1]}
                    <input required value={value} onChange={e => setAlternatives(alternatives.map((old, j) => j === i ? e.target.value : old))} />
                </label>)}
                <div className="span-2"><Notice message={error} /><button className="btn primary" disabled={saving}>
                    {saving ? 'Adding…' : 'Add to question paper'}
                </button></div>
            </form>)}
    </div>;
}

function PassageSearch({ url, openPage, examId, editable }) {
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);
    const [matches, setMatches] = useState(null);
    const [error, setError] = useState('');
    const [drafts, setDrafts] = useState(null);
    async function search(event) {
        event.preventDefault();
        if (!query.trim() || busy) return;
        setBusy('search');
        setError('');
        setMatches(null); setDrafts(null);
        try {
            const { data } = await api.get(url + '/search', { params: { q: query.trim() } });
            setMatches(data.matches);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }
    async function generate() {
        setBusy('generate');
        setDrafts(null);
        setError('');
        try {
            const { data } = await api.post(url + '/drafts', null, { params: { q: query.trim() } });
            setDrafts(data.questions);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }
    return <section className="pdf-tools">
        <form className="pdf-search" onSubmit={search}>
            <label>Keywords in this PDF
                <input value={query} maxLength={200} disabled={!!busy}
                    onChange={event => { setQuery(event.target.value); setMatches(null); setDrafts(null); setError(''); }} />
            </label>
            <div><button className="btn primary" disabled={busy || !query.trim()}>
                {busy === 'search' ? 'Searching…' : 'Find passages'}
            </button></div>
        </form>
        <Notice message={error} />
        {matches?.length === 0 && <p>No passage contains all these keywords.</p>}
        <div className="pdf-generate">
            <p>Gemini receives the matching passages. Use non-confidential material only.</p>
            <button type="button" className="btn primary" onClick={generate} disabled={!!busy || !matches?.length}>{busy === 'generate' ? 'Generating…' : 'Generate draft questions'}</button>
        </div>
        {drafts?.length === 0 && <p>Insufficient evidence for a question.</p>}
        {drafts?.map((draft, index) => <article className="pdf-draft" key={index}>
            <h4>{draft.question}</h4><p>Answer from the PDF: {draft.answer}</p>
            <Button secondary onClick={() => openPage(draft.page)}>Page {draft.page} · Passage {draft.passage_number}</Button>
            {editable ? <PaperQuestion examId={examId} draft={draft} /> :
                <p>Questions can only be added while this exam is in draft status.</p>}
        </article>)}
        {!!matches?.length && <details className="pdf-matches"><summary>Matching passages ({matches.length})</summary>
            {matches.map(chunk => <div className="pdf-match" key={chunk.page + '-' + chunk.number}>
                <Button secondary onClick={() => openPage(chunk.page)}>Page {chunk.page} · Passage {chunk.number}</Button>
                <p style={{ overflowWrap: 'anywhere' }}>{chunk.text}</p>
            </div>)}
        </details>}
    </section>;
}

function SourcePage({ url, page, pageCount, changePage }) {
    const { data, loading, error } = useLoad(url);
    return <section className="pdf-page">
        <div className="pdf-pagination">
            <button type="button" aria-label="Previous page" title="Previous page" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={20} /></button>
            <strong>Page {page} of {pageCount}</strong>
            <button type="button" aria-label="Next page" title="Next page" disabled={page >= pageCount} onClick={() => changePage(page + 1)}><ChevronRight size={20} /></button>
        </div>
        <Notice message={error} />
        {loading ? <p>Reading page…</p> : !error && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {data.text || 'No selectable text on this page. It may be blank or scanned.'}
        </p>}
        {!loading && !error && data.chunks?.length > 0 && (
            <details>
                <summary>View passages ({data.chunks.length})</summary>
                {data.chunks.map(chunk => (
                    <section key={chunk.number}>
                        <strong>Page {chunk.page} · Passage {chunk.number}</strong>
                        <p style={{ overflowWrap: 'anywhere' }}>{chunk.text}</p>
                    </section>
                ))}
            </details>
        )}
    </section>;
}

function ExamSources({ examId, editable }) {
    const url = `/exams/${examId}/sources`;
    const [revision, setRevision] = useState(0);
    const { data, error, loading } = useLoad(url, revision);
    const [sending, setSending] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [message, setMessage] = useState('');

    const [selected, setSelected] = useState(null);
    const [page, setPage] = useState(1);

    async function upload(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const file = form.elements.pdf.files[0];
        setMessage('');
        setUploadError('');
        if (!file || !file.name.toLowerCase().endsWith('.pdf') || !file.size) {
            setUploadError('Choose a non-empty PDF file.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setUploadError('Choose a PDF of 20 MB or less.');
            return;
        }
        const body = new FormData();
        body.append('file', file);
        setSending(true);
        try {
            const response = await api.post(url, body);
            setMessage(response.status === 201 ? 'PDF uploaded.' : 'This PDF already exists for this exam.');
            form.reset();
            setRevision(value => value + 1);
        } catch (err) {
            setUploadError(errorMessage(err));
        } finally {
            setSending(false);
        }
    }

    return <>
        <Panel title="Upload a source PDF" sub="Maximum file size is 20 MB.">
            <form className="form-grid" onSubmit={upload}>
                <label className="span-2">PDF file
                    <input name="pdf" type="file" accept=".pdf,application/pdf" required disabled={sending}
                        onChange={() => { setUploadError(''); setMessage(''); }} />
                </label>
                <div><button className="btn primary" disabled={sending}>{sending ? 'Uploading…' : 'Upload PDF'}</button></div>
            </form>
            <Notice message={uploadError} /><Notice message={message} type="success" />
        </Panel>
        <Panel title="Uploaded sources">
            <Notice message={error} />
            {loading ? <p>Loading sources…</p> : !error && <Table headers={['File', 'Pages', 'Status', 'Text']}
                rows={data.map(source => [source.filename, source.page_count, source.status,
                <Button secondary onClick={() => { setSelected(source); setPage(1); }}>Preview text</Button>])}
                empty="No PDFs uploaded for this exam yet." />}
        </Panel>
        {selected && <div className="pdf-workspace"><Panel title={selected.filename}>
            <PassageSearch examId={examId} editable={editable} key={selected.id} url={url + '/' + selected.id} openPage={setPage} />
            <SourcePage key={selected.id + '-' + page} url={url + '/' + selected.id + '/pages/' + page}
                page={page} pageCount={selected.page_count} changePage={setPage} />
        </Panel></div>}
    </>;
}

function Invitations({ user, refresh, update }) {
    const { data, loading, error } = useLoad('/invitations', refresh);
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);
    const canRespond = user.role === 'examiner';

    async function respond(invitation, decision) {
        if (busyId !== null) return;
        setBusyId(invitation.id);
        setNotice(null);
        try {
            const { data: response } = await api.post(
                `/invitations/${invitation.id}/response`, { decision }
            );
            const accepted = response.status === 'ACCEPTED';
            setNotice({
                type: 'success',
                message: accepted
                    ? `You accepted ${invitation.exam}. It is now in Exams.`
                    : `You declined ${invitation.exam}.`,
            });
        } catch (err) {
            setNotice({ type: 'error', message: errorMessage(err) });
        } finally {
            setBusyId(null);
            update();
        }
    }

    const headers = ['Exam', ...(canRespond ? [] : ['Examiner']), 'Starts', 'Ends', 'Status'];
    if (canRespond) headers.push('Response');
    const rows = data.map(invitation => {
        const status = invitation.status;
        const tone = status === 'PENDING' ? 'orange' : status === 'ACCEPTED' ? 'green' : 'gray';
        const row = [
            <strong>{invitation.exam}</strong>,
            ...(canRespond ? [] : [invitation.examiner]),
            date(invitation.starts_at), date(invitation.ends_at), <Chip tone={tone}>{status}</Chip>,
        ];
        if (canRespond) {
            const disabled = busyId !== null || loading || Boolean(error);
            row.push(status === 'PENDING' ?
                <div className="inline-actions">
                    <Button disabled={disabled} onClick={() => respond(invitation, 'accept')}>Accept</Button>
                    <Button secondary disabled={disabled} onClick={() => respond(invitation, 'decline')}>Decline</Button>
                </div> : '—');
        }
        return row;
    });

    return <Panel title={canRespond ? 'Your invitations' : 'Examiner invitations'}
        sub="Times are shown in your local timezone."
        action={<Button secondary disabled={loading || busyId !== null} onClick={update}>Refresh</Button>}>
        {notice && <div role="status"><Notice {...notice} /></div>}
        <Notice message={error} />
        {loading ? <p className="muted">Loading invitations…</p> :
            !error && <Table headers={headers} rows={rows} empty="No invitations yet." />}
    </Panel>;
}

function ExamInviteForm({ exam, examiners, usersError, refresh, onClose }) {
    const availability = useLoad('/availability', refresh);
    const [examinerId, setExaminerId] = useState('');
    const [localStart, setLocalStart] = useState('');
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState(null);
    const [sending, setSending] = useState(false);
    const durationMs = exam.duration_minutes * 60_000;
    const windows = availability.data.filter(window =>
        String(window.examiner_id) === examinerId &&
        Date.parse(window.ends_at) - Math.max(Date.now(), Date.parse(window.starts_at)) >= durationMs
    ).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

    async function send(event) {
        event.preventDefault();
        if (sending || receipt) return;
        setError('');
        const start = new Date(localStart);
        if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
            setError('Choose a future start time.');
            return;
        }
        const end = start.getTime() + durationMs;
        if (!windows.some(window =>
            Date.parse(window.starts_at) <= start.getTime() && end <= Date.parse(window.ends_at)
        )) {
            setError('Choose a start time that fits the full exam inside one availability window.');
            return;
        }
        setSending(true);
        try {
            const response = await api.post(`/exams/${exam.id}/invitations`, {
                examiner_id: Number(examinerId),
                starts_at: start.toISOString(),
            });
            setReceipt(response.data);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSending(false);
        }
    }

    return <Panel title={`Invite examiner · ${exam.title}`}
        sub={`${exam.duration_minutes} minutes · Times shown in your local timezone`}
        action={<Button secondary disabled={sending} onClick={onClose}>Close</Button>}>
        {receipt ? <div role="status"><Notice type="success"
            message={`Invitation #${receipt.id} sent · ${receipt.status}. Proposed start: ${date(receipt.starts_at)}.`} /></div> :
            <form className="form-grid" onSubmit={send}>
                <label>Examiner
                    <select autoFocus required value={examinerId} disabled={sending} onChange={e => {
                        setExaminerId(e.target.value); setLocalStart(''); setError('');
                    }}>
                        <option value="">Select examiner</option>
                        {examiners.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                </label>
                <label>Proposed start
                    <input required type="datetime-local" value={localStart} disabled={sending}
                        onChange={e => { setLocalStart(e.target.value); setError(''); }} />
                </label>
                <div className="span-2">
                    <Notice message={usersError || availability.error || error} />
                    {examinerId && !availability.error && (availability.loading ?
                        <p>Loading availability…</p> : windows.length ?
                            <ul>{windows.map(window => <li key={window.id}>
                                {date(window.starts_at)} – {date(window.ends_at)}
                            </li>)}</ul> :
                            <p>No availability window fits this exam. The examiner can add one under Availability.</p>)}
                    <button className="btn primary" type="submit"
                        disabled={sending || availability.loading || Boolean(availability.error || usersError) || !windows.length}>
                        {sending ? 'Sending…' : 'Send invitation'}
                    </button>
                </div>
            </form>}
    </Panel>;
}

function ExamSchedule({ slots }) {
    if (!slots?.length) return <span className="muted">Not scheduled</span>;
    return <div>{slots.map((slot, index) =>
        <div key={index}>{date(slot.starts_at)} → {date(slot.ends_at)}</div>
    )}</div>;
}

function EditExam({ exam, courses, users, close, onSaved }) {
    const fields = [
        { name: 'title', label: 'Exam title', default: exam.title, wide: true },
        {
            name: 'course_id', label: 'Course', type: 'select', default: exam.course_id,
            options: courses.map(course => ({ value: course.id, label: course.title }))
        },
        {
            name: 'examiner_id', label: 'Examiner', type: 'select', required: false, placeholder: 'Unassigned',
            default: exam.examiner_id ?? '', options: users.filter(user => user.role === 'examiner')
                .map(user => ({ value: user.id, label: user.name }))
        },
        { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', min: 1, default: exam.duration_minutes },
        { name: 'total_marks', label: 'Total marks', type: 'number', min: 1, default: exam.total_marks },
    ];
    async function save(form) {
        const changes = {};
        for (const field of fields) {
            const key = field.name;
            const value = key === 'title' ? form[key].trim() : form[key] === '' ? null : Number(form[key]);
            if (value !== exam[key]) changes[key] = value;
        }
        if (Object.keys(changes).length) await api.patch('/exams/' + exam.id, changes);
    }
    return <div className="modal-cover"><div className="modal" role="dialog" aria-label="Edit exam">
        <Panel title={'Edit exam · ' + exam.title} action={<Button secondary onClick={close}>Cancel</Button>}>
            <ActionForm fields={fields} submit="Save changes" onSave={save} onDone={onSaved} />
        </Panel>
    </div></div>;
}

function Exams({ user, refresh, update }) { const { data, error } = useLoad('/exams', refresh), { data: courses } = useLoad('/courses', refresh), { data: users, error: usersError } = useLoad(user.role === 'admin' ? '/users' : '/auth/me', refresh); const [editing, setEditing] = useState(null); const [inviteId, setInviteId] = useState(null); const inviteExam = data.find(x => x.id === inviteId && x.status === 'draft' && x.examiner_id == null); const [message, setMessage] = useState(''); async function setStatus(id, status) { try { await api.patch(`/exams/${id}/status`, { status }); setMessage('Status updated'); update() } catch (e) { setMessage(errorMessage(e)) } } return <><Notice message={error} /><Notice message={message} type={message === 'Status updated' ? 'success' : 'error'} />{user.role === 'admin' && <Panel title="Create examination" sub="Choose a course. You can save the draft with the examiner unassigned."><ActionForm fields={[{ name: 'title', label: 'Exam title', wide: true, placeholder: 'Midterm Assessment' }, { name: 'course_id', label: 'Course', type: 'select', options: courses.map(x => ({ value: x.id, label: `${x.code} — ${x.title}` })) }, { name: 'examiner_id', label: 'Examiner (optional)', type: 'select', required: false, placeholder: 'Unassigned', options: (Array.isArray(users) ? users : []).filter(x => x.role === 'examiner').map(x => ({ value: x.id, label: x.name })) }, { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', default: 60, min: 1 }, { name: 'total_marks', label: 'Total marks', type: 'number', default: 100, min: 1 }]} submit="Save draft" onSave={d => api.post('/exams', { ...d, examiner_id: d.examiner_id || null })} onDone={update} /></Panel>}<Panel title={user.role === 'student' ? 'Exams in your enrolled courses' : 'Examination list'} sub={`${data.length} exams found`}><Table headers={['Title', 'Course', 'Examiner', 'Duration', 'Start → end (local time)', 'Status', ...(user.role === 'admin' ? ['Actions'] : [])]} rows={data.map(x => [<strong>{x.title}</strong>, x.course, x.examiner ?? 'Unassigned', `${x.duration_minutes} min`, <ExamSchedule slots={x.slots} />, <Chip tone={x.status === 'published' ? 'green' : x.status === 'draft' ? 'orange' : 'gray'}>{x.status}</Chip>, ...(user.role === 'admin' ? [<div className="inline-actions"><Button secondary onClick={() => { setEditing(x); setInviteId(null) }}>Edit</Button>{x.status === 'draft' && x.examiner_id == null && <Button onClick={() => setInviteId(x.id)}>Invite examiner</Button>}{x.examiner_id != null && x.status !== 'published' && <Button onClick={() => setStatus(x.id, 'published')}>Publish</Button>}{x.status === 'published' && <Button secondary onClick={() => setStatus(x.id, 'closed')}>Close</Button>}{x.status === 'closed' && <Button secondary onClick={() => setStatus(x.id, 'draft')}>Reopen draft</Button>}</div>] : [])])} /></Panel>{user.role === 'admin' && editing && <EditExam key={editing.id} exam={editing} courses={courses} users={users} close={() => setEditing(null)} onSaved={() => { setEditing(null); update() }} />}{user.role === 'admin' && inviteExam && <ExamInviteForm key={inviteId} exam={inviteExam} examiners={users.filter(x => x.role === 'examiner')} usersError={usersError} refresh={refresh} onClose={() => setInviteId(null)} />}</> }
function Availability({ refresh, update }) { const { data, error } = useLoad('/availability', refresh); return <><Notice message={error} /><Panel title="Set available hours" sub="Times are entered in your local timezone"><ActionForm fields={[{ name: 'starts_at', label: 'Available from', type: 'datetime-local' }, { name: 'ends_at', label: 'Available until', type: 'datetime-local' }]} onSave={d => api.post('/availability', { starts_at: new Date(d.starts_at).toISOString(), ends_at: new Date(d.ends_at).toISOString() })} onDone={update} /></Panel><Panel title="Availability windows"><Table headers={['Start', 'End']} rows={data.map(x => [date(x.starts_at), date(x.ends_at)])} /></Panel></> }
function Slots({ user, refresh, update }) { const { data, error } = useLoad('/slots', refresh), { data: exams } = useLoad('/exams', refresh); const [message, setMessage] = useState(''); async function book(id) { try { await api.post('/bookings', { slot_id: id }); setMessage('Slot booked successfully'); update() } catch (e) { setMessage(errorMessage(e)) } } return <><Notice message={error} /><Notice message={message} type={message === 'Slot booked successfully' ? 'success' : 'error'} />{user.role === 'admin' && <Panel title="Schedule an exam slot" sub="Create a date and capacity for an examination"><ActionForm fields={[{ name: 'exam_id', label: 'Examination', type: 'select', options: exams.filter(exam => exam.examiner_id != null).map(x => ({ value: x.id, label: x.title })) }, { name: 'starts_at', label: 'Starts at', type: 'datetime-local' }, { name: 'capacity', label: 'Student capacity', type: 'number', default: 30, min: 1 }]} onSave={d => api.post('/slots', { ...d, starts_at: new Date(d.starts_at).toISOString() })} onDone={update} /></Panel>}<Panel title={user.role === 'student' ? 'Book an examination slot' : 'Scheduled slots'} sub="All times displayed in your local timezone"><Table headers={['Exam', 'Start date', 'Capacity', 'Booked', 'Available', ...(user.role === 'student' ? ['Action'] : [])]} rows={data.map(s => [<strong>{s.exam}</strong>, date(s.starts_at), s.capacity, s.booked, <Chip tone={s.available ? 'green' : 'orange'}>{s.available} left</Chip>, ...(user.role === 'student' ? [<Button disabled={!s.available} onClick={() => book(s.id)}>Book slot</Button>] : [])])} /></Panel></> }
function Bookings({ user, refresh }) { const { data, error } = useLoad('/bookings', refresh); const [working, setWorking] = useState(null), [questions, setQuestions] = useState([]), [answers, setAnswers] = useState({}), [message, setMessage] = useState(''); const [done, setDone] = useState(new Set()); async function openAttempt(b) { setMessage(''); try { const { data } = await api.get(`/exams/${b.exam_id}/questions`); setQuestions(data); setWorking(b); setAnswers({}) } catch (e) { setMessage(errorMessage(e)) } } async function submit() { try { const { data } = await api.post(`/bookings/${working.id}/submit`, { answers }); setMessage(`Submitted successfully: ${data.score}/${data.max_score} marks`); setDone(old => new Set([...old, working.id])); setWorking(null) } catch (e) { setMessage(errorMessage(e)) } } return <><Notice message={error} /><Notice message={message} type={message.startsWith('Submitted') ? 'success' : 'error'} /><Panel title={user.role === 'student' ? 'Your exam bookings' : 'Student bookings'} sub="Exam attempts are unlocked only during your scheduled time"><Table headers={['Exam', 'Student', 'Start time', ...(user.role === 'student' ? ['Action'] : [])]} rows={data.map(b => [<strong>{b.exam}</strong>, b.student, date(b.starts_at), ...(user.role === 'student' ? [<Button disabled={done.has(b.id)} onClick={() => openAttempt(b)}>{done.has(b.id) ? 'Completed' : 'Attempt exam'}</Button>] : [])])} /></Panel>{working && <div className="modal-cover"><div className="modal"><div className="panel-head"><div><h3>{working.exam}</h3><p>Choose the correct option for each question</p></div><button className="icon-btn" onClick={() => setWorking(null)}>✕</button></div>{questions.map((q, i) => <div className="question" key={q.id}><strong>{i + 1}. {q.prompt} <small>({q.marks} marks)</small></strong>{q.options.map((opt, index) => <label key={index} className="option"><input type="radio" name={`q${q.id}`} checked={answers[q.id] === index} onChange={() => setAnswers({ ...answers, [q.id]: index })} />{opt}</label>)}</div>)}<button className="btn primary wide" onClick={submit}>Submit answers <ArrowRight size={17} /></button></div></div>}</> }
function Questions({ refresh, update }) {
    const { data: exams, error } = useLoad('/exams', refresh);
    const [selected, setSelected] = useState('');
    const exam = exams.find(item => String(item.id) === selected);
    return <>
        <Panel title="Question bank" sub="Select your assigned exam to manage its questions">
            <Notice message={error} />
            <label className="select-alone">Examination
                <select value={selected} onChange={event => setSelected(event.target.value)}>
                    <option value="">Select an examination</option>
                    {exams.map(item => <option key={item.id} value={item.id}>{item.title} ({item.status})</option>)}
                </select>
            </label>
        </Panel>
        {exam && <ExamQuestionList key={exam.id} exam={exam} refresh={refresh} update={update} />}
    </>;
}

function ExamQuestionList({ exam, refresh, update }) {
    const selected = exam.id;
    const { data: questions, loading, error } = useLoad(`/exams/${selected}/questions`, refresh);
    return <>
        {exam?.status === 'draft' && <Panel title="Add multiple-choice question"><ActionForm fields={[{ name: 'prompt', label: 'Question', wide: true, placeholder: 'Enter your question' }, { name: 'option_1', label: 'Option A' }, { name: 'option_2', label: 'Option B' }, { name: 'option_3', label: 'Option C' }, { name: 'option_4', label: 'Option D' }, { name: 'correct_index', label: 'Correct option', type: 'select', options: [0, 1, 2, 3].map(i => ({ value: String(i), label: `Option ${'ABCD'[i]}` })) }, { name: 'marks', label: 'Marks', type: 'number', min: 1, default: 5 }]} onSave={d => api.post(`/exams/${selected}/questions`, { prompt: d.prompt, options: [d.option_1, d.option_2, d.option_3, d.option_4], correct_index: Number(d.correct_index), marks: Number(d.marks) })} onDone={update} /></Panel>}
        <Panel title="Current questions">
            <Notice message={error} />
            {loading ? <p>Loading questions…</p> : !error && <Table
                headers={['Question', 'Options', 'Correct', 'Marks']}
                rows={questions.map(q => [q.prompt, Array.isArray(q.options) ? q.options.join(' / ') : '—',
                'Option ' + 'ABCDEF'[q.correct_index], q.marks])} />}
        </Panel>
    </>;
}
function Results({ refresh }) { const { data, error } = useLoad('/results', refresh); return <><Notice message={error} /><Panel title="Examination results" sub="Scores are calculated automatically for multiple-choice exams"><Table headers={['Examination', 'Score', 'Maximum', 'Percentage', 'Submitted at']} rows={data.map(r => [<strong>{r.exam}</strong>, <strong>{r.score}</strong>, r.max_score, <Chip tone={r.max_score && r.score / r.max_score >= .5 ? 'green' : 'orange'}>{r.max_score ? Math.round(r.score / r.max_score * 100) : 0}%</Chip>, date(r.submitted_at)])} /></Panel></> }
export default App;



