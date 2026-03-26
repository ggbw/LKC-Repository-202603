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

  const isHOD = user?.user_metadata?.role === "hod";
  const isHOY = user?.user_metadata?.role === "hoy";

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
        .map((ss: any) => ss.student_id),
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

  const allVisibleStudents = useMemo(() => {
    if (isAdmin || isHOD || isHOY) return students;
    if (isTeacher && myTeacher) {
      return students.filter((s: any) => classTeacherStudentIds.has(s.id) || subjectStudentIds.has(s.id));
    }
    if (isParent) return students.filter((s: any) => myChildIds.has(s.id));
    return [];
  }, [students, isAdmin, isTeacher, isParent, myTeacher, classTeacherStudentIds, subjectStudentIds, myChildIds, isHOD, isHOY]);

  const visibleStudents = useMemo(() => {
    if (isAdmin || !myTeacher) return allVisibleStudents;
    if (classTeacherStudentIds.size === 0) {
      return allVisibleStudents.filter((s: any) => subjectStudentIds.has(s.id));
    }
    if (teacherView === "my-class") {
      return allVisibleStudents.filter((s: any) => classTeacherStudentIds.has(s.id));
    }
    return allVisibleStudents.filter((s: any) => subjectStudentIds.has(s.id));
  }, [allVisibleStudents, isAdmin, myTeacher, teacherView, classTeacherStudentIds, subjectStudentIds]);

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

  const handleDownloadTemplate = () => {
    downloadExcel(
      [{ "Full Name": "", Form: "", Class: "", Gender: "", "Enrollment #": "", Email: "", "Date of Birth": "", Nationality: "", "Admission Date": "" }],
      "students_import_template",
      "Students",
    );
    showToast("Template downloaded");
  };

  const excelDateToISO = (val: any): string | null => {
    if (!val && val !== 0) return null;
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    if (typeof val === "number") return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
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
      let errors = 0;
      for (const row of data) {
        const name = row["Full Name"] || row["full_name"] || row["Name"] || row["name"];
        if (!name) continue;
        const { error } = await supabase.from("students").insert({
          full_name: String(name).trim(),
          form: row["Form"] || row["form"] || "Form 1",
          class_name: row["Class"] || row["class_name"] || null,
          gender: (row["Gender"] || row["gender"] || "").toLowerCase() || null,
          enrollment_number: row["Enrollment #"] || row["Enrollment"] || row["enrollment_number"] || null,
          email: row["Email"] || row["email"] || null,
          nationality: row["Nationality"] || row["nationality"] || null,
          date_of_birth: excelDateToISO(row["Date of Birth"] || row["date_of_birth"]),
          admission_date: excelDateToISO(row["Admission Date"] || row["admission_date"]),
          state: "active",
        });
        if (error) errors++;
        else count++;
      }
      if (errors > 0) showToast(`Imported ${count}/${count + errors} — some rows failed`, "error");
      else showToast(`Imported ${count} student${count !== 1 ? "s" : ""}`);
      invalidate(["students"]);
    } catch (e: any) {
      showToast(e.message, "error");
    }
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
            {isParent ? "My Children" : teacherView === "my-class" && classTeacherStudentIds.size > 0 ? "My Class Students" : "My Students"}
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {visibleStudents.length} {isParent ? "children" : "students"}
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}><i className="fas fa-download mr-1" /> Export</Btn>
          {isAdmin && (
            <>
              <Btn variant="outline" onClick={handleDownloadTemplate}><i className="fas fa-file-excel mr-1" /> Template</Btn>
              <Btn variant="outline" onClick={handleImport}><i className="fas fa-upload mr-1" /> Import</Btn>
              <Btn onClick={() => setModal("new")}><i className="fas fa-plus mr-1" /> New Student</Btn>
            </>
          )}
        </div>
      </div>

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="Search students...">
          <FilterSelect value={filterForm} onChange={setFilterForm} allLabel="All Forms" options={FORMS.map((f) => ({ value: f, label: f }))} />
        </SearchBar>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Enrollment", "Name", "Form", "Class", ...(myTeacher ? ["Subjects", "Relation"] : []), "Status", "Actions"].map((h) => (
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
                      <td className="py-2.5 px-4 text-[10px]">{(studentSubjectMap[s.id] || []).join(", ") || "—"}</td>
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
                    {isAdmin && <Btn variant="outline" size="sm" onClick={() => setModal(s.id)}><i className="fas fa-edit" /></Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <StudentModal
          id={modal === "new" ? null : modal}
          students={students}
          onClose={() => { setModal(null); invalidate(["students"]); }}
        />
      )}
    </div>
  );
}

function StudentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: students = [] } = useStudents();
  const { data: studentSubjects = [] } = useStudentSubjects(id);
  const { data: allParents = [] } = useParents();
  const { data: parentStudents = [] } = useParentStudents();

  const s = students.find((x: any) => x.id === id);
  if (!s) return <div className="p-4"><BackBtn onClick={onBack} label="Back" /><div>Not found</div></div>;

  const guardians = (allParents as any[]).filter((p: any) =>
    parentStudents.some((ps: any) => ps.student_id === id && ps.parent_id === p.id),
  );

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Students" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div
          className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(var(--surface2))", border: "2px solid hsl(var(--border))" }}
        >
          <i className={`fas fa-${s.gender === "female" ? "female" : "male"}`} style={{ fontSize: "28px", color: "#1a3fa0" }} />
        </div>
        <div>
          <div className="text-xl font-bold">{s.full_name}</div>
          <div className="flex gap-2 items-center flex-wrap mt-1.5">
            <Badge status={s.state || "active"} />
            <span className="text-[11px] font-mono" style={{ color: "hsl(var(--text2))" }}>{s.enrollment_number}</span>
            <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>{s.form} {s.class_name || ""}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card title={<><i className="fas fa-id-card mr-1.5" />Personal Information</>}>
          {[
            ["Date of Birth", formatDate(s.date_of_birth)],
            ["Gender", cap(s.gender || "")],
            ["Form", s.form],
            ["Class", s.class_name || "—"],
            ["Enrollment", s.enrollment_number || "—"],
            ["Email", s.email || "—"],
            ["Nationality", s.nationality || "—"],
            ["Admission Date", formatDate(s.admission_date)],
            ["Status", cap(s.state || "active")],
          ].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
        </Card>

        <Card title={<><i className="fas fa-book mr-1.5" />Subjects ({studentSubjects.length})</>}>
          {studentSubjects.length === 0 ? (
            <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>No subjects assigned</div>
          ) : (
            studentSubjects.map((ss: any) => (
              <div key={ss.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: "1px solid #f6f8fa" }}>
                <span className="font-semibold">{ss.subjects?.name}</span>
                <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>{ss.teachers?.name || "—"}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      <Card title={<><i className="fas fa-user-shield mr-1.5" />Parent / Guardian</>}>
        {guardians.length === 0 ? (
          <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>No guardian linked</div>
        ) : (
          <div className="flex flex-col gap-3">
            {guardians.map((g: any) => (
              <div key={g.id} className="grid grid-cols-2 gap-x-6 gap-y-1 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <InfoRow label="Name" value={g.name} />
                <InfoRow label="Relation" value={cap(g.relation || "—")} />
                <InfoRow label="Phone" value={g.phone || "—"} />
                <InfoRow label="Email" value={g.email || "—"} />
                {g.alternative_phone && <InfoRow label="Alt Phone" value={g.alternative_phone} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StudentModal({ id, students, onClose }: { id: string | null; students: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const { data: allParents = [] } = useParents();
  const { data: parentStudents = [] } = useParentStudents();
  const invalidate = useInvalidate();
  const existing = id ? students.find((s: any) => s.id === id) : null;

  const [name, setName] = useState(existing?.full_name || "");
  const [form, setForm] = useState(existing?.form || "Form 1");
  const [gender, setGender] = useState(existing?.gender || "male");
  const [enrollment, setEnrollment] = useState(existing?.enrollment_number || "");
  const [className, setClassName] = useState(existing?.class_name || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [dob, setDob] = useState(existing?.date_of_birth || "");
  const [nationality, setNationality] = useState(existing?.nationality || "");
  const [admissionDate, setAdmissionDate] = useState(existing?.admission_date || "");
  const [state, setState] = useState(existing?.state || "active");

  // Parent linking
  const linkedParentIds = new Set(
    (parentStudents as any[]).filter((ps: any) => ps.student_id === id).map((ps: any) => ps.parent_id),
  );
  const linkedParents = (allParents as any[]).filter((p: any) => linkedParentIds.has(p.id));
  const unlinkableParents = linkedParents;
  const linkableParents = (allParents as any[]).filter((p: any) => !linkedParentIds.has(p.id));
  const [addParentId, setAddParentId] = useState("");
  const [linking, setLinking] = useState(false);

  // New parent (create mode only)
  const [parentMode, setParentMode] = useState<"existing" | "new">("existing");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentRelation, setParentRelation] = useState("guardian");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [saving, setSaving] = useState(false);

  const handleLinkParent = async () => {
    if (!addParentId || !id) return;
    setLinking(true);
    await supabase.from("parent_students").insert({ parent_id: addParentId, student_id: id });
    invalidate(["parent_students"]);
    setAddParentId("");
    setLinking(false);
  };

  const handleUnlinkParent = async (parentId: string) => {
    if (!id) return;
    await supabase.from("parent_students").delete().eq("parent_id", parentId).eq("student_id", id);
    invalidate(["parent_students"]);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      full_name: name,
      form,
      gender,
      enrollment_number: enrollment || null,
      class_name: className || null,
      email: email || null,
      date_of_birth: dob || null,
      nationality: nationality || null,
      admission_date: admissionDate || null,
      state,
    };

    if (id) {
      const { error } = await supabase.from("students").update(payload).eq("id", id);
      if (error) { showToast(error.message, "error"); setSaving(false); return; }
      showToast("Student updated");
    } else {
      const { data: inserted, error } = await supabase
        .from("students")
        .insert({ ...payload, state: "active" })
        .select("id")
        .single();
      if (error) { showToast(error.message, "error"); setSaving(false); return; }

      const studentId = inserted.id;
      if (parentMode === "existing" && selectedParentId) {
        await supabase.from("parent_students").insert({ parent_id: selectedParentId, student_id: studentId });
      } else if (parentMode === "new" && parentName.trim()) {
        const { data: newParent, error: pe } = await supabase
          .from("parents")
          .insert({ name: parentName, relation: parentRelation, phone: parentPhone || null, email: parentEmail || null })
          .select("id")
          .single();
        if (!pe && newParent) {
          await supabase.from("parent_students").insert({ parent_id: newParent.id, student_id: studentId });
        }
      }
      invalidate(["students", "parents", "parent_students"]);
      showToast(`Student "${name}" created`);
    }
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={id ? "Edit Student" : "Add Student"} onClose={onClose} />
      <ModalBody>
        <FormSection title="Basic Information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" required><FieldInput value={name} onChange={setName} /></Field>
          <Field label="Form" required>
            <FieldSelect value={form} onChange={setForm} options={FORMS.map((f) => ({ value: f, label: f }))} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Gender">
            <FieldSelect value={gender} onChange={setGender} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
          </Field>
          <Field label="Enrollment #"><FieldInput value={enrollment} onChange={setEnrollment} /></Field>
          <Field label="Class"><FieldInput value={className} onChange={setClassName} placeholder="e.g. A, B, S" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><FieldInput value={email} onChange={setEmail} type="email" /></Field>
          <Field label="Nationality"><FieldInput value={nationality} onChange={setNationality} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth"><FieldInput value={dob} onChange={setDob} type="date" /></Field>
          <Field label="Admission Date"><FieldInput value={admissionDate} onChange={setAdmissionDate} type="date" /></Field>
        </div>
        {id && (
          <Field label="Status">
            <FieldSelect value={state} onChange={setState}
              options={["active", "suspended", "graduated", "transferred", "inactive"].map((s) => ({ value: s, label: cap(s) }))} />
          </Field>
        )}

        {/* ── Parent / Guardian linking (edit mode) ── */}
        {id && (
          <>
            <FormSection title="Parent / Guardian" />
            {unlinkableParents.length > 0 && (
              <div className="mb-2 flex flex-col gap-1">
                {unlinkableParents.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md px-3 py-2 text-[12px]"
                    style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border))" }}>
                    <span className="font-semibold">{p.name}</span>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      <span>{p.phone || ""}</span>
                      <Btn variant="danger" size="sm" onClick={() => handleUnlinkParent(p.id)}>Unlink</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {linkableParents.length > 0 && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FieldSelect value={addParentId} onChange={setAddParentId}
                    options={[{ value: "", label: "— Select parent to link —" }, ...linkableParents.map((p: any) => ({ value: p.id, label: `${p.name}${p.phone ? ` · ${p.phone}` : ""}` }))]} />
                </div>
                <Btn onClick={handleLinkParent} disabled={!addParentId || linking}>Link</Btn>
              </div>
            )}
          </>
        )}

        {/* ── Parent / Guardian (create mode) ── */}
        {!id && (
          <>
            <FormSection title="Parent / Guardian" />
            <div className="flex gap-2 mb-2">
              {(["existing", "new"] as const).map((m) => (
                <button key={m} onClick={() => setParentMode(m)}
                  className="px-3 py-1.5 rounded text-[11px] font-semibold border cursor-pointer"
                  style={{
                    background: parentMode === m ? "hsl(var(--primary))" : "hsl(var(--surface2))",
                    color: parentMode === m ? "#fff" : "hsl(var(--text2))",
                    borderColor: "hsl(var(--border))",
                  }}>
                  {m === "existing" ? "Link existing parent" : "Create new parent"}
                </button>
              ))}
            </div>
            {parentMode === "existing" ? (
              <FieldSelect value={selectedParentId} onChange={setSelectedParentId}
                options={[{ value: "", label: "— Select parent (optional) —" }, ...(allParents as any[]).map((p: any) => ({ value: p.id, label: p.name }))]} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Parent Name"><FieldInput value={parentName} onChange={setParentName} /></Field>
                  <Field label="Relation">
                    <FieldSelect value={parentRelation} onChange={setParentRelation}
                      options={["father", "mother", "guardian", "grandparent", "other"].map((r) => ({ value: r, label: cap(r) }))} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Parent Phone"><FieldInput value={parentPhone} onChange={setParentPhone} type="tel" /></Field>
                  <Field label="Parent Email"><FieldInput value={parentEmail} onChange={setParentEmail} type="email" /></Field>
                </div>
              </>
            )}
          </>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : id ? "Update" : "Create"}</Btn>
      </ModalFoot>
    </Modal>
  );
}
