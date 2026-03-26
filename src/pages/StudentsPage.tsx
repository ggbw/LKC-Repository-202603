import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  useStudents,
  useTeachers,
  useSubjects,
  useSubjectTeachers,
  useStudentSubjects,
  useClassTeachers,
  useParentStudents,
  useParents,
  useInvalidate,
} from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { FORMS, cap, formatDate } from "@/data/database";
import { downloadExcel, parseExcel, triggerFileUpload } from "@/lib/excel";
import {
  Badge,
  Card,
  InfoRow,
  SearchBar,
  FilterSelect,
  Btn,
  BackBtn,
  Modal,
  ModalHead,
  ModalBody,
  ModalFoot,
  FormSection,
  Field,
  FieldInput,
  FieldSelect,
} from "@/components/SharedUI";

export default function StudentsPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin, isTeacher, isParent, user, isClassTeacher, myClassAssignments: ctAssignments } = useAuth();
  const { data: students = [], isLoading } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: subjects = [] } = useSubjects();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: studentSubjects = [] } = useStudentSubjects();
  const { data: classTeachers = [] } = useClassTeachers();
  const { data: parentStudents = [] } = useParentStudents();
  
  const [teacherView, setTeacherView] = useState<"my-class" | "my-subjects">("my-class");
  const [search, setSearch] = useState("");
  const [filterForm, setFilterForm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterState, setFilterState] = useState("");
  const [modal, setModal] = useState<string | "new" | null>(null);
  const [ctModal, setCtModal] = useState<{ form: string; class_name: string } | null>(null);
  const invalidate = useInvalidate();

  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);

  const mySubjectIds = useMemo(() => {
    if (!myTeacher) return [];
    return subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => st.subject_id);
  }, [subjectTeachers, myTeacher]);

  const myClassAssignments = useMemo(() => {
    if (!myTeacher) return [];
    return classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id);
  }, [classTeachers, myTeacher]);

  const classTeacherStudentIds = useMemo(() => {
    if (!isTeacher || !myTeacher) return new Set<string>();
    return new Set(
      students
        .filter((s: any) => myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name))
        .map((s: any) => s.id),
    );
  }, [isTeacher, myTeacher, students, myClassAssignments]);

  const subjectStudentIds = useMemo(() => {
    if (!isTeacher || !myTeacher) return new Set<string>();
    return new Set(
      studentSubjects
        .filter((ss: any) => mySubjectIds.includes(ss.subject_id))
        .map((ss: any) => ss.student_id)
    );
  }, [isTeacher, myTeacher, studentSubjects, mySubjectIds]);

  const myParentRecord = useMemo(
    () => parentStudents.find((ps: any) => ps.parents?.user_id === user?.id)?.parents ?? null,
    [parentStudents, user],
  );
  
  const myChildIds = useMemo(() => {
    if (!myParentRecord) return new Set<string>();
    return new Set(
      parentStudents.filter((ps: any) => ps.parent_id === myParentRecord.id).map((ps: any) => ps.student_id as string),
    );
  }, [parentStudents, myParentRecord]);

  const allVisibleStudents = useMemo(() => {
    if (isAdmin) return students;
    if (isTeacher && myTeacher) {
      return students.filter((s: any) => classTeacherStudentIds.has(s.id) || subjectStudentIds.has(s.id));
    }
    if (isParent) return students.filter((s: any) => myChildIds.has(s.id));
    return [];
  }, [students, isAdmin, isTeacher, isParent, myTeacher, classTeacherStudentIds, subjectStudentIds, myChildIds]);

  const visibleStudents = useMemo(() => {
    if (!isTeacher || isAdmin || !myTeacher) return allVisibleStudents;
    if (teacherView === "my-class") {
      return allVisibleStudents.filter((s: any) => classTeacherStudentIds.has(s.id));
    }
    return allVisibleStudents.filter((s: any) => subjectStudentIds.has(s.id));
  }, [allVisibleStudents, isTeacher, isAdmin, myTeacher, teacherView, classTeacherStudentIds, subjectStudentIds]);

  const studentSubjectMap = useMemo(() => {
    if (!isTeacher || !myTeacher) return {};
    const map: Record<string, string[]> = {};
    for (const ss of studentSubjects) {
      if (mySubjectIds.includes(ss.subject_id)) {
        const subj = subjects.find((s: any) => s.id === ss.subject_id);
        if (subj) {
          if (!map[ss.student_id]) map[ss.student_id] = [];
          map[ss.student_id].push(subj.name);
        }
      }
    }
    return map;
  }, [isTeacher, myTeacher, studentSubjects, mySubjectIds, subjects]);

  if (detail) return <StudentDetail id={detail} onBack={() => setDetail(null)} />;

  const rows = visibleStudents.filter(
    (s: any) =>
      (!search ||
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.enrollment_number || "").toLowerCase().includes(search.toLowerCase())) &&
      (!filterForm || s.form === filterForm) &&
      (!filterClass || s.class_name === filterClass) &&
      (!filterState || s.state === filterState),
  );

  const handleExport = () => {
    downloadExcel(
      rows.map((s: any) => ({
        Enrollment: s.enrollment_number || "",
        "Full Name": s.full_name,
        Form: s.form,
        Class: s.class_name || "",
        Gender: cap(s.gender || ""),
        Status: cap(s.state || "active"),
        "Date of Birth": s.date_of_birth || "",
        Nationality: s.nationality || "",
        Email: s.email || "",
        "Admission Date": s.admission_date || "",
      })),
      "students_export",
      "Students",
    );
    showToast("Students exported");
  };

  const excelDateToISO = (val: any): string | null => {
    if (!val && val !== 0) return null;
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    if (typeof val === "number") {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  };

  const handleImport = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      if (!data.length) { showToast("File is empty", "error"); return; }
      let count = 0;
      for (const row of data) {
        const name = row["Full Name"] || row["full_name"] || row["Name"];
        if (!name) continue;
        const rawForm = row["Form"] || row["form"] || "Form 1";
        const form = rawForm.toString().toLowerCase().includes("form") ? rawForm : "Form " + rawForm;
        await supabase.from("students").insert({
          full_name: String(name).trim(),
          form,
          gender: (row["Gender"] || "").toString().toLowerCase() || null,
          enrollment_number: row["Enrollment #"] || row["Enrollment"] || null,
          class_name: row["Class"] || null,
          email: row["Email"] || null,
          nationality: row["Nationality"] || null,
          date_of_birth: excelDateToISO(row["Date of Birth"]),
          admission_date: excelDateToISO(row["Admission Date"]),
          state: "active",
        });
        count++;
      }
      showToast(`Imported ${count} students`);
      invalidate(["students"]);
    } catch (e: any) { showToast(e.message, "error"); }
  };

  if (isLoading) return <div className="page-animate p-4 text-sm opacity-60">Loading students...</div>;

  return (
    <div className="page-animate">
      {isTeacher && !isAdmin && (isClassTeacher || myClassAssignments.length > 0) && (
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "hsl(var(--surface2))", width: "fit-content" }}>
          {[
            { key: "my-class", label: "My Class", icon: "fa-chalkboard-teacher", count: classTeacherStudentIds.size },
            { key: "my-subjects", label: "My Subject Students", icon: "fa-book", count: subjectStudentIds.size },
          ].map((t: any) => (
            <button
              key={t.key}
              onClick={() => setTeacherView(t.key)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[12px] font-semibold border-none cursor-pointer transition-all"
              style={{
                background: teacherView === t.key ? "hsl(var(--surface))" : "transparent",
                color: teacherView === t.key ? "hsl(var(--text))" : "hsl(var(--text2))",
                boxShadow: teacherView === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <i className={`fas ${t.icon} text-[11px]`} />
              {t.label} <span className="text-[10px] opacity-60 font-mono">({t.count})</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-graduation-cap mr-2" />
            {isParent ? "My Children" : teacherView === "my-class" && isTeacher && !isAdmin ? "My Class Students" : "Students"}
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {visibleStudents.length} {isParent ? "children" : "students"}
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}><i className="fas fa-download mr-1" /> Export</Btn>
          {isAdmin && (
            <>
              <Btn variant="outline" onClick={handleImport}><i className="fas fa-upload mr-1" /> Import</Btn>
              <Btn onClick={() => setModal("new")}><i className="fas fa-plus mr-1" /> New Student</Btn>
            </>
          )}
          {isClassTeacher && !isAdmin && ctAssignments.length > 0 && (
            <Btn onClick={() => setCtModal(ctAssignments[0])}>
              <i className="fas fa-user-plus mr-1" /> Add to {ctAssignments[0].form} {ctAssignments[0].class_name}
            </Btn>
          )}
        </div>
      </div>

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍 Search name or enrollment...">
          <FilterSelect value={filterForm} onChange={setFilterForm} allLabel="All Forms" options={FORMS.map(f => ({ value: f, label: f }))} />
          <FilterSelect 
            value={filterClass} 
            onChange={setFilterClass} 
            allLabel="All Classes" 
            options={[...new Set(visibleStudents.map((s: any) => s.class_name).filter(Boolean))].sort().map(c => ({ value: c, label: c }))} 
          />
        </SearchBar>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Enrollment", "Name", "Form", "Class", "Gender", ...(isTeacher && !isAdmin ? ["Subjects", "Relation"] : []), "Status", "Actions"].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: "hsl(var(--text2))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((s: any) => (
                <tr key={s.id} className="hover:bg-[hsl(var(--surface2))] transition-colors" style={{ borderBottom: "1px solid #f6f8fa" }}>
                  <td className="py-2.5 px-3.5 font-mono text-[11px] opacity-60">{s.enrollment_number || "—"}</td>
                  <td className="py-2.5 px-3.5 font-semibold cursor-pointer text-[#1a3fa0]" onClick={() => setDetail(s.id)}>{s.full_name}</td>
                  <td className="py-2.5 px-3.5">{s.form}</td>
                  <td className="py-2.5 px-3.5 font-mono">{s.class_name || "—"}</td>
                  <td className="py-2.5 px-3.5">{cap(s.gender || "")}</td>
                  {isTeacher && !isAdmin && (
                    <>
                      <td className="py-2.5 px-3.5 text-[10px]">{ (studentSubjectMap[s.id] || []).join(", ") || "—" }</td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex gap-1">
                          {subjectStudentIds.has(s.id) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#ddf4ff] text-[#0969da]">Subject</span>}
                          {classTeacherStudentIds.has(s.id) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#dafbe1] text-[#1a7f37]">My Class</span>}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-3.5"><Badge status={s.state || "active"} /></td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex gap-1">
                      {isAdmin && <Btn variant="outline" size="sm" onClick={() => setModal(s.id)}><i className="fas fa-edit" /></Btn>}
                      {isClassTeacher && !isAdmin && classTeacherStudentIds.has(s.id) && (
                        <Btn variant="danger" size="sm" onClick={async () => {
                           if (confirm(`Remove ${s.full_name} from your class?`)) {
                             await supabase.from("students").update({ class_name: null }).eq("id", s.id);
                             invalidate(["students"]);
                           }
                        }}><i className="fas fa-user-minus" /></Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && <StudentModal id={modal === "new" ? null : modal} students={students} onClose={() => { setModal(null); invalidate(["students"]); }} />}
      {ctModal && <ClassStudentModal assignment={ctModal} onClose={() => { setCtModal(null); invalidate(["students"]); }} />}
    </div>
  );
}

function StudentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: students = [] } = useStudents();
  const { data: studentSubjects = [] } = useStudentSubjects(id);
  const { data: classTeachers = [] } = useClassTeachers();
  const { data: allParents = [] } = useParents();
  const { data: parentStudents = [] } = useParentStudents();
  const s = students.find((x: any) => x.id === id);

  if (!s) return <div className="p-4"><BackBtn onClick={onBack} label="Back" /><div>Not found</div></div>;

  const guardians = allParents.filter((p: any) => parentStudents.some((ps: any) => ps.student_id === id && ps.parent_id === p.id));
  const classTeacher = classTeachers.find((ct: any) => ct.form === s.form && ct.class_name === s.class_name);

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Students" />
      <div className="flex items-start gap-4 mb-5 pb-4 border-b border-[hsl(var(--border))]">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-[hsl(var(--surface2))] border-2 border-[hsl(var(--border))]">
          <i className={`fas fa-${s.gender === "female" ? "female" : "male"} text-2xl text-[#1a3fa0]`} />
        </div>
        <div>
          <div className="text-xl font-bold">{s.full_name}</div>
          <div className="flex gap-2 items-center mt-1">
            <Badge status={s.state || "active"} />
            <span className="text-[11px] font-mono opacity-60">{s.enrollment_number}</span>
            <span className="text-[11px] opacity-60">{s.form} {s.class_name}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Personal Information">
          {[["DOB", formatDate(s.date_of_birth)], ["Gender", cap(s.gender)], ["Form", s.form], ["Class", s.class_name || "—"], ["Nationality", s.nationality || "—"]].map(([k, v]) => (
            <InfoRow key={k} label={k} value={v} />
          ))}
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Class Teacher">
            <div className="text-sm font-semibold">{classTeacher?.teachers?.name || "Not assigned"}</div>
          </Card>
          <Card title={`Subjects (${studentSubjects.length})`}>
            {studentSubjects.map((ss: any) => (
              <div key={ss.id} className="flex justify-between py-1.5 border-b border-[#f6f8fa] text-xs">
                <span className="font-medium">{ss.subjects?.name} <span className="opacity-40 font-mono text-[9px]">{ss.subjects?.code}</span></span>
                <span className="opacity-70">{ss.teachers?.name || "—"}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <Card title="Guardians" className="mt-4">
        {guardians.map((g: any) => (
          <div key={g.id} className="grid grid-cols-2 gap-2 py-2 border-b border-[hsl(var(--border))] last:border-0">
            <InfoRow label="Name" value={g.name} />
            <InfoRow label="Relation" value={cap(g.relation || "—")} />
            <InfoRow label="Phone" value={g.phone || "—"} />
            <InfoRow label="Email" value={g.email || "—"} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function StudentModal({ id, students, onClose }: any) {
  const existing = id ? students.find((s: any) => s.id === id) : null;
  const [name, setName] = useState(existing?.full_name || "");
  const [form, setForm] = useState(existing?.form || "Form 1");
  const [gender, setGender] = useState(existing?.gender || "male");
  const [enrollment, setEnrollment] = useState(existing?.enrollment_number || "");
  const [className, setClassName] = useState(existing?.class_name || "");

  const handleSave = async () => {
    const payload = { full_name: name, form, gender, enrollment_number: enrollment, class_name: className, state: existing?.state || "active" };
    if (id) await supabase.from("students").update(payload).eq("id", id);
    else await supabase.from("students").insert(payload);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={id ? "Edit Student" : "New Student"} onClose={onClose} />
      <ModalBody>
        <FormSection title="Identity">
          <Field label="Name"><FieldInput value={name} onChange={setName} /></Field>
          <Field label="Enrollment"><FieldInput value={enrollment} onChange={setEnrollment} /></Field>
        </FormSection>
        <FormSection title="Placement">
          <Field label="Form"><FieldSelect value={form} onChange={setForm} options={FORMS.map(f => ({ value: f, label: f }))} /></Field>
          <Field label="Class"><FieldInput value={className} onChange={setClassName} /></Field>
        </FormSection>
      </ModalBody>
      <ModalFoot><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave}>Save</Btn></ModalFoot>
    </Modal>
  );
}

function ClassStudentModal({ assignment, onClose }: any) {
  const { data: students = [] } = useStudents();
  const [selectedId, setSelectedId] = useState("");
  const avail = students.filter((s: any) => s.form !== assignment.form || s.class_name !== assignment.class_name);

  return (
    <Modal onClose={onClose}>
      <ModalHead title={`Add to ${assignment.form} ${assignment.class_name}`} onClose={onClose} />
      <ModalBody>
        <Field label="Select Student">
          <select className="w-full p-2 bg-[hsl(var(--surface2))] rounded" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Select —</option>
            {avail.map((s: any) => <option key={s.id} value={s.id}>{s.full_name} ({s.form})</option>)}
          </select>
        </Field>
      </ModalBody>
      <ModalFoot><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={async () => {
        await supabase.from("students").update({ form: assignment.form, class_name: assignment.class_name }).eq("id", selectedId);
        onClose();
      }}>Add</Btn></ModalFoot>
    </Modal>
  );
}
