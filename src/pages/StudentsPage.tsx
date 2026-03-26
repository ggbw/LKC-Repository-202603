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
  
  // Custom Role checks from metadata
  const isHOD = user?.user_metadata?.role === 'hod';
  const isHOY = user?.user_metadata?.role === 'hoy';

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
    if (!myTeacher) return new Set<string>();
    return new Set(
      students
        .filter((s: any) => myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name))
        .map((s: any) => s.id),
    );
  }, [myTeacher, students, myClassAssignments]);

  const subjectStudentIds = useMemo(() => {
    if (!myTeacher) return new Set<string>();
    return new Set(
      studentSubjects
        .filter((ss: any) => mySubjectIds.includes(ss.subject_id))
        .map((ss: any) => ss.student_id)
    );
  }, [myTeacher, studentSubjects, mySubjectIds]);

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

  // Logic for visibility based on role
  const allVisibleStudents = useMemo(() => {
    if (isAdmin || isHOD || isHOY) return students;
    if (isTeacher && myTeacher) {
      return students.filter((s: any) => classTeacherStudentIds.has(s.id) || subjectStudentIds.has(s.id));
    }
    if (isParent) return students.filter((s: any) => myChildIds.has(s.id));
    return [];
  }, [students, isAdmin, isTeacher, isParent, myTeacher, classTeacherStudentIds, subjectStudentIds, myChildIds, isHOD, isHOY]);

  // Logic for the Toggle and the Table View
  const visibleStudents = useMemo(() => {
    if (isAdmin || !myTeacher) return allVisibleStudents;

    // If they aren't a class teacher, strictly show subject students (HOD/HOY/Teacher)
    if (classTeacherStudentIds.size === 0) {
      return allVisibleStudents.filter((s: any) => subjectStudentIds.has(s.id));
    }

    // If they have a class, respect the toggle view
    if (teacherView === "my-class") {
      return allVisibleStudents.filter((s: any) => classTeacherStudentIds.has(s.id));
    }
    return allVisibleStudents.filter((s: any) => subjectStudentIds.has(s.id));
  }, [allVisibleStudents, isAdmin, myTeacher, teacherView, classTeacherStudentIds, subjectStudentIds]);

  // Toggle Visibility Condition
  const showToggles = !isAdmin && (isTeacher || isHOD || isHOY) && classTeacherStudentIds.size > 0;

  const studentSubjectMap = useMemo(() => {
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
  }, [studentSubjects, mySubjectIds, subjects]);

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
      })),
      "students_export",
      "Students",
    );
    showToast("Students exported");
  };

  const handleImport = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      if (!data.length) { showToast("File is empty", "error"); return; }
      for (const row of data) {
        const name = row["Full Name"] || row["full_name"] || row["Name"];
        if (!name) continue;
        await supabase.from("students").insert({
          full_name: String(name).trim(),
          form: row["Form"] || "Form 1",
          class_name: row["Class"] || null,
          state: "active",
        });
      }
      showToast(`Import completed`);
      invalidate(["students"]);
    } catch (e: any) { showToast(e.message, "error"); }
  };

  if (isLoading) return <div className="page-animate p-4 text-sm opacity-60">Loading...</div>;

  return (
    <div className="page-animate">
      {showToggles && (
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
            {isParent ? "My Children" : (teacherView === "my-class" && classTeacherStudentIds.size > 0 ? "My Class Students" : "My Students")}
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
        </div>
      </div>

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍 Search students...">
          <FilterSelect value={filterForm} onChange={setFilterForm} allLabel="All Forms" options={FORMS.map(f => ({ value: f, label: f }))} />
        </SearchBar>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Enrollment", "Name", "Form", "Class", ...(myTeacher ? ["Subjects", "Relation"] : []), "Status", "Actions"].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] font-semibold uppercase opacity-60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s.id} className="hover:bg-[hsl(var(--surface2))] transition-colors" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <td className="py-2.5 px-4 font-mono text-[11px] opacity-60">{s.enrollment_number || "—"}</td>
                  <td className="py-2.5 px-4 font-semibold cursor-pointer text-[#1a3fa0]" onClick={() => setDetail(s.id)}>{s.full_name}</td>
                  <td className="py-2.5 px-4">{s.form}</td>
                  <td className="py-2.5 px-4">{s.class_name || "—"}</td>
                  {myTeacher && (
                    <>
                      <td className="py-2.5 px-4 text-[10px]">{ (studentSubjectMap[s.id] || []).join(", ") || "—" }</td>
                      <td className="py-2.5 px-4">
                        <div className="flex gap-1">
                          {subjectStudentIds.has(s.id) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#ddf4ff] text-[#0969da]">Subject</span>}
                          {classTeacherStudentIds.has(s.id) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#dafbe1] text-[#1a7f37]">My Class</span>}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-4"><Badge status={s.state || "active"} /></td>
                  <td className="py-2.5 px-4">
                    <div className="flex gap-1">
                      {isAdmin && <Btn variant="outline" size="sm" onClick={() => setModal(s.id)}><i className="fas fa-edit" /></Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && <StudentModal id={modal === "new" ? null : modal} students={students} onClose={() => { setModal(null); invalidate(["students"]); }} />}
    </div>
  );
}

// Sub-components (StudentDetail and StudentModal) remain as defined in the previous block...
function StudentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: students = [] } = useStudents();
  const { data: studentSubjects = [] } = useStudentSubjects(id);
  const s = students.find((x: any) => x.id === id);
  if (!s) return <div className="p-4"><BackBtn onClick={onBack} label="Back" /><div>Not found</div></div>;
  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Students" />
      <Card title={s.full_name}>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Enrollment" value={s.enrollment_number} />
          <InfoRow label="Form" value={s.form} />
          <InfoRow label="Class" value={s.class_name} />
          <InfoRow label="Status" value={cap(s.state)} />
        </div>
        <div className="mt-6">
          <div className="text-xs font-bold mb-2">Subjects</div>
          {studentSubjects.map((ss: any) => (
            <div key={ss.id} className="py-2 border-b border-[hsl(var(--border))] text-sm flex justify-between">
              <span>{ss.subjects?.name}</span>
              <span className="opacity-60">{ss.teachers?.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StudentModal({ id, students, onClose }: any) {
  const existing = id ? students.find((s: any) => s.id === id) : null;
  const [name, setName] = useState(existing?.full_name || "");
  const [form, setForm] = useState(existing?.form || "Form 1");
  const [enrollment, setEnrollment] = useState(existing?.enrollment_number || "");
  const [className, setClassName] = useState(existing?.class_name || "");

  const handleSave = async () => {
    const payload = { full_name: name, form, enrollment_number: enrollment, class_name: className };
    if (id) await supabase.from("students").update(payload).eq("id", id);
    else await supabase.from("students").insert({ ...payload, state: "active" });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={id ? "Edit Student" : "New Student"} onClose={onClose} />
      <ModalBody>
        <Field label="Full Name"><FieldInput value={name} onChange={setName} /></Field>
        <Field label="Enrollment"><FieldInput value={enrollment} onChange={setEnrollment} /></Field>
        <Field label="Form"><FieldSelect value={form} onChange={setForm} options={FORMS.map(f => ({ value: f, label: f }))} /></Field>
        <Field label="Class"><FieldInput value={className} onChange={setClassName} /></Field>
      </ModalBody>
      <ModalFoot><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave}>Save</Btn></ModalFoot>
    </Modal>
}
