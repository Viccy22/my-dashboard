"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type CourseStatus = "completed" | "in_progress" | "planned";
type Course = {
  id: string;
  name: string;
  code: string;
  credits: number;
  grade: string;
  semester: string;   // e.g. "Fall 2026"
  status: CourseStatus;
  notes: string;
};

type Assignment = {
  id: string;
  courseId: string;
  title: string;
  dueDate: string;
  done: boolean;
  points: string;
  notes: string;
};

type Degree = {
  name: string;
  school: string;
  totalCredits: number;
};

type SchoolData = { degree: Degree; courses: Course[]; assignments: Assignment[] };
type DashData   = { school?: SchoolData; [key: string]: unknown };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type View       = "overview" | "courses" | "assignments";

const STATUS_LABEL: Record<CourseStatus, string> = { completed: "Completed", in_progress: "In progress", planned: "Planned" };
const STATUS_COLOR: Record<CourseStatus, string> = { completed: "var(--green)", in_progress: "var(--accent-text)", planned: "var(--text-3)" };

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(s: string) { return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function daysUntil(s: string) { return Math.round((new Date(s + "T00:00:00").getTime() - Date.now()) / 86400000); }

function seedData(): SchoolData {
  return {
    degree: { name: "", school: "", totalCredits: 120 },
    courses: [],
    assignments: [],
  };
}

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);

export default function SchoolPage() {
  const [school,      setSchool]      = useState<SchoolData>(seedData());
  const [status,      setStatus]      = useState<SaveStatus>("idle");
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState<View>("overview");
  const [addingCourse,setAddingCourse]= useState(false);
  const [addingAssign,setAddingAssign]= useState(false);
  const [editingDegree,setEditingDegree] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawDataRef = useRef<DashData>({});
  const today = todayStr();

  const [courseForm, setCourseForm] = useState<Omit<Course, "id">>({
    name: "", code: "", credits: 3, grade: "", semester: "", status: "planned", notes: "",
  });
  const [assignForm, setAssignForm] = useState<Omit<Assignment, "id">>({
    courseId: "", title: "", dueDate: today, done: false, points: "", notes: "",
  });
  const [degreeForm, setDegreeForm] = useState<Degree>({ name: "", school: "", totalCredits: 120 });

  useEffect(() => {
    fetch("/api/data")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(res => {
        const d: DashData = res.data ?? {};
        rawDataRef.current = d;
        const s = d.school ?? seedData();
        if (!s.degree) s.degree = seedData().degree;
        if (!s.courses) s.courses = [];
        if (!s.assignments) s.assignments = [];
        setSchool(s);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (s: SchoolData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const newData = { ...rawDataRef.current, school: s };
    rawDataRef.current = newData;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: newData }) });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch { setStatus("error"); }
    finally { timer.current = setTimeout(() => setStatus("idle"), 2000); }
  }, []);

  const addCourse = () => {
    if (!courseForm.name.trim()) return;
    const updated = { ...school, courses: [...school.courses, { ...courseForm, id: crypto.randomUUID() }] };
    setSchool(updated); setAddingCourse(false); setCourseForm({ name: "", code: "", credits: 3, grade: "", semester: "", status: "planned", notes: "" }); save(updated);
  };

  const deleteCourse = (id: string) => {
    const updated = { ...school, courses: school.courses.filter(c => c.id !== id), assignments: school.assignments.filter(a => a.courseId !== id) };
    setSchool(updated); save(updated);
  };

  const updateCourseStatus = (id: string, s: CourseStatus) => {
    const updated = { ...school, courses: school.courses.map(c => c.id === id ? { ...c, status: s } : c) };
    setSchool(updated); save(updated);
  };

  const updateCourseGrade = (id: string, grade: string) => {
    const updated = { ...school, courses: school.courses.map(c => c.id === id ? { ...c, grade } : c) };
    setSchool(updated); save(updated);
  };

  const addAssignment = () => {
    if (!assignForm.title.trim() || !assignForm.courseId) return;
    const updated = { ...school, assignments: [...school.assignments, { ...assignForm, id: crypto.randomUUID() }] };
    setSchool(updated); setAddingAssign(false);
    setAssignForm({ courseId: "", title: "", dueDate: today, done: false, points: "", notes: "" });
    save(updated);
  };

  const toggleAssignment = (id: string) => {
    const updated = { ...school, assignments: school.assignments.map(a => a.id === id ? { ...a, done: !a.done } : a) };
    setSchool(updated); save(updated);
  };

  const deleteAssignment = (id: string) => {
    const updated = { ...school, assignments: school.assignments.filter(a => a.id !== id) };
    setSchool(updated); save(updated);
  };

  const saveDegree = () => {
    const updated = { ...school, degree: degreeForm };
    setSchool(updated); setEditingDegree(false); save(updated);
  };

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  const completedCredits  = school.courses.filter(c => c.status === "completed").reduce((s, c) => s + c.credits, 0);
  const inProgressCredits = school.courses.filter(c => c.status === "in_progress").reduce((s, c) => s + c.credits, 0);
  const totalCredits = school.degree.totalCredits || 120;
  const pct = Math.min(100, Math.round((completedCredits / totalCredits) * 100));
  const remaining = totalCredits - completedCredits;

  const pendingAssignments = school.assignments.filter(a => !a.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdueAssign = pendingAssignments.filter(a => a.dueDate < today);
  const dueSoonAssign = pendingAssignments.filter(a => a.dueDate >= today && daysUntil(a.dueDate) <= 7);
  const activeCourses = school.courses.filter(c => c.status === "in_progress");

  return (
    <div style={{ maxWidth: "800px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {(["overview","courses","assignments"] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={view === v ? "btn btn-primary" : "btn btn-secondary"}
            style={{ fontSize: "13px", padding: "6px 16px", textTransform: "capitalize" }}>
            {v}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {view === "overview" && (
        <>
          {/* Degree info */}
          <div className="card" style={{ marginBottom: "16px" }}>
            {editingDegree ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ flex: "2 1 180px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Degree / program</label>
                    <input className="input" placeholder="B.S. Psychology…" value={degreeForm.name} autoFocus onChange={e => setDegreeForm(x => ({ ...x, name: e.target.value }))} />
                  </div>
                  <div style={{ flex: "2 1 180px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>School</label>
                    <input className="input" placeholder="University name" value={degreeForm.school} onChange={e => setDegreeForm(x => ({ ...x, school: e.target.value }))} />
                  </div>
                  <div style={{ flex: "1 1 100px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Total credits</label>
                    <input className="input" type="number" min="1" value={degreeForm.totalCredits} onChange={e => setDegreeForm(x => ({ ...x, totalCredits: parseInt(e.target.value) || 120 }))} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-primary" onClick={saveDegree}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditingDegree(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p className="card-title" style={{ margin: "0 0 2px" }}>{school.degree.name || "Add your degree"}</p>
                  {school.degree.school && <p style={{ fontSize: "13px", color: "var(--text-3)", margin: 0 }}>{school.degree.school}</p>}
                </div>
                <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 12px" }}
                  onClick={() => { setDegreeForm(school.degree); setEditingDegree(true); }}>
                  {school.degree.name ? "Edit" : "Set up"}
                </button>
              </div>
            )}

            {!editingDegree && (
              <div style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12.5px", color: "var(--text-2)" }}>Degree progress</span>
                  <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>{completedCredits} / {totalCredits} credits ({pct}%)</span>
                </div>
                <div style={{ height: "8px", borderRadius: "99px", background: "var(--surface-raised)", overflow: "hidden", marginBottom: "6px" }}>
                  <div style={{ height: "100%", borderRadius: "99px", background: "var(--green)", width: `${pct}%`, transition: "width 0.3s" }} />
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-3)" }}>
                  <span style={{ color: "var(--green)" }}>{completedCredits} completed</span>
                  {inProgressCredits > 0 && <span style={{ color: "var(--accent-text)" }}>{inProgressCredits} in progress</span>}
                  <span>{remaining} remaining</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
            <div className="card" style={{ padding: "12px 14px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Current courses</p>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>{activeCourses.length}</p>
            </div>
            <div className="card" style={{ padding: "12px 14px", background: overdueAssign.length > 0 ? "var(--red-dim)" : undefined }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: overdueAssign.length > 0 ? "var(--red)" : "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Overdue</p>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: overdueAssign.length > 0 ? "var(--red)" : "var(--text)" }}>{overdueAssign.length}</p>
            </div>
            <div className="card" style={{ padding: "12px 14px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Due this week</p>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>{dueSoonAssign.length}</p>
            </div>
          </div>

          {/* Upcoming assignments */}
          {pendingAssignments.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p className="card-title" style={{ margin: 0 }}>Upcoming assignments</p>
                <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "3px 10px" }} onClick={() => setView("assignments")}>View all →</button>
              </div>
              {pendingAssignments.slice(0, 6).map(a => {
                const course = school.courses.find(c => c.id === a.courseId);
                const d = daysUntil(a.dueDate);
                const color = d < 0 ? "var(--red)" : d === 0 ? "var(--yellow)" : d <= 3 ? "var(--accent-text)" : "var(--text-3)";
                return (
                  <div key={a.id} className="row">
                    <input type="checkbox" className="checkbox" checked={false} onChange={() => toggleAssignment(a.id)} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "13.5px", color: "var(--text)" }}>{a.title}</span>
                      {course && <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "8px" }}>{course.code || course.name}</span>}
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color }}>{d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Today" : fmtDate(a.dueDate)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── COURSES ── */}
      {view === "courses" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button className="btn btn-primary" onClick={() => setAddingCourse(a => !a)}>
              {addingCourse ? "Cancel" : "+ Add course"}
            </button>
          </div>

          {addingCourse && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <p className="card-title" style={{ marginBottom: "12px" }}>Add course</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 160px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Course name</label>
                  <input className="input" placeholder="Introduction to Psychology" value={courseForm.name} autoFocus onChange={e => setCourseForm(x => ({ ...x, name: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Code</label>
                  <input className="input" placeholder="PSY 101" value={courseForm.code} onChange={e => setCourseForm(x => ({ ...x, code: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 80px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Credits</label>
                  <input className="input" type="number" min="0" max="12" value={courseForm.credits} onChange={e => setCourseForm(x => ({ ...x, credits: parseInt(e.target.value) || 3 }))} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Semester</label>
                  <input className="input" placeholder="Fall 2026" value={courseForm.semester} onChange={e => setCourseForm(x => ({ ...x, semester: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 110px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Status</label>
                  <select className="input" value={courseForm.status} onChange={e => setCourseForm(x => ({ ...x, status: e.target.value as CourseStatus }))}>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div style={{ flex: "1 1 80px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Grade</label>
                  <input className="input" placeholder="A, B+…" value={courseForm.grade} onChange={e => setCourseForm(x => ({ ...x, grade: e.target.value }))} />
                </div>
              </div>
              <input className="input" placeholder="Notes" value={courseForm.notes} onChange={e => setCourseForm(x => ({ ...x, notes: e.target.value }))} style={{ marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" onClick={addCourse}>Add course</button>
                <button className="btn btn-secondary" onClick={() => setAddingCourse(false)}>Cancel</button>
              </div>
            </div>
          )}

          {school.courses.length === 0 ? (
            <div className="card"><p className="empty">No courses yet. Add one above.</p></div>
          ) : (
            (["in_progress","planned","completed"] as CourseStatus[]).map(s => {
              const group = school.courses.filter(c => c.status === s);
              if (!group.length) return null;
              return (
                <div key={s} style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "10.5px", fontWeight: 700, color: STATUS_COLOR[s], textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>{STATUS_LABEL[s]}</p>
                  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    {group.map((course, i) => (
                      <div key={course.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 80px 28px", gap: "0 10px", padding: "10px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", alignItems: "center" }}
                        onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".c-del").forEach(el => el.style.opacity = "1")}
                        onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".c-del").forEach(el => el.style.opacity = "0")}>
                        <div>
                          <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{course.name}</span>
                          {course.code && <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{course.code}</span>}
                          {course.semester && <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginLeft: "8px" }}>{course.semester}</span>}
                          {course.notes && <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "2px 0 0" }}>{course.notes}</p>}
                        </div>
                        <span style={{ fontSize: "12.5px", color: "var(--text-3)", textAlign: "center" }}>{course.credits} cr</span>
                        <input className="input" style={{ fontSize: "12px", padding: "3px 6px", textAlign: "center" }}
                          placeholder="Grade" value={course.grade}
                          onChange={e => updateCourseGrade(course.id, e.target.value)} />
                        <select className="input" style={{ fontSize: "11.5px", padding: "3px 6px" }}
                          value={course.status} onChange={e => updateCourseStatus(course.id, e.target.value as CourseStatus)}>
                          <option value="planned">Planned</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button className="btn-icon c-del" style={{ opacity: 0 }} onClick={() => deleteCourse(course.id)}><XIcon /></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── ASSIGNMENTS ── */}
      {view === "assignments" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button className="btn btn-primary" onClick={() => setAddingAssign(a => !a)}>
              {addingAssign ? "Cancel" : "+ Add assignment"}
            </button>
          </div>

          {addingAssign && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <p className="card-title" style={{ marginBottom: "12px" }}>Add assignment</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 180px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Title</label>
                  <input className="input" placeholder="Essay, Quiz 3, Final project…" value={assignForm.title} autoFocus onChange={e => setAssignForm(x => ({ ...x, title: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Course</label>
                  <select className="input" value={assignForm.courseId} onChange={e => setAssignForm(x => ({ ...x, courseId: e.target.value }))}>
                    <option value="">Select course</option>
                    {school.courses.filter(c => c.status !== "completed").map(c => <option key={c.id} value={c.id}>{c.code || c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Due date</label>
                  <input className="input" type="date" value={assignForm.dueDate} onChange={e => setAssignForm(x => ({ ...x, dueDate: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "3px" }}>Points / weight</label>
                  <input className="input" placeholder="100 pts, 20%…" value={assignForm.points} onChange={e => setAssignForm(x => ({ ...x, points: e.target.value }))} />
                </div>
              </div>
              <input className="input" placeholder="Notes" value={assignForm.notes} onChange={e => setAssignForm(x => ({ ...x, notes: e.target.value }))} style={{ marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary" onClick={addAssignment}>Add</button>
                <button className="btn btn-secondary" onClick={() => setAddingAssign(false)}>Cancel</button>
              </div>
            </div>
          )}

          {school.assignments.length === 0 ? (
            <div className="card"><p className="empty">No assignments yet.</p></div>
          ) : (
            <>
              {/* Pending */}
              {pendingAssignments.length > 0 && (
                <div className="card" style={{ marginBottom: "12px" }}>
                  <p className="card-title" style={{ marginBottom: "10px" }}>Pending ({pendingAssignments.length})</p>
                  {pendingAssignments.map(a => {
                    const course = school.courses.find(c => c.id === a.courseId);
                    const d = daysUntil(a.dueDate);
                    const color = d < 0 ? "var(--red)" : d === 0 ? "var(--yellow)" : d <= 3 ? "var(--accent-text)" : "var(--text-3)";
                    return (
                      <div key={a.id} className="row"
                        onMouseEnter={e => e.currentTarget.querySelectorAll<HTMLElement>(".a-del").forEach(el => el.style.opacity = "1")}
                        onMouseLeave={e => e.currentTarget.querySelectorAll<HTMLElement>(".a-del").forEach(el => el.style.opacity = "0")}>
                        <input type="checkbox" className="checkbox" checked={false} onChange={() => toggleAssignment(a.id)} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "13.5px", color: "var(--text)" }}>{a.title}</span>
                          {course && <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "8px" }}>{course.code || course.name}</span>}
                          {a.points && <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "8px" }}>{a.points}</span>}
                          {a.notes && <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "2px 0 0" }}>{a.notes}</p>}
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 600, color, minWidth: "80px", textAlign: "right" }}>
                          {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : fmtDate(a.dueDate)}
                        </span>
                        <button className="btn-icon a-del" style={{ opacity: 0 }} onClick={() => deleteAssignment(a.id)}><XIcon /></button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Completed */}
              {school.assignments.filter(a => a.done).length > 0 && (
                <details>
                  <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer", userSelect: "none", padding: "4px 0" }}>
                    {school.assignments.filter(a => a.done).length} completed
                  </summary>
                  <div className="card" style={{ marginTop: "8px", opacity: 0.45 }}>
                    {school.assignments.filter(a => a.done).map(a => {
                      const course = school.courses.find(c => c.id === a.courseId);
                      return (
                        <div key={a.id} className="row done">
                          <input type="checkbox" className="checkbox" checked={true} onChange={() => toggleAssignment(a.id)} />
                          <span style={{ flex: 1, fontSize: "13.5px", color: "var(--text)", textDecoration: "line-through" }}>{a.title}</span>
                          {course && <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{course.code || course.name}</span>}
                          <button className="btn-icon" onClick={() => deleteAssignment(a.id)}><XIcon /></button>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
