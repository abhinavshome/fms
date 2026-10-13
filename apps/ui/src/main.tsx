import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './styles.css';

type Health = { status: string; database: string };
type User = { id: number; name?: string; email: string };
type Sop = {
  id: number; code: string; name: string; objective: string; scope: string;
  responsibility: string; updated: string; status: 'Published' | 'Draft';
  sections: { title: string; steps: string[] }[];
};
type SopCreatePayload = { title: string; objective: string; scope: string; responsibilityIds: number[]; accountabilityId: number; sections: { label: string; steps: string[] }[] };

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const initialSops: Sop[] = [
  {
    id: 112, code: 'SOP-112', name: 'Entry / Exit Procedure',
    objective: 'To lay down the procedure for describing the entry and exit procedure to the Quality Control department.',
    scope: 'This SOP is applicable for entry and exit procedure to Quality Control department at Capsoft Healthcare Pvt. Ltd. Baddi.',
    responsibility: 'Analyst and Q.C. Manager', updated: '18 Sep 2024', status: 'Published',
    sections: [
      { title: 'Department opening & closing', steps: ['When you come to the factory collect the key from security.', 'Open the main door of the laboratory.', 'Follow the procedure for gowning as per pictorial display at the change room.', 'No any single person comes at Laboratory for working of any day.', 'At the time of shift finish ensure all power supply is switched off except AC, incubators and running instruments.', 'Lock the main gate of laboratory and deposit the key at Security.'] },
      { title: 'Gowning procedure for entry in Quality Control department', steps: ['Open the door of change room and enter.', 'Remove street shoes and keep on respective racks. In case of visitors collect shoe covers.', 'Sit on the crossover bench and lift the right feet then lift the left feet and cross the crossover bench.', 'After cross the crossover bench, wear company slippers.', 'Collect the apron from Almirah and wear it.', 'Ensure that gowning is properly done.', 'Sanitize the hands with 70% Isopropyl alcohol then enter into the Quality Control department.'] },
      { title: 'De-gowning procedure to exit from Quality Control department', steps: ['Open the door of change room and enter.', 'Remove the apron and keep at provided Almirah then remove company slippers.', 'Sit on the crossover bench and lift the right feet then lift the left feet and cross over bench.', 'After cross the crossover bench wear the street shoes.', 'After completion of de-gowning go outside from change room.'] }
    ]
  },
  { id: 108, code: 'SOP-108', name: 'Cleaning and Sanitation of Equipment', objective: 'To define the standard method for cleaning and sanitizing production equipment.', scope: 'Applicable to all equipment used in the manufacturing and quality control areas.', responsibility: 'Production Supervisor', updated: '12 Sep 2024', status: 'Published', sections: [{ title: 'Procedure', steps: ['Switch off and isolate the equipment.', 'Remove visible residue using the approved tools.', 'Clean all contact surfaces with the approved cleaning agent.', 'Record completion in the equipment logbook.'] }] },
  { id: 104, code: 'SOP-104', name: 'Document Control and Records', objective: 'To maintain consistent control of controlled documents and records.', scope: 'Applies to all departments creating or using controlled documents.', responsibility: 'QA Manager', updated: '05 Sep 2024', status: 'Draft', sections: [{ title: 'Document issue and review', steps: ['Assign a unique document number.', 'Review the document with the accountable department.', 'Publish only the approved revision.', 'Archive superseded versions.'] }] }
];

function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sops, setSops] = useState(initialSops);
  const navigate = useNavigate();
  const location = useLocation();
  const routeId = Number(location.pathname.match(/^\/sops\/(\d+)/)?.[1] ?? 0);
  const selectedId = routeId || (location.pathname === '/sops' || location.pathname === '/dashboard' ? 112 : 0);

  useEffect(() => {
    Promise.all([
      fetch(`${apiUrl}/api/health`).then((response) => response.json()),
      fetch(`${apiUrl}/api/users/me`, { credentials: 'include' }).then((response) => response.ok ? response.json() : null)
    ]).then(([healthBody, sessionBody]) => {
      setHealth(healthBody); setUser(sessionBody?.user ?? null);
    }).catch(() => setError('The API is unavailable. Start the API and try again.')).finally(() => setLoading(false));
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const response = await fetch(`${apiUrl}/api/users/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Unable to sign in.');
      setUser(body.user); setPassword('');
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.'); } finally { setSubmitting(false); }
  }

  async function logout() {
    await fetch(`${apiUrl}/api/users/logout`, { method: 'POST', credentials: 'include' }); setUser(null);
  }

  function openSop(id: number, nextView: 'detail' | 'edit' = 'detail') { navigate(`/sops/${id}${nextView === 'edit' ? '/edit' : ''}`); }
  function deleteSop(id: number) {
    if (!window.confirm('Delete this SOP? This action cannot be undone.')) return;
    setSops((current) => current.filter((sop) => sop.id !== id)); navigate('/sops');
  }
  async function saveSop(payload: SopCreatePayload) {
    setError('');
    if (selectedId === 0) {
      setSubmitting(true);
      try {
        const response = await fetch(`${apiUrl}/api/sops`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? (typeof body === 'string' ? body : 'Unable to create SOP.'));
        const newId = Number(body.id);
        if (!Number.isFinite(newId)) throw new Error('The SOP was created, but the API did not return its ID.');
        const created: Sop = { id: newId, code: `SOP-${newId}`, name: payload.title, objective: payload.objective, scope: payload.scope, responsibility: `Role IDs: ${payload.responsibilityIds.join(', ') || 'None'}`, updated: 'Just now', status: 'Draft', sections: payload.sections.map(({ label, steps }) => ({ title: label, steps })) };
        setSops((items) => [created, ...items]); navigate(`/sops/${newId}`);
      } catch (createError) { setError(createError instanceof Error ? createError.message : 'Unable to create SOP.'); }
      finally { setSubmitting(false); }
    } else {
      const details = { name: payload.title, objective: payload.objective, scope: payload.scope, responsibility: `Role IDs: ${payload.responsibilityIds.join(', ') || 'None'}`, sections: payload.sections.map(({ label, steps }) => ({ title: label, steps })) };
      setSops((items) => items.map((sop) => sop.id === selectedId ? { ...sop, ...details, updated: 'Just now' } : sop));
      navigate(`/sops/${selectedId}`);
    }
  }

  const online = health?.status === 'ok' && health.database === 'connected';
  if (loading) return <main className="loading-screen"><span className="brand-mark">F</span><p>Loading your workspace...</p></main>;
  const selected = sops.find((sop) => sop.id === selectedId) ?? sops[0];
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/sops" replace /> : <LoginPage email={email} password={password} error={error} submitting={submitting} online={online} onEmailChange={setEmail} onPasswordChange={setPassword} onLogin={login} />} />
    <Route element={user ? <WorkspaceLayout user={user} online={online} sops={sops} onLogout={logout} /> : <Navigate to="/login" replace />}>
      <Route index element={<Navigate to="/sops" replace />} />
      <Route path="dashboard" element={<Dashboard sops={sops} onOpen={(id) => openSop(id)} />} />
      <Route path="sops" element={<SopList sops={sops} onOpen={openSop} onDelete={deleteSop} />} />
      <Route path="sops/new" element={<SopEditor onSave={saveSop} onCancel={() => navigate('/sops')} error={error} submitting={submitting} />} />
      <Route path="sops/:id" element={selected ? <SopDetail sop={selected} onEdit={() => navigate(`/sops/${selected.id}/edit`)} onBack={() => navigate('/sops')} /> : <Navigate to="/sops" replace />} />
      <Route path="sops/:id/edit" element={<SopEditor sop={selected} onSave={saveSop} onCancel={() => navigate(`/sops/${selectedId}`)} error={error} submitting={submitting} />} />
    </Route>
    <Route path="*" element={<Navigate to={user ? '/sops' : '/login'} replace />} />
  </Routes>;
}

function LoginPage({ email, password, error, submitting, online, onEmailChange, onPasswordChange, onLogin }: { email: string; password: string; error: string; submitting: boolean; online: boolean; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onLogin: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <main className="auth-page"><div className="auth-brand"><span className="brand-mark">F</span><span>FMS / CONTROL PLANE</span></div><section className="auth-layout"><div className="intro"><p className="kicker">WELCOME BACK</p><h1>Keep every procedure within reach.</h1><p className="lede">A focused workspace for the documents, responsibilities, and decisions that keep your operation moving.</p><div className="health-line"><span className={`health-dot ${online ? 'online' : ''}`} />{online ? 'Systems nominal' : 'API unavailable'}</div></div><form className="login" onSubmit={onLogin}><p className="kicker">SIGN IN</p><h2>Enter the control plane.</h2><label>Email<input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="form-error">{error}</p>}<button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'} <span>→</span></button></form></section></main>;
}

function WorkspaceLayout({ user, online, sops, onLogout }: { user: User; online: boolean; sops: Sop[]; onLogout: () => void }) {
  const location = useLocation(); const navigate = useNavigate();
  const isDashboard = location.pathname === '/dashboard'; const isList = location.pathname === '/sops';
  const isEditor = location.pathname === '/sops/new' || location.pathname.endsWith('/edit');
  const id = Number(location.pathname.match(/^\/sops\/(\d+)/)?.[1] ?? 0);
  const selected = sops.find((sop) => sop.id === id);
  const pageTitle = isDashboard ? 'Overview' : isList ? 'SOP library' : isEditor ? (location.pathname === '/sops/new' ? 'Create SOP' : 'Edit SOP') : selected?.name ?? 'SOP';
  return <div className="app-shell"><aside className="sidebar"><div className="side-brand"><span className="brand-mark">F</span><div><strong>FMS</strong><small>Operations workspace</small></div></div><nav><p className="nav-label">WORKSPACE</p><Link className={isDashboard ? 'nav-item active' : 'nav-item'} to="/dashboard"><span>◈</span>Overview</Link><Link className={!isDashboard ? 'nav-item active' : 'nav-item'} to="/sops"><span>▤</span>SOP library <b>{sops.length}</b></Link><p className="nav-label nav-gap">MANAGE</p><button className="nav-item" onClick={() => navigate('/sops')}><span>◫</span>Departments</button><button className="nav-item" onClick={() => navigate('/sops')}><span>◌</span>Responsibilities</button></nav><div className="sidebar-foot"><div className="mini-avatar">{user.email[0].toUpperCase()}</div><div><strong>{user.name ?? user.email.split('@')[0]}</strong><small>{user.email}</small></div><button className="logout-icon" title="Log out" onClick={onLogout}>↗</button></div></aside><main className="workspace"><header className="workspace-header"><div><span className="breadcrumb">FMS / {isDashboard ? 'OVERVIEW' : 'SOP LIBRARY'}</span><h1>{pageTitle}</h1></div><div className="header-actions"><span className="system-status"><span className={`health-dot ${online ? 'online' : ''}`} />{online ? 'Connected' : 'Offline'}</span>{isList && <Link className="primary-button" to="/sops/new">+ New SOP</Link>}</div></header><Outlet /></main></div>;
}

function Dashboard({ sops, onOpen }: { sops: Sop[]; onOpen: (id: number) => void }) { return <section className="dashboard-view"><div className="welcome-band"><div><p className="kicker">MONDAY, 23 SEPTEMBER 2024</p><h2>Good morning.</h2><p>Here is what needs your attention across the workspace.</p></div><span className="welcome-number">03</span></div><div className="metric-grid"><div><span>Total SOPs</span><strong>{sops.length}</strong><small>in your library</small></div><div><span>Published</span><strong>{sops.filter((sop) => sop.status === 'Published').length}</strong><small>ready for use</small></div><div><span>Needs review</span><strong>{sops.filter((sop) => sop.status === 'Draft').length}</strong><small>draft documents</small></div></div><div className="section-heading"><div><p className="kicker">RECENT DOCUMENTS</p><h2>Pick up where you left off</h2></div><button className="text-button" onClick={() => onOpen(sops[0].id)}>View library →</button></div><div className="recent-list">{sops.slice(0, 3).map((sop) => <button key={sop.id} onClick={() => onOpen(sop.id)}><span className="doc-icon">SOP</span><span><strong>{sop.name}</strong><small>{sop.code} · Updated {sop.updated}</small></span><span className="arrow">→</span></button>)}</div></section>; }

function SopList({ sops, onOpen, onDelete }: { sops: Sop[]; onOpen: (id: number) => void; onDelete: (id: number) => void }) { return <section className="list-view"><div className="list-intro"><p>CONTROLLED DOCUMENTS</p><h2>Standard operating procedures</h2><span>{sops.length} documents in your library</span></div><div className="toolbar"><label className="search-field"><span>⌕</span><input placeholder="Search SOPs" /></label><button className="filter-button">All statuses⌄</button></div><div className="sop-table"><div className="table-head"><span>DOCUMENT</span><span>RESPONSIBILITY</span><span>LAST UPDATED</span><span>STATUS</span><span /></div>{sops.map((sop) => <div className="sop-row" key={sop.id}><button className="document-cell" onClick={() => onOpen(sop.id)}><span className="doc-icon">SOP</span><span><strong>{sop.name}</strong><small>{sop.code}</small></span></button><span>{sop.responsibility}</span><span>{sop.updated}</span><span><em className={sop.status === 'Draft' ? 'status-pill draft' : 'status-pill'}>{sop.status}</em></span><button className="delete-button" title={`Delete ${sop.name}`} onClick={() => onDelete(sop.id)}>×</button></div>)}</div></section>; }

function SopDetail({ sop, onEdit, onBack }: { sop: Sop; onEdit: () => void; onBack: () => void }) { return <section className="detail-view"><button className="back-button" onClick={onBack}>← Back to library</button><div className="document-paper"><div className="document-heading"><div><span className="document-code">{sop.code} · {sop.status.toUpperCase()}</span><h2>{sop.name}</h2></div><button className="outline-button" onClick={onEdit}>Edit SOP <span>↗</span></button></div><div className="document-meta"><div><b>OBJECTIVE</b><p>{sop.objective}</p></div><div><b>SCOPE</b><p>{sop.scope}</p></div><div><b>RESPONSIBILITIES</b><p>{sop.responsibility}</p></div></div><div className="procedure"><b>PROCEDURE</b><p>Follow the steps below in the order shown. All deviations must be reported to the accountable role.</p>{sop.sections.map((section, index) => <div className="procedure-section" key={section.title}><h3>{index + 1}. {section.title}</h3><ol>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>)}</div><footer className="document-footer"><span>Controlled copy · FMS document management</span><span>Last updated {sop.updated}</span></footer></div></section>; }

function SopEditor({ sop, onSave, onCancel, error, submitting }: { sop?: Sop; onSave: (payload: SopCreatePayload) => void; onCancel: () => void; error: string; submitting: boolean }) {
  const [sections, setSections] = useState(() => sop?.sections.map((section) => ({ label: section.title, steps: [...section.steps] })) ?? [{ label: '', steps: [''] }]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const responsibilityIds = String(form.get('responsibilityIds') ?? '').split(',').map((id) => id.trim()).filter(Boolean).map(Number);
    onSave({ title: String(form.get('title')).trim(), objective: String(form.get('objective')).trim(), scope: String(form.get('scope')).trim(), accountabilityId: Number(form.get('accountabilityId')), responsibilityIds, sections: sections.map((section, i) => ({ label: String(form.get(`section-${i}`)).trim(), steps: section.steps.map((_, j) => String(form.get(`step-${i}-${j}`)).trim()).filter(Boolean) })) });
  }
  return <section className="editor-view"><button className="back-button" onClick={onCancel}>← {sop ? 'Back to document' : 'Cancel'}</button><div className="editor-heading"><div><span className="document-code">{sop ? 'EDIT DOCUMENT' : 'NEW DOCUMENT'}</span><h2>{sop ? 'Edit SOP' : 'Create SOP'}</h2><p>Complete document details, roles, and procedure steps.</p></div><span className="draft-label">DRAFT</span></div><form className="sop-form" onSubmit={submit}><div className="form-section"><span className="form-section-number">01</span><div><h3>Document details</h3><p>Identify the procedure and define where it applies.</p></div></div><label>Title<input name="title" defaultValue={sop?.name} placeholder="e.g. Entry/Exit SOP" required /></label><label>Accountability role ID<input name="accountabilityId" type="number" min="1" defaultValue="" placeholder="e.g. 4" required /></label><label>Responsibility role IDs<input name="responsibilityIds" defaultValue="" placeholder="e.g. 2, 3" /><small>Enter one or more role IDs separated by commas.</small></label><label>Objective<textarea name="objective" defaultValue={sop?.objective} rows={3} required /></label><label>Scope<textarea name="scope" defaultValue={sop?.scope} rows={3} required /></label><div className="form-section procedure-form-heading"><span className="form-section-number">02</span><div><h3>Procedure sections</h3><p>Add each section and its ordered steps.</p></div><button type="button" className="secondary-button" onClick={() => setSections((items) => [...items, { label: '', steps: [''] }])}>+ Add section</button></div>{sections.map((section, i) => <fieldset className="section-editor" key={i}><legend>Section {i + 1}</legend><button type="button" className="delete-button remove-section" aria-label={`Remove section ${i + 1}`} disabled={sections.length === 1} onClick={() => setSections((items) => items.filter((_, index) => index !== i))}>×</button><label>Section label<input name={`section-${i}`} defaultValue={section.label} placeholder="e.g. Department opening & closing" required /></label>{section.steps.map((step, j) => <label key={j}>Step {j + 1}<div className="step-input"><textarea name={`step-${i}-${j}`} defaultValue={step} rows={2} required placeholder="Describe this procedure step" /><button type="button" className="delete-button" aria-label={`Remove step ${j + 1}`} disabled={section.steps.length === 1} onClick={() => setSections((items) => items.map((item, index) => index === i ? { ...item, steps: item.steps.filter((_, stepIndex) => stepIndex !== j) } : item))}>×</button></div></label>)}<button type="button" className="text-button add-step" onClick={() => setSections((items) => items.map((item, index) => index === i ? { ...item, steps: [...item.steps, ''] } : item))}>+ Add step</button></fieldset>)}{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating...' : sop ? 'Save changes' : 'Create SOP'} <span>→</span></button></div></form></section>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
