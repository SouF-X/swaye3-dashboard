import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus, Search, X } from 'lucide-react';
import type { Course } from './model';
import './admin-surfaces.css';

type NoticeProps = { onNotice: (s: string) => void };
function useDialogKeys(open: boolean, close: () => void, dialogRef: React.RefObject<HTMLElement | null>) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    const focusable = () => root?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [];
    focusable()[0]?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = Array.from(focusable());
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === items[0] || !root?.contains(document.activeElement))) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !root?.contains(document.activeElement))) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('keydown', handle); previous?.focus(); };
  }, [open, dialogRef]);
}
const reports = ['Lesson Completion', 'Video Stats', 'Quiz Scores', 'Leaderboards', 'Open-ended questions'];
type ReportLearner = { id: string; label: string; enrolled: boolean; complete: number; total: number; rate: number };
type LocalReport = { learners: ReportLearner[]; breakdown: { segment: string; count: number; average: number }[]; buckets: { range: string; count: number }[] };

function readReportValue<T>(keys: string[], fallback: T): T {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch { /* Try the next known local key. */ }
  }
  return fallback;
}

function computeLocalReport(course?: Course): LocalReport {
  const rawCourseData = readReportValue<unknown>(['teachable-recreation-v1'], {});
  const courseData = rawCourseData && typeof rawCourseData === 'object' && !Array.isArray(rawCourseData) ? rawCourseData as { courses?: Course[] } : {};
  const courses = course ? [course] : (Array.isArray(courseData.courses) ? courseData.courses : []);
  const rawProgress = readReportValue<unknown>(['teachable-progress-v2'], {});
  const rawEnrollments = readReportValue<unknown>(['teachable-enrollments-v2'], {});
  const progress = rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress) ? rawProgress as Record<string, Record<string, string[]>> : {};
  const enrollments = rawEnrollments && typeof rawEnrollments === 'object' && !Array.isArray(rawEnrollments) ? rawEnrollments as Record<string, string[]> : {};
  const getStudentRows = (raw: unknown): unknown[] => Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { students?: unknown }).students) ? (raw as { students: unknown[] }).students : [];
  const studentRows = [
    ...getStudentRows(readReportValue<unknown>(['teachable-students-v1'], [])),
    ...getStudentRows(readReportValue<unknown>(['teachable-recreation-students-v1'], [])),
  ];
  const learnerTotals = new Map<string, { label: string; enrolled: boolean; complete: number; total: number }>();

  for (const item of courses) {
    if (!item || !Array.isArray(item.sections)) continue;
    const lessons = item.sections.flatMap(section => Array.isArray(section.lessons) ? section.lessons : []).filter(lesson => lesson.published);
    const lessonIds = new Set(lessons.map(lesson => lesson.id));
    const enrolledIds = new Set(Object.entries(enrollments).filter(([, ids]) => Array.isArray(ids) && ids.includes(item.id)).map(([id]) => id));
    for (const row of studentRows) {
      if (!row || typeof row !== 'object') continue;
      const record = row as Record<string, unknown>;
      const belongsToCourse = record.courseId === item.id || (!record.courseId && record.course === item.title);
      if (!belongsToCourse) continue;
      const id = [record.id, record.studentId, record.userId, record.email].find(value => typeof value === 'string' && value.trim()) as string | undefined;
      if (id) enrolledIds.add(id);
    }
    const progressIds = Object.entries(progress).filter(([, byCourse]) => Array.isArray(byCourse?.[item.id])).map(([id]) => id);
    const learnerIds = new Set([...enrolledIds, ...progressIds]);

    for (const id of learnerIds) {
      const saved = Array.isArray(progress[id]?.[item.id]) ? progress[id][item.id] : [];
      const complete = new Set(saved.filter(lessonId => lessonIds.has(lessonId))).size;
      const total = lessons.length;
      const student = studentRows.find((row) => {
        if (!row || typeof row !== 'object') return false;
        const record = row as Record<string, unknown>;
        return [record.id, record.studentId, record.userId, record.email].some(value => typeof value === 'string' && value === id);
      }) as Record<string, unknown> | undefined;
      const label = typeof student?.name === 'string' && student.name.trim() ? student.name : id === 'demo' ? 'Demo learner' : typeof student?.email === 'string' ? student.email : id;
      const existing = learnerTotals.get(id) ?? { label, enrolled: false, complete: 0, total: 0 };
      existing.enrolled ||= enrolledIds.has(id);
      existing.complete += complete;
      existing.total += total;
      learnerTotals.set(id, existing);
    }
  }

  const learners: ReportLearner[] = [...learnerTotals.entries()].map(([id, value]) => ({ ...value, id, rate: value.total ? Math.round(value.complete / value.total * 100) : 0 }));

  const summarize = (segment: string, learners: ReportLearner[]) => ({
    segment,
    count: learners.length,
    average: learners.length ? Math.round(learners.reduce((sum, learner) => sum + learner.rate, 0) / learners.length) : 0,
  });
  const measurable = learners.filter(learner => learner.total > 0);
  const breakdown = [
    summarize('All tracked learners', learners),
    summarize('Enrolled learners', learners.filter(learner => learner.enrolled)),
    summarize('Learners with lesson progress', learners.filter(learner => learner.complete > 0)),
  ];
  const buckets = [
    { range: '0%', count: measurable.filter(learner => learner.rate === 0).length },
    { range: '1%–25%', count: measurable.filter(learner => learner.rate >= 1 && learner.rate <= 25).length },
    { range: '26%–50%', count: measurable.filter(learner => learner.rate >= 26 && learner.rate <= 50).length },
    { range: '51%–75%', count: measurable.filter(learner => learner.rate >= 51 && learner.rate <= 75).length },
    { range: '76%–99%', count: measurable.filter(learner => learner.rate >= 76 && learner.rate <= 99).length },
    { range: '100%', count: measurable.filter(learner => learner.rate === 100).length },
  ];
  return { learners, breakdown, buckets };
}

export function ReportsPanel({ onNotice, course }: NoticeProps & { course?: Course }) {
  const [report, setReport] = useState(()=>reports.find(r=>location.pathname.endsWith(r.toLowerCase().replaceAll(' ','-')))||reports[0]);
  const [tag, setTag] = useState('');
  const reportData = useMemo(() => computeLocalReport(course), [course]);
  const exportCsv = () => {
    const lines = report === reports[0]
      ? [
          ['Student Breakdown'], ['Segment', 'Learners', 'Average completion rate'],
          ...reportData.breakdown.map(row => [row.segment, String(row.count), `${row.average}%`]),
          [], ['Percentage Breakdown'], ['Completion rate', 'Learners'],
          ...reportData.buckets.map(row => [row.range, String(row.count)]),
        ]
      : [['Report', 'Status'], [report, 'Not implemented in this local replica']];
    const csv = lines.map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${report.toLowerCase().replaceAll(/[^a-z0-9]+/g,'-')}.csv`; a.click(); URL.revokeObjectURL(url);
    onNotice(report === reports[0] ? 'Local lesson completion report exported' : 'CSV exported; this report is not implemented locally');
  };
  return <div className="admin-surface">
    <div className="page-heading"><div><h1>Reports</h1></div></div>
    <div className="as-report-controls">
      <label>Select a report<select value={report} onChange={e=>setReport(e.target.value)}>{reports.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Filter by user tags<select value={tag} onChange={e=>setTag(e.target.value)}><option value="">Type something...</option><option value="No tags">No tags</option></select></label>
      <button className="btn" onClick={exportCsv}><Download size={16}/>Export CSV</button>
    </div>
    <p className="as-local-note">Local data only. Completion uses this browser’s enrollments, learner progress, and published lessons. This replica does not record payment tiers.</p>
    {report === 'Lesson Completion' ? <>
      <h2 className="as-serif">Student Breakdown</h2><p>Average completion of published lessons for learners with local enrollment or progress records.</p>
      <div className="as-table-wrap"><table><thead><tr><th>SEGMENT</th><th>LEARNERS</th><th>AVERAGE COMPLETION RATE</th></tr></thead><tbody>{reportData.breakdown.map(row=><tr key={row.segment}><td>{row.segment}</td><td>{row.count}</td><td><div className="as-progress"><span>{row.average}%</span><i style={{ width: `${row.average}%` }}/></div></td></tr>)}</tbody></table></div>
      <h2 className="as-serif as-lower">Percentage Breakdown</h2><p>Learners grouped by their completion rate for published lessons.</p>
      <div className="as-table-wrap"><table><thead><tr><th>COMPLETION RATE</th><th>ALL TRACKED LEARNERS</th></tr></thead><tbody>{reportData.buckets.map(row=><tr key={row.range}><td>{row.range}</td><td>{row.count}</td></tr>)}</tbody></table></div>
      {!reportData.learners.some(learner => learner.total > 0) && <p>No local enrollment or lesson progress data is available for published lessons yet.</p>}
    </> : report === 'Video Stats' || report === 'Quiz Scores' ? <div className="as-empty"><h2 className="as-serif">{report}</h2><p>This report is not implemented in the local replica, so no video or quiz results are available.</p></div>
      : <div className="as-empty"><h2 className="as-serif">{report}</h2><p>This report is not implemented in the local replica.</p></div>}
  </div>;
}

type Student = { id?: string; name: string; email: string; course?: string; courseId?: string; created: string };
const studentKey = 'teachable-recreation-students-v1';
const courseKey = 'teachable-recreation-v1';
const enrollmentKey = 'teachable-enrollments-v2';
const readStudents = (): Student[] => { try { const x = JSON.parse(localStorage.getItem(studentKey) || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
const readCourses = (): {id:string;title:string}[] => { try { const d=JSON.parse(localStorage.getItem(courseKey)||'{}'); return Array.isArray(d.courses) ? d.courses.map((c:{id:string;title:string})=>({id:c.id,title:c.title})) : []; } catch { return []; } };
export function StudentsPanel({ courseTitle, courseId, onNotice }: { courseTitle?: string; courseId?: string } & NoticeProps) {
  const [tab, setTab] = useState(()=>(['Students','Leads','Admins','Affiliates','Tags'].find(t=>t.toLowerCase()===location.pathname.split('/').pop())||'Students'));
  const [students, setStudents] = useState<Student[]>(readStudents);
  const [query, setQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [dialog, setDialog] = useState<'choice'|'manual'|null>(null);
  const [tagDialog, setTagDialog] = useState(false); const [newTag, setNewTag] = useState(''); const [tags,setTags]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('teachable-recreation-tags-v1')||'[]')}catch{return []}});
  const dialogRef=useRef<HTMLElement>(null); const tagDialogRef=useRef<HTMLElement>(null);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [enroll, setEnroll] = useState(false); const [payment, setPayment] = useState(''); const [consent, setConsent] = useState(false);
  const [courses] = useState(readCourses); const [selectedCourse, setSelectedCourse] = useState('');
  const visible = useMemo(() => students.filter(s => (!courseTitle && !courseId || (courseId ? s.courseId === courseId || (!s.courseId && s.course === courseTitle) : s.course === courseTitle)) && `${s.name} ${s.email}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(a.name.localeCompare(b.name))*(sortAsc?1:-1)), [students,courseTitle,courseId,query,sortAsc]);
  const save = () => {
    const normalizedEmail = email.trim();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) { onNotice('Enter a name and valid email address'); return; }
    if (students.some(student => student.email.trim().toLowerCase() === normalizedEmail.toLowerCase())) { onNotice('A student with this email already exists'); return; }
    const selectedProduct = courses.find(c => c.id === selectedCourse);
    const titleCourse = courseTitle ? courses.find(c => c.title === courseTitle) : undefined;
    const targetCourseId = courseId || (courseTitle ? titleCourse?.id : enroll ? selectedProduct?.id : undefined);
    const shouldEnroll = Boolean(courseId || courseTitle || enroll);
    if (shouldEnroll && !targetCourseId) { onNotice('Select a product for enrollment'); return; }
    const enrollment = courseTitle || selectedProduct?.title || (targetCourseId ? courses.find(c => c.id === targetCourseId)?.title : undefined);
    const id = crypto.randomUUID();
    const student: Student = { id, name: name.trim(), email: normalizedEmail, course: enrollment, courseId: targetCourseId, created: new Date().toLocaleDateString() };
    const next = [...students, student];
    localStorage.setItem(studentKey, JSON.stringify(next));
    if (shouldEnroll && targetCourseId) {
      let current: Record<string, string[]> = {};
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(enrollmentKey) || '{}');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) current = saved as Record<string, string[]>;
      } catch { /* Start a clean local enrollment map if its saved JSON is damaged. */ }
      const courseIds = Array.isArray(current[id]) ? current[id] : [];
      current[id] = [...new Set([...courseIds, targetCourseId])];
      localStorage.setItem(enrollmentKey, JSON.stringify(current));
    }
    setStudents(next); setName('');setEmail('');setPassword('');setDialog(null); onNotice('Student added locally');
  };
  useDialogKeys(!!dialog,()=>setDialog(null),dialogRef);
  useDialogKeys(tagDialog,()=>setTagDialog(false),tagDialogRef);
  const createTag=()=>{if(!newTag.trim()){onNotice('Enter a tag name');return;}const next=[...tags,newTag.trim()];setTags(next);localStorage.setItem('teachable-recreation-tags-v1',JSON.stringify(next));setNewTag('');setTagDialog(false);onNotice('Tag created locally');};
  return <div className="admin-surface">
    {!courseTitle && <div className="as-subnav"><small>USERS</small>{['Students','Leads','Admins','Affiliates','Tags'].map(x=><button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>}
    <div className="as-student-heading"><h1>{courseTitle ? 'Students' : tab}</h1>{tab==='Students' && <button className="btn primary" onClick={()=>setDialog('choice')}><Plus size={16}/>Add Students</button>}</div>
    {tab==='Students' ? <>
      {students.length>0 && <div className="as-student-toolbar"><label className="as-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search students" aria-label="Search students"/></label><button className="btn" onClick={()=>setSortAsc(v=>!v)}>Name {sortAsc?'↑':'↓'}</button></div>}
      {visible.length ? <div className="as-table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th>{!courseTitle&&<th>ENROLLMENTS</th>}<th>DATE ADDED</th></tr></thead><tbody>{visible.map((s,i)=><tr key={`${s.email}-${i}`}><td>{s.name}</td><td>{s.email}</td>{!courseTitle&&<td>{s.course||'—'}</td>}<td>{s.created}</td></tr>)}</tbody></table></div>
        : <div className="as-empty as-student-empty"><h2 className="as-serif">{courseTitle ? 'No Users Found' : 'Add your first student'}</h2><p>{courseTitle ? 'Students enrolled in this course will appear here.' : 'Students you enroll in your school will show up here.'}</p><button className="btn primary" onClick={()=>setDialog('choice')}>Add Students</button></div>}
    </> : tab==='Admins' ? <><div className="as-admin-quota">1 / 1 admins</div><div className="as-table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th></tr></thead><tbody><tr><td>School owner</td><td>—</td><td>Primary Owner</td></tr></tbody></table></div></> : tab==='Tags' ? <><div className="as-tag-heading"><p>Organize users in your school with tags</p><button className="btn primary" onClick={()=>setTagDialog(true)}><Plus size={16}/>Create New Tag</button></div>{tags.length>0&&<div className="as-tag-list">{tags.map(t=><span key={t}>{t}</span>)}</div>}</> : <div className="as-empty"><h2 className="as-serif">No {tab.toLowerCase()} yet</h2><p>{tab} in your school will show up here.</p></div>}
    {dialog && <div className="as-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setDialog(null)}><section ref={dialogRef} className="as-dialog" role="dialog" aria-modal="true" aria-labelledby="student-dialog-title" tabIndex={-1}><header><h2 id="student-dialog-title" className="as-serif">{dialog==='choice'?'Add Students':'Add Students'}</h2><button aria-label="Close" onClick={()=>setDialog(null)}><X size={19}/></button></header>{dialog==='choice' ? <div className="as-choice"><p>Choose how you would like to add students.</p><button onClick={()=>setDialog('manual')}><strong>Manual entry</strong><span>Add a student with their name and email address.</span></button><button className="gated" onClick={()=>onNotice('CSV import requires an eligible plan')}><strong>Import CSV <small>Upgrade</small></strong><span>Import students from a spreadsheet.</span></button></div> : <div className="as-form">
      <h3>Student details</h3><p>Information about the student.</p><label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith"/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@website.com"/></label><label>Password (Optional)<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <h3>Enrollment</h3><p>Optionally grant product access as soon as these students are added.</p><label className="as-check"><input type="checkbox" checked={courseTitle ? true : enroll} disabled={!!courseTitle} onChange={e=>setEnroll(e.target.checked)}/>{courseTitle?'Enroll student in this course':'Enroll student in a product'}</label>{enroll&&!courseTitle&&<label>Product<select value={selectedCourse} onChange={e=>setSelectedCourse(e.target.value)}><option value="">Select a product</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
      <label>How did your students pay to access your product(s)?<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="">Select method</option><option>Free</option><option>Paid outside Teachable</option><option>Paid through Teachable</option></select></label><label className="as-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I confirm these students consented to receive marketing emails.</label>
    </div>}<footer><button className="btn" onClick={()=>dialog==='manual'?setDialog('choice'):setDialog(null)}>{dialog==='manual'?'Back':'Cancel'}</button>{dialog==='manual'&&<button className="btn primary" onClick={save}>Add students</button>}</footer></section></div>}
    {tagDialog&&<div className="as-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setTagDialog(false)}><section ref={tagDialogRef} className="as-dialog" role="dialog" aria-modal="true" aria-labelledby="tag-dialog-title" tabIndex={-1}><header><h2 id="tag-dialog-title" className="as-serif">Create New Tag</h2><button aria-label="Close" onClick={()=>setTagDialog(false)}><X size={19}/></button></header><div className="as-form"><label>Tag name<input value={newTag} onChange={e=>setNewTag(e.target.value)} autoFocus/></label></div><footer><button className="btn" onClick={()=>setTagDialog(false)}>Cancel</button><button className="btn primary" onClick={createTag}>Create New Tag</button></footer></section></div>}
  </div>;
}

const roles = ['Primary owner','Owner','Author','Affiliate'];
const caps = ['Publish lessons','Email students','Manage prices','Manage coupons','Import students','Manage sales pages','Manage certificates','Issue certificates'];
export function SettingsPanel({ onNotice }: NoticeProps) {
  const [section,setSection]=useState(()=>(['General','Roles','Plan','Billing','Notifications'].find(t=>t.toLowerCase()===location.pathname.split('/').pop())||'General')); const [scope,setScope]=useState('Website'); const [roleTab,setRoleTab]=useState('Main Roles'); const [role,setRole]=useState<string|null>(null); const roleDialogRef=useRef<HTMLElement>(null);
  const [values,setValues]=useState<Record<'school'|'business'|'reply'|'sender'|'mailing',string>>(()=>{try{return {...{school:'OstadiPlus',business:'Nothing set',reply:'Nothing set',sender:'Nothing set',mailing:'Nothing set'},...JSON.parse(localStorage.getItem('teachable-recreation-settings-v1')||'{}')}}catch{return {school:'OstadiPlus',business:'Nothing set',reply:'Nothing set',sender:'Nothing set',mailing:'Nothing set'}}});
  const [editing,setEditing]=useState<string|null>(null);
  const update=(key:keyof typeof values,value:string)=>setValues(v=>({...v,[key]:value}));
  const fields=[['School name','school'],['Business name','business'],['Reply to email','reply'],['Email sender name','sender'],['Mailing address','mailing']] as const;
  useDialogKeys(!!role,()=>setRole(null),roleDialogRef);
  return <div className="admin-surface as-settings">
    <nav className="as-settings-nav"><small>SETTINGS</small>{['General','Notifications','Plan','Billing','Earn Credit','Webhooks','API Keys','OAuth Apps','Roles'].map(x=><button className={section===x?'active':''} onClick={()=>setSection(x)} key={x}>{x}</button>)}</nav>
    <div className="as-settings-main"><h1>{section==='Roles'?'User Roles':'Global settings'}</h1>
      {section==='General' ? <><div className="as-tabs">{['Website','Courses'].map(x=><button className={scope===x?'active':''} onClick={()=>setScope(x)} key={x}>{x}</button>)}</div>{scope==='Website'?<><h2>Basic school information</h2><p>Add basic information about your school and business to make sure students see the correct information on your website, in receipts and in emails.</p><div className="as-setting-grid">{fields.map(([label,key])=><div className="as-setting-card" key={key}><span>{label}</span>{editing===key?<><input aria-label={label} value={values[key]} onChange={e=>update(key,e.target.value)}/><button onClick={()=>{localStorage.setItem('teachable-recreation-settings-v1',JSON.stringify(values));setEditing(null);onNotice(`${label} saved locally`)}}>Save</button></>:<><strong>{values[key]}</strong><button onClick={()=>setEditing(key)}>Edit</button></>}</div>)}</div><div className="as-status"><strong>School status</strong><span>SCHOOL IS ONLINE</span><p>In order to make your school fully accessible to students, it needs to be online.</p></div></>:<div className="as-empty"><h2 className="as-serif">Courses</h2><p>Configure settings for courses in your school.</p></div>}</> : section==='Roles' ? <><div className="as-tabs">{['Main Roles','Custom Roles'].map(x=><button className={roleTab===x?'active':''} onClick={()=>setRoleTab(x)} key={x}>{x}</button>)}</div>{roleTab==='Main Roles'?<><p>There are four default admin user roles you can assign. You are currently using 1 of 1 admin seats.</p><div className="as-table-wrap"><table><thead><tr><th>ROLE TYPE</th><th>ADMIN ACCESS</th><th>ASSIGNED USERS</th><th></th></tr></thead><tbody>{roles.map((x,i)=><tr key={x}><td>{x}</td><td>{i===0?'Full access':'Limited access'}</td><td>{i<2?'1':'0'}</td><td><button className="as-link" onClick={()=>setRole(x)}>View permissions</button></td></tr>)}</tbody></table></div><h2 className="as-subheading">Student permissions</h2><p>Customize schoolwide student permissions.</p></>:<div className="as-empty"><h2 className="as-serif">No custom roles</h2></div>}</> : <div className="as-empty"><h2 className="as-serif">{section}</h2><p>Manage {section.toLowerCase()} for your school.</p></div>}
    </div>
    {role&&<div className="as-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setRole(null)}><section ref={roleDialogRef} className="as-dialog" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title" tabIndex={-1}><header><h2 id="role-dialog-title" className="as-serif">{role} permissions</h2><button aria-label="Close" onClick={()=>setRole(null)}><X size={19}/></button></header><div className="as-capabilities">{role==='Primary owner'?<p>Full access.</p>:role==='Author'?<><p>Observed author capabilities:</p><ul>{caps.map(x=><li key={x}>{x}</li>)}</ul></>:<p>Specific permissions for this role were not established in the saved evidence.</p>}</div><footer><button className="btn primary" onClick={()=>setRole(null)}>Done</button></footer></section></div>}
  </div>;
}
