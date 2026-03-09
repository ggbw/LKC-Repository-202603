import React, { useState, useMemo } from "react";
import {
  useSubjects,
  useTeachers,
  useStudents,
  useHODAssignments,
  useHOYAssignments,
  useSubjectTeachers,
  useStudentSubjects,
  useClassTeachers,
  useInvalidate,
  useAcademicYears,
  useForms,
  useUserRoles,
  useClasses,
  useProfiles,
} from "@/hooks/useSupabaseData";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { FORMS, cap } from "@/data/database";
import {
  Card,
  Badge,
  Btn,
  FilterSelect,
  Modal,
  ModalHead,
  ModalBody,
  ModalFoot,
  Field,
  FieldInput,
  FieldSelect,
  SearchBar,
} from "@/components/SharedUI";

const ALL_ROLES = ["admin", "teacher", "student", "parent", "hod", "hoy"] as const;
type AppRole = (typeof ALL_ROLES)[number];

export default function ConfigPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: hodAssignments = [] } = useHODAssignments();
  const { data: hoyAssignments = [] } = useHOYAssignments();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: studentSubjects = [] } = useStudentSubjects();
  const { data: classTeachers = [] } = useClassTeachers();
  const { isAdmin } = useAuth();
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const [hodModal, setHodModal] = useState(false);
  const [hoyModal, setHoyModal] = useState(false);
  const [stModal, setStModal] = useState(false);
  const [ssModal, setSsModal] = useState(false);
  const [ctModal, setCtModal] = useState(false);
  const [tab, setTab] = useState<"general" | "subject-teacher" | "subject-student" | "class-teacher">("general");

  const tabs = [
    ["general", "General"],
    ["subject-teacher", `Subject → Teacher (${subjectTeachers.length})`],
    ["subject-student", `Subject → Student (${studentSubjects.length})`],
    ["class-teacher", `Class Teachers (${classTeachers.length})`],
  ];

  return (
    <div className="page-animate">
      <div className="text-lg font-bold mb-4">
        <i className="fas fa-cogs mr-2" />
        Configuration
      </div>

      <div className="flex mb-3" style={{ borderBottom: "2px solid hsl(var(--border))" }}>
        {tabs.map(([id, label]) => (
          <div
            key={id}
            onClick={() => setTab(id as any)}
            className="py-2 px-4 text-[12px] font-semibold cursor-pointer"
            style={{
              borderBottom: tab === id ? "2px solid #1a3fa0" : "2px solid transparent",
              color: tab === id ? "#1a3fa0" : "hsl(var(--text2))",
              marginBottom: "-2px",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {tab === "general" && (
        <GeneralTab
          subjects={subjects}
          teachers={teachers}
          hodAssignments={hodAssignments}
          hoyAssignments={hoyAssignments}
          isAdmin={isAdmin}
          showToast={showToast}
          invalidate={invalidate}
          setHodModal={setHodModal}
          setHoyModal={setHoyModal}
        />
      )}

      {tab === "subject-teacher" && (
        <SubjectTeacherTab
          subjectTeachers={subjectTeachers}
          subjects={subjects}
          teachers={teachers}
          isAdmin={isAdmin}
          showToast={showToast}
          invalidate={invalidate}
          onAdd={() => setStModal(true)}
        />
      )}

      {tab === "subject-student" && (
        <SubjectStudentTab
          studentSubjects={studentSubjects}
          subjects={subjects}
          students={students}
          isAdmin={isAdmin}
          showToast={showToast}
          invalidate={invalidate}
          onAdd={() => setSsModal(true)}
        />
      )}

      {tab === "class-teacher" && (
        <ClassTeacherTab
          classTeachers={classTeachers}
          teachers={teachers}
          students={students}
          isAdmin={isAdmin}
          showToast={showToast}
          invalidate={invalidate}
          onAdd={() => setCtModal(true)}
        />
      )}

      {hodModal && (
        <RoleModal
          type="hod"
          teachers={teachers}
          onClose={() => {
            setHodModal(false);
            invalidate(["hod_assignments"]);
          }}
        />
      )}
      {hoyModal && (
        <RoleModal
          type="hoy"
          teachers={teachers}
          onClose={() => {
            setHoyModal(false);
            invalidate(["hoy_assignments"]);
          }}
        />
      )}
      {stModal && (
        <SubjectTeacherModal
          subjects={subjects}
          teachers={teachers}
          onClose={() => {
            setStModal(false);
            invalidate(["subject_teachers"]);
          }}
        />
      )}
      {ssModal && (
        <SubjectStudentModal
          subjects={subjects}
          students={students}
          onClose={() => {
            setSsModal(false);
            invalidate(["student_subjects"]);
          }}
        />
      )}
      {ctModal && (
        <ClassTeacherModal
          teachers={teachers}
          students={students}
          onClose={() => {
            setCtModal(false);
            invalidate(["class_teachers"]);
          }}
        />
      )}
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({
  subjects,
  teachers,
  hodAssignments,
  hoyAssignments,
  isAdmin,
  showToast,
  invalidate,
  setHodModal,
  setHoyModal,
}: any) {
  const { data: academicYears = [] } = useAcademicYears();
  const { data: forms = [] } = useForms();
  const { data: classes = [] } = useClasses();
  const { data: userRoles = [] } = useUserRoles();
  const { data: profiles = [] } = useProfiles();

  // ── Academic Years state ──
  const [newYear, setNewYear] = useState("");
  const [yearStatus, setYearStatus] = useState("active");
  const [editYear, setEditYear] = useState<any>(null);
  const [savingYear, setSavingYear] = useState(false);

  // ── Subjects state ──
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [editSubject, setEditSubject] = useState<any>(null);
  const [savingSubject, setSavingSubject] = useState(false);

  // ── Forms state ──
  const [newFormName, setNewFormName] = useState("");
  const [editForm, setEditForm] = useState<any>(null);
  const [savingForm, setSavingForm] = useState(false);

  // ── Classes state ──
  const [newClassName, setNewClassName] = useState("");
  const [newClassForm, setNewClassForm] = useState("Form 1");
  const [editClass, setEditClass] = useState<any>(null);
  const [savingClass, setSavingClass] = useState(false);

  // ── User Roles state ──
  const [userRoleModal, setUserRoleModal] = useState<
    false | { id: string; user_id: string; role: string; name: string }
  >(false);

  // Group roles by user
  const rolesByUser = useMemo(() => {
    const map: Record<string, string[]> = {};
    userRoles.forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r.role);
    });
    return map;
  }, [userRoles]);

  // ── Academic year actions ──
  const addYear = async () => {
    if (!newYear.trim()) return;
    setSavingYear(true);
    const { error } = (await supabase
      .from("academic_years")
      .insert({ year: newYear.trim(), status: yearStatus })) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Year ${newYear} added`);
      invalidate(["academic_years"]);
      setNewYear("");
    }
    setSavingYear(false);
  };
  const updateYear = async () => {
    if (!editYear) return;
    setSavingYear(true);
    const { error } = (await supabase
      .from("academic_years")
      .update({ year: editYear.year, status: editYear.status })
      .eq("id", editYear.id)) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Year updated");
      invalidate(["academic_years"]);
      setEditYear(null);
    }
    setSavingYear(false);
  };
  const deleteYear = async (id: string, year: string) => {
    if (!confirm(`Delete academic year ${year}?`)) return;
    const { error } = (await supabase.from("academic_years").delete().eq("id", id)) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Year ${year} deleted`);
      invalidate(["academic_years"]);
    }
  };

  // ── Subject actions ──
  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    setSavingSubject(true);
    const { error } = (await supabase
      .from("subjects")
      .insert({ name: newSubjectName.trim(), code: newSubjectCode.trim() || null })) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Subject "${newSubjectName}" added`);
      invalidate(["subjects"]);
      setNewSubjectName("");
      setNewSubjectCode("");
    }
    setSavingSubject(false);
  };
  const updateSubject = async () => {
    if (!editSubject) return;
    setSavingSubject(true);
    const { error } = (await supabase
      .from("subjects")
      .update({ name: editSubject.name, code: editSubject.code || null })
      .eq("id", editSubject.id)) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Subject updated");
      invalidate(["subjects"]);
      setEditSubject(null);
    }
    setSavingSubject(false);
  };
  const deleteSubject = async (id: string, name: string) => {
    if (!confirm(`Delete subject "${name}"? This may affect existing assignments.`)) return;
    const { error } = (await supabase.from("subjects").delete().eq("id", id)) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Subject "${name}" deleted`);
      invalidate(["subjects"]);
    }
  };

  // ── Class actions ──
  const addClassEntry = async () => {
    if (!newClassName.trim()) return;
    setSavingClass(true);
    const { error } = await (supabase as any).from("classes").insert({ form: newClassForm, name: newClassName.trim() });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Class "${newClassName}" added`);
      invalidate(["classes"]);
      setNewClassName("");
    }
    setSavingClass(false);
  };
  const updateClass = async () => {
    if (!editClass) return;
    setSavingClass(true);
    const { error } = await (supabase as any)
      .from("classes")
      .update({ form: editClass.form, name: editClass.name })
      .eq("id", editClass.id);
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Class updated");
      invalidate(["classes"]);
      setEditClass(null);
    }
    setSavingClass(false);
  };
  const deleteClass = async (id: string, name: string) => {
    if (!confirm(`Delete class "${name}"? Students will be unassigned.`)) return;
    await (supabase as any).from("students").update({ class_name: null }).eq("class_name", name);
    const { error } = await (supabase as any).from("classes").delete().eq("id", id);
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Class "${name}" deleted`);
      invalidate(["classes", "students"]);
    }
  };

  // ── Form actions ──
  const addForm = async () => {
    if (!newFormName.trim()) return;
    setSavingForm(true);
    const maxOrder = forms.length > 0 ? Math.max(...forms.map((f: any) => f.sort_order)) + 1 : 1;
    const { error } = (await supabase.from("forms").insert({ name: newFormName.trim(), sort_order: maxOrder })) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Form "${newFormName}" added`);
      invalidate(["forms"]);
      setNewFormName("");
    }
    setSavingForm(false);
  };
  const updateForm = async () => {
    if (!editForm) return;
    setSavingForm(true);
    const { error } = (await supabase
      .from("forms")
      .update({ name: editForm.name, sort_order: editForm.sort_order })
      .eq("id", editForm.id)) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Form updated");
      invalidate(["forms"]);
      setEditForm(null);
    }
    setSavingForm(false);
  };
  const deleteForm = async (id: string, name: string) => {
    if (!confirm(`Delete form "${name}"? This will not affect existing students.`)) return;
    const { error } = (await supabase.from("forms").delete().eq("id", id)) as any;
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Form "${name}" deleted`);
      invalidate(["forms"]);
    }
  };

  return (
    <div className="space-y-4">
      {/* ══ Academic Years ══ */}
      <Card
        title={
          <>
            <i className="fas fa-calendar-alt mr-1.5" />
            Academic Years
          </>
        }
      >
        <table className="w-full border-collapse text-[12.5px] mb-3">
          <thead>
            <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
              {["Year", "Status", ...(isAdmin ? ["Actions"] : [])].map((h) => (
                <th
                  key={h}
                  className="py-2 px-3 text-left text-[10px] font-semibold uppercase"
                  style={{ color: "hsl(var(--text2))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {academicYears.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-xs" style={{ color: "hsl(var(--text3))" }}>
                  No academic years
                </td>
              </tr>
            )}
            {academicYears.map((y: any) => (
              <tr key={y.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                {editYear?.id === y.id ? (
                  <>
                    <td className="py-1.5 px-3">
                      <input
                        className="border rounded px-2 py-1 text-[12px] w-24"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editYear.year}
                        onChange={(e) => setEditYear({ ...editYear, year: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <select
                        className="border rounded px-2 py-1 text-[12px]"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editYear.status}
                        onChange={(e) => setEditYear({ ...editYear, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex gap-1">
                        <Btn size="sm" onClick={updateYear} disabled={savingYear}>
                          {savingYear ? "…" : "Save"}
                        </Btn>
                        <Btn variant="outline" size="sm" onClick={() => setEditYear(null)}>
                          Cancel
                        </Btn>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 font-semibold">{y.year}</td>
                    <td className="py-2 px-3">
                      <Badge status={y.status} />
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={() => setEditYear({ ...y })}>
                            <i className="fas fa-edit" />
                          </Btn>
                          <Btn variant="danger" size="sm" onClick={() => deleteYear(y.id, y.year)}>
                            <i className="fas fa-trash" />
                          </Btn>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <div className="flex gap-2 items-end pt-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div className="flex-1">
              <div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--text2))" }}>
                Year
              </div>
              <input
                className="w-full border rounded-md py-[7px] px-3 text-[12.5px]"
                style={{ borderColor: "hsl(var(--border))" }}
                placeholder="e.g. 2027"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addYear()}
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--text2))" }}>
                Status
              </div>
              <select
                className="border rounded-md py-[7px] px-3 text-[12.5px]"
                style={{ borderColor: "hsl(var(--border))" }}
                value={yearStatus}
                onChange={(e) => setYearStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <Btn onClick={addYear} disabled={savingYear || !newYear.trim()}>
              <i className="fas fa-plus mr-1" />
              {savingYear ? "Adding…" : "Add Year"}
            </Btn>
          </div>
        )}
      </Card>

      {/* ══ Subjects ══ */}
      <Card
        title={
          <>
            <i className="fas fa-book mr-1.5" />
            Subjects ({subjects.length})
          </>
        }
      >
        <table className="w-full border-collapse text-[12.5px] mb-3">
          <thead>
            <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
              {["Name", "Code", ...(isAdmin ? ["Actions"] : [])].map((h) => (
                <th
                  key={h}
                  className="py-2 px-3 text-left text-[10px] font-semibold uppercase"
                  style={{ color: "hsl(var(--text2))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                {editSubject?.id === s.id ? (
                  <>
                    <td className="py-1.5 px-3">
                      <input
                        className="border rounded px-2 py-1 text-[12px] w-full"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editSubject.name}
                        onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        className="border rounded px-2 py-1 text-[12px] w-20"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editSubject.code || ""}
                        onChange={(e) => setEditSubject({ ...editSubject, code: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex gap-1">
                        <Btn size="sm" onClick={updateSubject} disabled={savingSubject}>
                          {savingSubject ? "…" : "Save"}
                        </Btn>
                        <Btn variant="outline" size="sm" onClick={() => setEditSubject(null)}>
                          Cancel
                        </Btn>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 font-semibold">{s.name}</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      {s.code || "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={() => setEditSubject({ ...s })}>
                            <i className="fas fa-edit" />
                          </Btn>
                          <Btn variant="danger" size="sm" onClick={() => deleteSubject(s.id, s.name)}>
                            <i className="fas fa-trash" />
                          </Btn>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <div className="flex gap-2 items-end pt-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div className="flex-1">
              <div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--text2))" }}>
                Subject Name
              </div>
              <input
                className="w-full border rounded-md py-[7px] px-3 text-[12.5px]"
                style={{ borderColor: "hsl(var(--border))" }}
                placeholder="e.g. Mathematics"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
              />
            </div>
            <div className="w-28">
              <div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--text2))" }}>
                Code
              </div>
              <input
                className="w-full border rounded-md py-[7px] px-3 text-[12.5px]"
                style={{ borderColor: "hsl(var(--border))" }}
                placeholder="e.g. MATH"
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value)}
              />
            </div>
            <Btn onClick={addSubject} disabled={savingSubject || !newSubjectName.trim()}>
              <i className="fas fa-plus mr-1" />
              {savingSubject ? "Adding…" : "Add Subject"}
            </Btn>
          </div>
        )}
      </Card>

      {/* ══ Forms ══ */}
      <Card
        title={
          <>
            <i className="fas fa-school mr-1.5" />
            Forms ({forms.length})
          </>
        }
      >
        <table className="w-full border-collapse text-[12.5px] mb-3">
          <thead>
            <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
              {["Form Name", "Sort Order", ...(isAdmin ? ["Actions"] : [])].map((h) => (
                <th
                  key={h}
                  className="py-2 px-3 text-left text-[10px] font-semibold uppercase"
                  style={{ color: "hsl(var(--text2))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forms.map((f: any) => (
              <tr key={f.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                {editForm?.id === f.id ? (
                  <>
                    <td className="py-1.5 px-3">
                      <input
                        className="border rounded px-2 py-1 text-[12px]"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-[12px] w-16"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editForm.sort_order}
                        onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex gap-1">
                        <Btn size="sm" onClick={updateForm} disabled={savingForm}>
                          {savingForm ? "…" : "Save"}
                        </Btn>
                        <Btn variant="outline" size="sm" onClick={() => setEditForm(null)}>
                          Cancel
                        </Btn>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 font-semibold">{f.name}</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      {f.sort_order}
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={() => setEditForm({ ...f })}>
                            <i className="fas fa-edit" />
                          </Btn>
                          <Btn variant="danger" size="sm" onClick={() => deleteForm(f.id, f.name)}>
                            <i className="fas fa-trash" />
                          </Btn>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <div className="flex gap-2 items-end pt-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div className="flex-1">
              <div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--text2))" }}>
                Form Name
              </div>
              <input
                className="w-full border rounded-md py-[7px] px-3 text-[12.5px]"
                style={{ borderColor: "hsl(var(--border))" }}
                placeholder="e.g. Form 7"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addForm()}
              />
            </div>
            <Btn onClick={addForm} disabled={savingForm || !newFormName.trim()}>
              <i className="fas fa-plus mr-1" />
              {savingForm ? "Adding…" : "Add Form"}
            </Btn>
          </div>
        )}
      </Card>

      {/* ══ Classes ══ */}
      <Card
        title={
          <>
            <i className="fas fa-layer-group mr-1.5" />
            Classes ({classes.length})
          </>
        }
      >
        <table className="w-full border-collapse text-[12.5px] mb-3">
          <thead>
            <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
              {["Form", "Class Name", "Students", ...(isAdmin ? ["Actions"] : [])].map((h) => (
                <th
                  key={h}
                  className="py-2 px-3 text-left text-[10px] font-semibold uppercase"
                  style={{ color: "hsl(var(--text2))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-xs" style={{ color: "hsl(var(--text3))" }}>
                  No classes yet
                </td>
              </tr>
            )}
            {classes.map((c: any) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                {editClass?.id === c.id ? (
                  <>
                    <td className="py-1.5 px-3">
                      <select
                        className="border rounded px-2 py-1 text-[12px]"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editClass.form}
                        onChange={(e) => setEditClass({ ...editClass, form: e.target.value })}
                      >
                        {FORMS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        className="border rounded px-2 py-1 text-[12px] w-24"
                        style={{ borderColor: "hsl(var(--border))" }}
                        value={editClass.name}
                        onChange={(e) => setEditClass({ ...editClass, name: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 px-3" />
                    <td className="py-1.5 px-3">
                      <div className="flex gap-1">
                        <Btn size="sm" onClick={updateClass} disabled={savingClass}>
                          {savingClass ? "…" : "Save"}
                        </Btn>
                        <Btn variant="outline" size="sm" onClick={() => setEditClass(null)}>
                          Cancel
                        </Btn>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      {c.form}
                    </td>
                    <td className="py-2 px-3 font-semibold">{c.name}</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      {subjects.length > 0 ? "—" : "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={() => setEditClass({ ...c })}>
                            <i className="fas fa-edit" />
                          </Btn>
                          <Btn variant="danger" size="sm" onClick={() => deleteClass(c.id, c.name)}>
                            <i className="fas fa-trash" />
                          </Btn>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <div className="flex gap-2 items-end pt-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div>
              <div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--text2))" }}>
                Form
              </div>
              <select
                className="border rounded-md py-[7px] px-3 text-[12.5px]"
                style={{ borderColor: "hsl(var(--border))" }}
                value={newClassForm}
                onChange={(e) => setNewClassForm(e.target.value)}
              >
                {FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--text2))" }}>
                Class Name
              </div>
              <input
                className="w-full border rounded-md py-[7px] px-3 text-[12.5px]"
                style={{ borderColor: "hsl(var(--border))" }}
                placeholder="e.g. 5B, Mango, North…"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addClassEntry()}
              />
            </div>
            <Btn onClick={addClassEntry} disabled={savingClass || !newClassName.trim()}>
              <i className="fas fa-plus mr-1" />
              {savingClass ? "Adding…" : "Add Class"}
            </Btn>
          </div>
        )}
      </Card>

      {/* ══ User Roles ══ */}
      <Card
        title={
          <>
            <i className="fas fa-user-shield mr-1.5" />
            User Roles ({userRoles.length})
          </>
        }
        titleRight={
          isAdmin && (
            <Btn size="sm" onClick={() => setUserRoleModal({ id: "", user_id: "", role: "student", name: "" })}>
              <i className="fas fa-plus mr-1" />
              Assign Role
            </Btn>
          )
        }
      >
        {userRoles.length === 0 ? (
          <div className="text-xs py-4 text-center" style={{ color: "hsl(var(--text3))" }}>
            No role assignments found
          </div>
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["User", "Email", "Role", ...(isAdmin ? ["Actions"] : [])].map((h) => (
                  <th
                    key={h}
                    className="py-2 px-3 text-left text-[10px] font-semibold uppercase"
                    style={{ color: "hsl(var(--text2))" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userRoles.map((r: any) => {
                const profile = profiles.find((p: any) => p.user_id === r.user_id);
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                    <td className="py-2 px-3 font-semibold">
                      {profile?.full_name || (
                        <span className="font-mono text-[10px]" style={{ color: "hsl(var(--text3))" }}>
                          {r.user_id.slice(0, 12)}…
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      {profile?.email || "—"}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          background:
                            r.role === "admin"
                              ? "#ffeef0"
                              : r.role === "teacher"
                                ? "#ddf4ff"
                                : r.role === "student"
                                  ? "#dafbe1"
                                  : "#fff8c5",
                          color:
                            r.role === "admin"
                              ? "#cf222e"
                              : r.role === "teacher"
                                ? "#0969da"
                                : r.role === "student"
                                  ? "#1a7f37"
                                  : "#9a6700",
                        }}
                      >
                        {r.role}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Btn
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setUserRoleModal({
                                id: r.id,
                                user_id: r.user_id,
                                role: r.role,
                                name: profile?.full_name || r.user_id,
                              })
                            }
                          >
                            <i className="fas fa-edit" />
                          </Btn>
                          <Btn
                            variant="danger"
                            size="sm"
                            onClick={async () => {
                              if (!confirm(`Remove ${r.role} role from ${profile?.full_name || "this user"}?`)) return;
                              await supabase.from("user_roles").delete().eq("id", r.id);
                              invalidate(["user_roles"]);
                              showToast("Role removed");
                            }}
                          >
                            <i className="fas fa-trash" />
                          </Btn>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* ══ HOD/HOY ══ */}
      <div className="grid grid-cols-2 gap-3.5">
        <Card
          title={
            <>
              <i className="fas fa-chart-line mr-1.5" />
              HOD Assignments
            </>
          }
          titleRight={
            isAdmin && (
              <Btn variant="outline" size="sm" onClick={() => setHodModal(true)}>
                <i className="fas fa-plus mr-1" />
                Assign
              </Btn>
            )
          }
        >
          {hodAssignments.length === 0 ? (
            <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>
              No HOD assignments
            </div>
          ) : (
            hodAssignments.map((h: any) => (
              <div
                key={h.id}
                className="flex justify-between py-[7px] text-[12.5px]"
                style={{ borderBottom: "1px solid #f6f8fa" }}
              >
                <span className="font-semibold">{h.teachers?.name || "—"}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: "hsl(var(--text2))" }}>{h.department}</span>
                  {isAdmin && (
                    <Btn
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        await supabase.from("hod_assignments").delete().eq("id", h.id);
                        invalidate(["hod_assignments"]);
                        showToast("HOD assignment removed");
                      }}
                    >
                      <i className="fas fa-trash" />
                    </Btn>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
        <Card
          title={
            <>
              <i className="fas fa-chart-pie mr-1.5" />
              HOY Assignments
            </>
          }
          titleRight={
            isAdmin && (
              <Btn variant="outline" size="sm" onClick={() => setHoyModal(true)}>
                <i className="fas fa-plus mr-1" />
                Assign
              </Btn>
            )
          }
        >
          {hoyAssignments.length === 0 ? (
            <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>
              No HOY assignments
            </div>
          ) : (
            hoyAssignments.map((h: any) => (
              <div
                key={h.id}
                className="flex justify-between py-[7px] text-[12.5px]"
                style={{ borderBottom: "1px solid #f6f8fa" }}
              >
                <span className="font-semibold">{h.teachers?.name || "—"}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: "hsl(var(--text2))" }}>{h.form}</span>
                  {isAdmin && (
                    <Btn
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        await supabase.from("hoy_assignments").delete().eq("id", h.id);
                        invalidate(["hoy_assignments"]);
                        showToast("HOY assignment removed");
                      }}
                    >
                      <i className="fas fa-trash" />
                    </Btn>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {userRoleModal !== false && (
        <UserRoleModal
          existing={userRoleModal}
          profiles={profiles}
          onClose={() => {
            setUserRoleModal(false);
            invalidate(["user_roles"]);
          }}
        />
      )}
    </div>
  );
}

// ─── User Role Modal ──────────────────────────────────────────────────────────

function UserRoleModal({
  existing,
  profiles,
  onClose,
}: {
  existing: { id: string; user_id: string; role: string; name: string } | false;
  profiles: any[];
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const isEdit = existing !== false && existing.id !== "";

  const [selectedUserId, setSelectedUserId] = useState(isEdit ? existing.user_id : "");
  const [role, setRole] = useState<AppRole>(isEdit ? (existing.role as AppRole) : "student");
  const [saving, setSaving] = useState(false);

  const selectedProfile = profiles.find((p: any) => p.user_id === selectedUserId);

  const save = async () => {
    if (!selectedUserId || !role) return;
    setSaving(true);
    if (isEdit) {
      // Update: delete old + insert new (role is part of unique key so can't update in place)
      await supabase.from("user_roles").delete().eq("id", existing.id);
      const { error } = (await supabase
        .from("user_roles")
        .upsert({ user_id: selectedUserId, role }, { onConflict: "user_id,role" })) as any;
      if (error) {
        showToast(error.message, "error");
        setSaving(false);
        return;
      }
      showToast(`Role updated to "${role}"`);
    } else {
      const { error } = (await supabase
        .from("user_roles")
        .upsert({ user_id: selectedUserId, role }, { onConflict: "user_id,role" })) as any;
      if (error) {
        showToast(error.message, "error");
        setSaving(false);
        return;
      }
      showToast(`Role "${role}" assigned to ${selectedProfile?.full_name || "user"}`);
    }
    invalidate(["user_roles"]);
    setSaving(false);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={isEdit ? `Edit Role — ${existing.name}` : "Assign User Role"} onClose={onClose} />
      <ModalBody>
        {!isEdit && (
          <Field label="User" required>
            <select
              className="w-full border rounded-md py-[7px] px-3 text-[12.5px]"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface))" }}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">— Select user —</option>
              {profiles.map((p: any) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.full_name}
                  {p.email ? ` (${p.email})` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        {isEdit && (
          <div
            className="rounded-md px-3 py-2.5 mb-3 text-[12px]"
            style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="font-semibold">{existing.name}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--text2))" }}>
              Current role: <span className="font-semibold">{existing.role}</span>
            </div>
          </div>
        )}

        <Field label="Role" required>
          <FieldSelect
            value={role}
            onChange={(v) => setRole(v as AppRole)}
            options={ALL_ROLES.map((r) => ({ value: r, label: cap(r) }))}
          />
        </Field>

        {!isEdit && selectedProfile && (
          <div
            className="rounded-md px-3 py-2 text-[11px] mt-1"
            style={{ background: "#dafbe1", border: "1px solid #aceebb", color: "#1a7f37" }}
          >
            <i className="fas fa-user-check mr-1" />
            Assigning <strong>{role}</strong> to <strong>{selectedProfile.full_name}</strong>
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving || !selectedUserId}>
          {saving ? "Saving…" : isEdit ? "Update Role" : "Assign Role"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

function SubjectTeacherTab({ subjectTeachers, subjects, teachers, isAdmin, showToast, invalidate, onAdd }: any) {
  const [filterSubject, setFilterSubject] = useState("");
  const filtered = subjectTeachers.filter((st: any) => !filterSubject || st.subject_id === filterSubject);

  return (
    <Card
      title="Subject → Teacher Mappings"
      titleRight={
        isAdmin && (
          <Btn size="sm" onClick={onAdd}>
            <i className="fas fa-plus mr-1" />
            Map Subject to Teacher
          </Btn>
        )
      }
    >
      <div className="mb-3">
        <FilterSelect
          value={filterSubject}
          onChange={setFilterSubject}
          allLabel="All Subjects"
          options={subjects.map((s: any) => ({ value: s.id, label: s.name }))}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-xs py-4 text-center" style={{ color: "hsl(var(--text3))" }}>
          No mappings
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Subject", "Code", "Teacher", "Department", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase"
                    style={{ color: "hsl(var(--text2))" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((st: any) => (
                <tr key={st.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                  <td className="py-2.5 px-3.5 font-semibold">{st.subjects?.name}</td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]">{st.subjects?.code}</td>
                  <td className="py-2.5 px-3.5">{st.teachers?.name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{st.teachers?.department}</td>
                  <td className="py-2.5 px-3.5">
                    {isAdmin && (
                      <Btn
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          await supabase.from("subject_teachers").delete().eq("id", st.id);
                          invalidate(["subject_teachers"]);
                          showToast("Removed");
                        }}
                      >
                        <i className="fas fa-trash" />
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SubjectStudentTab({ studentSubjects, subjects, students, isAdmin, showToast, invalidate, onAdd }: any) {
  const [filterSubject, setFilterSubject] = useState("");
  const [filterForm, setFilterForm] = useState("");
  const filtered = studentSubjects.filter(
    (ss: any) =>
      (!filterSubject || ss.subject_id === filterSubject) && (!filterForm || ss.students?.form === filterForm),
  );

  return (
    <Card
      title="Subject → Student Mappings"
      titleRight={
        isAdmin && (
          <Btn size="sm" onClick={onAdd}>
            <i className="fas fa-plus mr-1" />
            Map Subject to Students
          </Btn>
        )
      }
    >
      <div className="flex gap-2 mb-3">
        <FilterSelect
          value={filterSubject}
          onChange={setFilterSubject}
          allLabel="All Subjects"
          options={subjects.map((s: any) => ({ value: s.id, label: s.name }))}
        />
        <FilterSelect
          value={filterForm}
          onChange={setFilterForm}
          allLabel="All Forms"
          options={FORMS.map((f) => ({ value: f, label: f }))}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-xs py-4 text-center" style={{ color: "hsl(var(--text3))" }}>
          No mappings
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Subject", "Student", "Form", "Teacher", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase"
                    style={{ color: "hsl(var(--text2))" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((ss: any) => (
                <tr key={ss.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                  <td className="py-2.5 px-3.5 font-semibold">{ss.subjects?.name}</td>
                  <td className="py-2.5 px-3.5">{ss.students?.full_name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{ss.students?.form}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{ss.teachers?.name || "—"}</td>
                  <td className="py-2.5 px-3.5">
                    {isAdmin && (
                      <Btn
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          await supabase.from("student_subjects").delete().eq("id", ss.id);
                          invalidate(["student_subjects"]);
                          showToast("Removed");
                        }}
                      >
                        <i className="fas fa-trash" />
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] mt-2" style={{ color: "hsl(var(--text2))" }}>
            {filtered.length} mappings
          </div>
        </div>
      )}
    </Card>
  );
}

function ClassTeacherTab({ classTeachers, teachers, students, isAdmin, showToast, invalidate, onAdd }: any) {
  return (
    <Card
      title="Class Teacher Assignments"
      titleRight={
        isAdmin && (
          <Btn size="sm" onClick={onAdd}>
            <i className="fas fa-plus mr-1" />
            Assign Class Teacher
          </Btn>
        )
      }
    >
      {classTeachers.length === 0 ? (
        <div className="text-xs py-4 text-center" style={{ color: "hsl(var(--text3))" }}>
          No class teachers assigned
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Form", "Class", "Teacher", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase"
                    style={{ color: "hsl(var(--text2))" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classTeachers.map((ct: any) => (
                <tr key={ct.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                  <td className="py-2.5 px-3.5 font-semibold">{ct.form}</td>
                  <td className="py-2.5 px-3.5">{ct.class_name}</td>
                  <td className="py-2.5 px-3.5">{ct.teachers?.name}</td>
                  <td className="py-2.5 px-3.5">
                    {isAdmin && (
                      <Btn
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          await (supabase.from("class_teachers") as any).delete().eq("id", ct.id);
                          invalidate(["class_teachers"]);
                          showToast("Removed");
                        }}
                      >
                        <i className="fas fa-trash" />
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// === Modals ===

function RoleModal({ type, teachers, onClose }: { type: "hod" | "hoy"; teachers: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const [teacherId, setTeacherId] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const departments = [...new Set(teachers.map((t: any) => t.department).filter(Boolean))].sort();

  const save = async () => {
    if (!teacherId || !value) return;
    setSaving(true);
    if (type === "hod") {
      const { error } = await supabase.from("hod_assignments").insert({ teacher_id: teacherId, department: value });
      if (error) {
        showToast(error.message, "error");
        setSaving(false);
        return;
      }
      const teacher = teachers.find((t: any) => t.id === teacherId) as any;
      if (teacher?.user_id) {
        await supabase
          .from("user_roles")
          .upsert({ user_id: teacher.user_id, role: "hod" }, { onConflict: "user_id,role" });
      }
    } else {
      const { error } = await supabase.from("hoy_assignments").insert({ teacher_id: teacherId, form: value });
      if (error) {
        showToast(error.message, "error");
        setSaving(false);
        return;
      }
      const teacher = teachers.find((t: any) => t.id === teacherId) as any;
      if (teacher?.user_id) {
        await supabase
          .from("user_roles")
          .upsert({ user_id: teacher.user_id, role: "hoy" }, { onConflict: "user_id,role" });
      }
    }
    showToast(`${type.toUpperCase()} assignment created`);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={`Assign ${type.toUpperCase()}`} onClose={onClose} />
      <ModalBody>
        <Field label="Teacher" required>
          <FieldSelect
            value={teacherId}
            onChange={setTeacherId}
            options={[
              { value: "", label: "— Select —" },
              ...teachers.map((t: any) => ({ value: t.id, label: t.name })),
            ]}
          />
        </Field>
        <Field label={type === "hod" ? "Department" : "Form"} required>
          <FieldSelect
            value={value}
            onChange={setValue}
            options={[
              { value: "", label: "— Select —" },
              ...(type === "hod"
                ? departments.map((d) => ({ value: d, label: d }))
                : FORMS.map((f) => ({ value: f, label: f }))),
            ]}
          />
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Assign"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

function SubjectTeacherModal({
  subjects,
  teachers,
  onClose,
}: {
  subjects: any[];
  teachers: any[];
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const [subjectId, setSubjectId] = useState("");
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleTeacher = (id: string) => {
    setTeacherIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!subjectId || teacherIds.length === 0) return;
    setSaving(true);
    const records = teacherIds.map((tid) => ({ subject_id: subjectId, teacher_id: tid }));
    const { error } = await supabase.from("subject_teachers").insert(records);
    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }
    showToast(`${records.length} teacher(s) mapped to subject`);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="Map Subject to Teachers" onClose={onClose} />
      <ModalBody>
        <Field label="Subject" required>
          <FieldSelect
            value={subjectId}
            onChange={setSubjectId}
            options={[
              { value: "", label: "— Select Subject —" },
              ...subjects.map((s: any) => ({ value: s.id, label: `${s.name} (${s.code})` })),
            ]}
          />
        </Field>
        <Field label="Select Teachers" required>
          <div
            className="max-h-[250px] overflow-y-auto border rounded-md p-2"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            {teachers.map((t: any) => (
              <label
                key={t.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-[hsl(var(--surface2))] text-[12px]"
              >
                <input type="checkbox" checked={teacherIds.includes(t.id)} onChange={() => toggleTeacher(t.id)} />
                <span className="font-semibold">{t.name}</span>
                <span className="text-[10px]" style={{ color: "hsl(var(--text3))" }}>
                  {t.department}
                </span>
              </label>
            ))}
          </div>
          <div className="text-[10px] mt-1" style={{ color: "hsl(var(--text3))" }}>
            {teacherIds.length} selected
          </div>
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Map Teachers"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

function SubjectStudentModal({
  subjects,
  students,
  onClose,
}: {
  subjects: any[];
  students: any[];
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const { data: subjectTeachersAll = [] } = useSubjectTeachers();
  const { data: existingStudentSubjects = [] } = useStudentSubjects();
  const [subjectId, setSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [filterForm, setFilterForm] = useState("Form 1");
  const [filterClass, setFilterClass] = useState("");
  const [searchStr, setSearchStr] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Teachers who teach the selected subject
  const matchedTeachers = useMemo(() => {
    if (!subjectId) return [];
    return subjectTeachersAll
      .filter((st: any) => st.subject_id === subjectId)
      .map((st: any) => ({ id: st.teacher_id, name: st.teachers?.name, department: st.teachers?.department }))
      .filter((t: any) => t.name);
  }, [subjectId, subjectTeachersAll]);

  // Students already mapped to this subject
  const alreadyMappedIds = useMemo(() => {
    if (!subjectId) return new Set<string>();
    return new Set(
      existingStudentSubjects.filter((ss: any) => ss.subject_id === subjectId).map((ss: any) => ss.student_id),
    );
  }, [subjectId, existingStudentSubjects]);

  // Available classes for current form
  const availableClasses = useMemo(() => {
    return [
      ...new Set(
        students
          .filter((s: any) => s.form === filterForm && s.state === "active")
          .map((s: any) => s.class_name)
          .filter(Boolean),
      ),
    ].sort();
  }, [students, filterForm]);

  const formStudents = useMemo(() => {
    return students.filter(
      (s: any) =>
        s.form === filterForm &&
        s.state === "active" &&
        (!filterClass || s.class_name === filterClass) &&
        (!searchStr ||
          s.full_name.toLowerCase().includes(searchStr.toLowerCase()) ||
          (s.enrollment_number || "").toLowerCase().includes(searchStr.toLowerCase())),
    );
  }, [students, filterForm, filterClass, searchStr]);

  // Split into unmapped and already-mapped
  const unmappedStudents = formStudents.filter((s) => !alreadyMappedIds.has(s.id));
  const mappedStudents = formStudents.filter((s) => alreadyMappedIds.has(s.id));

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    const ids = unmappedStudents.map((s: any) => s.id);
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const save = async () => {
    if (!subjectId || selectedIds.length === 0) return;
    setSaving(true);
    const records = selectedIds.map((sid) => ({
      subject_id: subjectId,
      student_id: sid,
      teacher_id: selectedTeacherId || null,
    }));
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      const { error } = await supabase.from("student_subjects").insert(batch);
      if (error) {
        showToast(error.message, "error");
        setSaving(false);
        return;
      }
    }
    showToast(`${records.length} student(s) mapped to subject`);
    onClose();
  };

  const selectedSubject = subjects.find((s: any) => s.id === subjectId);

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title="Map Subject to Students" onClose={onClose} />
      <ModalBody>
        {/* Step 1: Select Subject */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
            <i className="fas fa-book mr-1.5" />
            Step 1 — Select Subject
          </div>
          <FieldSelect
            value={subjectId}
            onChange={(v) => {
              setSubjectId(v);
              setSelectedTeacherId("");
              setSelectedIds([]);
            }}
            options={[
              { value: "", label: "— Select Subject —" },
              ...subjects.map((s: any) => ({ value: s.id, label: `${s.name} (${s.code || ""})` })),
            ]}
          />
        </div>

        {/* Step 2: Select Teacher */}
        {subjectId && (
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
              <i className="fas fa-chalkboard-teacher mr-1.5" />
              Step 2 — Select Teacher for {selectedSubject?.name}
            </div>
            {matchedTeachers.length === 0 ? (
              <div
                className="text-[11px] p-3 rounded-lg"
                style={{ background: "hsl(var(--surface2))", color: "hsl(var(--text3))" }}
              >
                No teachers assigned to this subject yet. Map a teacher in Subject → Teacher first.
              </div>
            ) : (
              <FieldSelect
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                options={[
                  { value: "", label: "— Select Teacher —" },
                  ...matchedTeachers.map((t: any) => ({
                    value: t.id,
                    label: `${t.name}${t.department ? ` (${t.department})` : ""}`,
                  })),
                ]}
              />
            )}
          </div>
        )}

        {/* Step 2: Select Students */}
        {subjectId && selectedTeacherId && (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
              <i className="fas fa-users mr-1.5" />
              Step 3 — Select Students
            </div>
            <div className="flex gap-2 mb-3">
              <FieldSelect
                value={filterForm}
                onChange={(v) => {
                  setFilterForm(v);
                  setFilterClass("");
                  setSelectedIds([]);
                }}
                options={FORMS.map((f) => ({ value: f, label: f }))}
              />
              <FieldSelect
                value={filterClass}
                onChange={setFilterClass}
                options={[
                  { value: "", label: "All Classes" },
                  ...availableClasses.map((c) => ({ value: c, label: c })),
                ]}
              />
              <input
                className="flex-1 h-[34px] rounded-md border px-3 text-[12px]"
                style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface1))" }}
                placeholder="🔍 Search student name or enrollment..."
                value={searchStr}
                onChange={(e) => setSearchStr(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="text-[11px] font-semibold" style={{ color: "hsl(var(--text2))" }}>
                {unmappedStudents.length} available · {mappedStudents.length} already mapped
              </div>
              <Btn variant="outline" size="sm" onClick={selectAll}>
                {unmappedStudents.length > 0 && unmappedStudents.every((s) => selectedIds.includes(s.id))
                  ? "Deselect All"
                  : "Select All"}
              </Btn>
            </div>

            <div
              className="max-h-[280px] overflow-y-auto border rounded-md"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {unmappedStudents.length === 0 && mappedStudents.length === 0 && (
                <div className="py-6 text-center text-[11px]" style={{ color: "hsl(var(--text3))" }}>
                  No students found
                </div>
              )}
              {unmappedStudents.map((s: any) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-[hsl(var(--surface2))] text-[12px]"
                  style={{ borderBottom: "1px solid #f6f8fa" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="accent-[#1a3fa0]"
                  />
                  <span className="font-semibold flex-1">{s.full_name}</span>
                  <span className="text-[10px] font-mono" style={{ color: "hsl(var(--text3))" }}>
                    {s.enrollment_number || "—"}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: "hsl(var(--surface2))", color: "hsl(var(--text2))" }}
                  >
                    {s.class_name || "—"}
                  </span>
                </label>
              ))}
              {mappedStudents.length > 0 && (
                <>
                  <div
                    className="px-3 py-1.5 text-[10px] font-bold uppercase"
                    style={{ background: "hsl(var(--surface2))", color: "hsl(var(--text3))" }}
                  >
                    Already Mapped
                  </div>
                  {mappedStudents.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 py-2 px-3 text-[12px] opacity-50"
                      style={{ borderBottom: "1px solid #f6f8fa" }}
                    >
                      <i className="fas fa-check text-[10px]" style={{ color: "#1a7f37" }} />
                      <span className="flex-1">{s.full_name}</span>
                      <span className="text-[10px] font-mono" style={{ color: "hsl(var(--text3))" }}>
                        {s.enrollment_number || "—"}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "hsl(var(--surface2))", color: "hsl(var(--text2))" }}
                      >
                        {s.class_name || "—"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: "hsl(var(--text3))" }}>
              {selectedIds.length} student(s) selected for mapping
            </div>
          </>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving || selectedIds.length === 0}>
          {saving ? "Mapping…" : `Map ${selectedIds.length} Student${selectedIds.length !== 1 ? "s" : ""}`}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

function ClassTeacherModal({ teachers, students, onClose }: { teachers: any[]; students: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const [teacherId, setTeacherId] = useState("");
  const [form, setForm] = useState("Form 1");
  const [className, setClassName] = useState("");
  const [saving, setSaving] = useState(false);

  const classes = [
    ...new Set(
      students
        .filter((s: any) => s.form === form)
        .map((s: any) => s.class_name)
        .filter(Boolean),
    ),
  ].sort();

  const save = async () => {
    if (!teacherId || !form || !className) return;
    setSaving(true);
    const { error } = await (supabase.from("class_teachers") as any).insert({
      teacher_id: teacherId,
      form,
      class_name: className,
    });
    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }
    showToast("Class teacher assigned");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="Assign Class Teacher" onClose={onClose} />
      <ModalBody>
        <Field label="Teacher" required>
          <FieldSelect
            value={teacherId}
            onChange={setTeacherId}
            options={[
              { value: "", label: "— Select —" },
              ...teachers.map((t: any) => ({ value: t.id, label: t.name })),
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Form" required>
            <FieldSelect value={form} onChange={setForm} options={FORMS.map((f) => ({ value: f, label: f }))} />
          </Field>
          <Field label="Class" required>
            <FieldSelect
              value={className}
              onChange={setClassName}
              options={[{ value: "", label: "— Select —" }, ...classes.map((c) => ({ value: c, label: c }))]}
            />
          </Field>
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Assign"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}
