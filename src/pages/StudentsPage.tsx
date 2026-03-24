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
  // Teacher dual-view: "my-class" | "my-subjects"
  const [teacherView, setTeacherView] = useState<"my-class" | "my-subjects">("my-class");
  const [search, setSearch] = useState("");
  const [filterForm, setFilterForm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterState, setFilterState] = useState("");
  const [modal, setModal] = useState<string | "new" | null>(null);
  const [ctModal, setCtModal] = useState<{ form: string; class_name: string } | null>(null);
  const invalidate = useInvalidate();

  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);

  // For teachers: get subject IDs and class assignments
  const mySubjectIds = useMemo(() => {
    if (!myTeacher) return [];
    return subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => st.subject_id);
  }, [subjectTeachers, myTeacher]);

  const myClassAssignments = useMemo(() => {
    if (!myTeacher) return [];
    return classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id);
  }, [classTeachers, myTeacher]);

  // For teacher view: which students are in class teacher classes
  const classTeacherStudentIds = useMemo(() => {
    if (!isTeacher || !myTeacher) return new Set<string>();
    return new Set(
      students
        .filter((s: any) => myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name))
        .map((s: any) => s.id),
    );
  }, [isTeacher, myTeacher, students, myClassAssignments]);

  // Parent: find their record and linked children IDs
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

  // All students visible to this user (union of class + subject students for teachers)
  const allVisibleStudents = useMemo(() => {
    if (isAdmin) return students;
    if (isTeacher && myTeacher) {
      const subjectStudentIds = new Set(
        studentSubjects.filter((ss: any) => mySubjectIds.includes(ss.subject_id)).map((ss: any) => ss.student_id),
      );
      const classStudentIds = new Set(
        students
          .filter((s: any) =>
            myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name),
          )
          .map((s: any) => s.id),
      );
      return students.filter((s: any) => subjectStudentIds.has(s.id) || classStudentIds.has(s.id));
    }
    if (isParent) return students.filter((s: any) => myChildIds.has(s.id));
    return students;
  }, [
    students,
    isAdmin,
    isTeacher,
    isParent,
    myTeacher,
    mySubjectIds,
    myClassAssignments,
    studentSubjects,
    myChildIds,
  ]);

  // For teacher: apply dual-view filter on top of allVisibleStudents
  const visibleStudents = useMemo(() => {
    if (!isTeacher || isAdmin || !myTeacher) return allVisibleStudents;
    if (teacherView === "my-class") {
      return allVisibleStudents.filter((s: any) => classTeacherStudentIds.has(s.id));
    }
    // my-subjects: only students taking my subjects (excluding pure class students)
    const subjectStudentIds = new Set(
      studentSubjects.filter((ss: any) => mySubjectIds.includes(ss.subject_id)).map((ss: any) => ss.student_id),
    );
    return allVisibleStudents.filter((s: any) => subjectStudentIds.has(s.id));
  }, [
    allVisibleStudents,
    isTeacher,
    isAdmin,
    myTeacher,
    teacherView,
    classTeacherStudentIds,
    studentSubjects,
    mySubjectIds,
  ]);

  // For teacher view: map student → subjects taught by this teacher
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

  const handleDownloadTemplate = () => {
    downloadExcel(
      [
        {
          "Full Name": "",
          Form: "",
          Class: "",
          Gender: "",
          "Enrollment #": "",
          Email: "",
          "Date of Birth": "",
          Nationality: "",
          "Admission Date": "",
          "Academic Year": "",
          "Previous School": "",
          "Blood Group": "",
          "Medical Condition": "",
          "National ID": "",
          "Passport Number": "",
        },
      ],
      "students_import_template",
      "Students",
    );
    showToast("Template downloaded");
  };

  const handleImport = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      if (!data.length) { showToast("File is empty or unreadable", "error"); return; }
      let count = 0;
      let firstError: string | null = null;
      for (const row of data) {
        const name = row["Full Name"] || row["full_name"] || row["Name"] || row["name"];
        const rawForm = row["Form"] || row["form"] || "";
        // Normalise form: "1" → "Form 1", "Form1" → "Form 1", "Form 1" → "Form 1"
        const form = rawForm
          ? rawForm.toString().replace(/^form\s*/i, "").trim()
            ? "Form " + rawForm.toString().replace(/^form\s*/i, "").trim()
            : "Form 1"
          : "Form 1";
        if (!name) continue;
        const { error } = await supabase.from("students").insert({
          full_name: String(name).trim(),
          form,
          gender: (row["Gender"] || row["gender"] || "").toString().toLowerCase() || null,
          enrollment_number: row["Enrollment #"] || row["Enrollment"] || row["enrollment_number"] || null,
          class_name: row["Class"] || row["class_name"] || null,
          email: row["Email"] || row["email"] || null,
          nationality: row["Nationality"] || row["nationality"] || null,
          date_of_birth: row["Date of Birth"] || row["date_of_birth"] || null,
          admission_date: row["Admission Date"] || row["admission_date"] || null,
          academic_year: row["Academic Year"] || row["academic_year"] || null,
          previous_school: row["Previous School"] || row["previous_school"] || null,
          blood_group: row["Blood Group"] || row["blood_group"] || null,
          medical_condition: row["Medical Condition"] || row["medical_condition"] || null,
          national_id: row["National ID"] || row["national_id"] || null,
          passport_number: row["Passport Number"] || row["passport_number"] || null,
          state: "active",
        });
        if (error) { if (!firstError) firstError = error.message; }
        else count++;
      }
      if (firstError) showToast(`Imported ${count}/${data.length} — Error: ${firstError}`, "error");
      else showToast(`Imported ${count} student${count !== 1 ? "s" : ""}`);
      if (count > 0) invalidate(["students"]);
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  if (isLoading)
    return (
      <div className="page-animate">
        <div className="text-sm" style={{ color: "hsl(var(--text2))" }}>
          Loading students...
        </div>
      </div>
    );

  return (
    <div className="page-animate">
      {/* ── Teacher dual-view tabs ── */}
      {isTeacher && !isAdmin && (isClassTeacher || myClassAssignments.length > 0) && (
        <div
          className="flex gap-1 mb-4 p-1 rounded-lg"
          style={{ background: "hsl(var(--surface2))", width: "fit-content" }}
        >
          {(
            [
              {
                key: "my-class",
                label: "My Class",
                icon: "fa-chalkboard-teacher",
                count: students.filter((s: any) => classTeacherStudentIds.has(s.id)).length,
              },
              {
                key: "my-subjects",
                label: "My Subject Students",
                icon: "fa-book",
                count: new Set(
                  studentSubjects
                    .filter((ss: any) => mySubjectIds.includes(ss.subject_id))
                    .map((ss: any) => ss.student_id),
                ).size,
              },
            ] as const
          ).map((t) => (
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
              {t.label}
              <span className="text-[10px] opacity-60 font-mono">({t.count})</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-graduation-cap mr-2" />
            {isParent
              ? "My Children"
              : teacherView === "my-class" && isTeacher && !isAdmin
                ? "My Class Students"
                : "Students"}
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {visibleStudents.length} {isParent ? "children" : "students"}
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}>
            <i className="fas fa-download mr-1" />
            Export
          </Btn>
          {isAdmin && (
            <>
              <Btn variant="outline" onClick={handleDownloadTemplate}>
                <i className="fas fa-file-excel mr-1" />
                Template
              </Btn>
              <Btn variant="outline" onClick={handleImport}>
                <i className="fas fa-upload mr-1" />
                Import
              </Btn>
            </>
          )}
          {isAdmin && (
            <Btn onClick={() => setModal("new")}>
              <i className="fas fa-plus mr-1" />
              New Student
            </Btn>
          )}
          {isClassTeacher &&
            !isAdmin &&
            ctAssignments.length > 0 &&
            (ctAssignments.length === 1 ? (
              <Btn onClick={() => setCtModal(ctAssignments[0])}>
                <i className="fas fa-user-plus mr-1" />
                Add Student to {ctAssignments[0].form} {ctAssignments[0].class_name}
              </Btn>
            ) : (
              <div className="relative group">
                <Btn>
                  <i className="fas fa-user-plus mr-1" />
                  Add Student <i className="fas fa-chevron-down ml-1 text-[10px]" />
                </Btn>
                <div
                  className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block rounded-lg shadow-lg overflow-hidden"
                  style={{
                    background: "hsl(var(--surface))",
                    border: "1px solid hsl(var(--border))",
                    minWidth: "180px",
                  }}
                >
                  {ctAssignments.map((ca: any) => (
                    <button
                      key={`${ca.form}-${ca.class_name}`}
                      onClick={() => setCtModal(ca)}
                      className="w-full text-left px-4 py-2.5 text-[12px] font-semibold cursor-pointer border-none transition-colors hover:bg-[hsl(var(--surface2))]"
                      style={{ background: "transparent", color: "hsl(var(--text))" }}
                    >
                      {ca.form} — {ca.class_name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search name or enrollment...">
          <FilterSelect
            value={filterForm}
            onChange={setFilterForm}
            allLabel="All Forms"
            options={FORMS.map((f) => ({ value: f, label: f }))}
          />
          <FilterSelect
            value={filterClass}
            onChange={setFilterClass}
            allLabel="All Classes"
            options={[...new Set(visibleStudents.map((s: any) => s.class_name).filter(Boolean))]
              .sort()
              .map((c) => ({ value: c, label: c }))}
          />
          <FilterSelect
            value={filterState}
            onChange={setFilterState}
            allLabel="All Status"
            options={["active", "suspended", "graduated", "transferred", "inactive"].map((s) => ({
              value: s,
              label: cap(s),
            }))}
          />
        </SearchBar>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: "hsl(var(--text3))" }}>
            No students found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                  {[
                    "Enrollment",
                    "Name",
                    "Form",
                    "Class",
                    "Gender",
                    ...(isTeacher && !isAdmin ? ["Subjects", "Relation"] : []),
                    "Status",
                    ...(isAdmin || (isClassTeacher && !isAdmin) ? ["Actions"] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: "hsl(var(--text2))" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((s: any) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[hsl(var(--surface2))] transition-colors"
                    style={{ borderBottom: "1px solid #f6f8fa" }}
                  >
                    <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      {s.enrollment_number || "—"}
                    </td>
                    <td
                      className="py-2.5 px-3.5 font-semibold cursor-pointer"
                      style={{ color: "#1a3fa0" }}
                      onClick={() => setDetail(s.id)}
                    >
                      {s.full_name}
                    </td>
                    <td className="py-2.5 px-3.5">{s.form}</td>
                    <td className="py-2.5 px-3.5 text-[11px] font-mono">{s.class_name || "—"}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{cap(s.gender || "")}</td>
                    {isTeacher && !isAdmin && (
                      <>
                        <td className="py-2.5 px-3.5 text-[10px]" style={{ color: "hsl(var(--text2))" }}>
                          {(studentSubjectMap[s.id] || []).join(", ") || "—"}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex gap-1">
                            {(studentSubjectMap[s.id] || []).length > 0 && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: "#ddf4ff", color: "#0969da" }}
                              >
                                Subject
                              </span>
                            )}
                            {classTeacherStudentIds.has(s.id) && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: "#dafbe1", color: "#1a7f37" }}
                              >
                                My Class
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="py-2.5 px-3.5">
                      <Badge status={s.state || "active"} />
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3.5">
                        <div className="flex gap-1">
                          <Btn
                            variant="outline"
                            size="sm"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              setModal(s.id);
                            }}
                          >
                            <i className="fas fa-edit" />
                          </Btn>
                          <Btn
                            variant="danger"
                            size="sm"
                            onClick={async (e: any) => {
                              e.stopPropagation();
                              if (!confirm("Delete this student?")) return;
                              await supabase.from("students").delete().eq("id", s.id);
                              invalidate(["students"]);
                              showToast("Student deleted");
                            }}
                          >
                            <i className="fas fa-trash" />
                          </Btn>
                        </div>
                      </td>
                    )}
                    {isClassTeacher && !isAdmin && classTeacherStudentIds.has(s.id) && (
                      <td className="py-2.5 px-3.5">
                        <Btn
                          variant="danger"
                          size="sm"
                          onClick={async (e: any) => {
                            e.stopPropagation();
                            if (
                              !confirm(`Remove ${s.full_name} from your class? The student record will not be deleted.`)
                            )
                              return;
                            await supabase.from("students").update({ class_name: null }).eq("id", s.id);
                            invalidate(["students"]);
                            showToast(`${s.full_name} removed from class`);
                          }}
                        >
                          <i className="fas fa-user-minus mr-1" />
                          Remove
                        </Btn>
                      </td>
                    )}
                    {isClassTeacher && !isAdmin && !classTeacherStudentIds.has(s.id) && (
                      <td className="py-2.5 px-3.5" />
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[11px] mt-2.5" style={{ color: "hsl(var(--text2))" }}>
              {Math.min(rows.length, 100)} of {rows.length} students
            </div>
          </div>
        )}
      </Card>
      {modal !== null && (
        <StudentModal
          id={modal === "new" ? null : modal}
          students={students}
          onClose={() => {
            setModal(null);
            invalidate(["students"]);
          }}
        />
      )}
      {ctModal && (
        <ClassStudentModal
          assignment={ctModal}
          onClose={() => {
            setCtModal(null);
            invalidate(["students"]);
          }}
        />
      )}
    </div>
  );
}

function StudentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: students = [] } = useStudents();
  const { data: studentSubjects = [] } = useStudentSubjects(id);
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: classTeachers = [] } = useClassTeachers();
  const s = students.find((x: any) => x.id === id) as any;
  if (!s)
    return (
      <>
        <BackBtn onClick={onBack} label="Back" />
        <div>Not found</div>
      </>
    );

  const classTeacher = classTeachers.find((ct: any) => ct.form === s.form && ct.class_name === s.class_name);

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Students" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div
          className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(var(--surface2))", border: "2px solid hsl(var(--border))" }}
        >
          <i
            className={`fas fa-${s.gender === "female" ? "female" : "male"}`}
            style={{ fontSize: "28px", color: "#1a3fa0" }}
          />
        </div>
        <div>
          <div className="text-xl font-bold">{s.full_name}</div>
          <div className="flex gap-2 items-center flex-wrap mt-1.5">
            <Badge status={s.state || "active"} />
            <span className="text-[11px] font-mono" style={{ color: "hsl(var(--text2))" }}>
              {s.enrollment_number}
            </span>
            <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
              {s.form} {s.class_name || ""}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card
          title={
            <>
              <i className="fas fa-id-card mr-1.5" />
              Personal Information
            </>
          }
        >
          {[
            ["Date of Birth", formatDate(s.date_of_birth)],
            ["Gender", cap(s.gender || "")],
            ["Form", s.form],
            ["Class", s.class_name || "—"],
            ["Enrollment", s.enrollment_number || "—"],
            ["Email", s.email || "—"],
            ["Nationality", s.nationality || "—"],
            ["Admission Date", formatDate(s.admission_date)],
          ].map(([k, v]) => (
            <InfoRow key={k} label={k} value={v} />
          ))}
        </Card>
        <div>
          <Card
            title={
              <>
                <i className="fas fa-chalkboard-teacher mr-1.5" />
                Class Teacher
              </>
            }
            className="mb-4"
          >
            <div className="text-[12.5px]">
              {classTeacher ? (
                <span className="font-semibold">{classTeacher.teachers?.name}</span>
              ) : (
                <span style={{ color: "hsl(var(--text3))" }}>Not assigned</span>
              )}
            </div>
          </Card>
          <Card
            title={
              <>
                <i className="fas fa-book mr-1.5" />
                Subjects ({studentSubjects.length})
              </>
            }
          >
            {studentSubjects.length === 0 ? (
              <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>
                No subjects assigned
              </div>
            ) : (
              studentSubjects.map((ss: any) => (
                <div
                  key={ss.id}
                  className="flex justify-between py-[7px] text-[12.5px]"
                  style={{ borderBottom: "1px solid #f6f8fa" }}
                >
                  <span className="font-semibold">
                    {ss.subjects?.name}{" "}
                    <span className="font-mono text-[9px]" style={{ color: "hsl(var(--text3))" }}>
                      {ss.subjects?.code}
                    </span>
                  </span>
                  <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                    {ss.teachers?.name || "—"}
                  </span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ id, students, onClose }: { id: string | null; students: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const { data: allParents = [] } = useParents();
  const existing = id ? students.find((s: any) => s.id === id) : null;

  // Basic info
  const [name, setName] = useState(existing?.full_name || "");
  const [form, setForm] = useState(existing?.form || "Form 1");
  const [gender, setGender] = useState(existing?.gender || "male");
  const [enrollment, setEnrollment] = useState(existing?.enrollment_number || "");
  const [className, setClassName] = useState(existing?.class_name || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [dob, setDob] = useState(existing?.date_of_birth || "");
  const [nationality, setNationality] = useState(existing?.nationality || "");
  const [admissionDate, setAdmissionDate] = useState(existing?.admission_date || "");
  const [academicYear, setAcademicYear] = useState(existing?.academic_year || "");
  const [state, setState] = useState(existing?.state || "active");

  // Identity
  const [nationalId, setNationalId] = useState(existing?.national_id || "");
  const [passportNumber, setPassportNumber] = useState(existing?.passport_number || "");

  // Academic history
  const [previousSchool, setPreviousSchool] = useState(existing?.previous_school || "");

  // Medical
  const [bloodGroup, setBloodGroup] = useState(existing?.blood_group || "");
  const [medicalCondition, setMedicalCondition] = useState(existing?.medical_condition || "");

  // Parent / Guardian (new student only)
  const [parentMode, setParentMode] = useState<"existing" | "new">("new");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentRelation, setParentRelation] = useState("guardian");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [saving, setSaving] = useState(false);

  const studentPayload = {
    full_name: name,
    form,
    gender,
    enrollment_number: enrollment || null,
    class_name: className || null,
    email: email || null,
    date_of_birth: dob || null,
    nationality: nationality || null,
    admission_date: admissionDate || null,
    academic_year: academicYear || null,
    national_id: nationalId || null,
    passport_number: passportNumber || null,
    previous_school: previousSchool || null,
    blood_group: bloodGroup || null,
    medical_condition: medicalCondition || null,
    state,
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);

    if (id) {
      const { error } = await supabase.from("students").update(studentPayload).eq("id", id);
      if (error) { showToast(error.message, "error"); setSaving(false); return; }
      showToast("Student updated");
    } else {
      const { data: inserted, error } = await supabase
        .from("students")
        .insert({ ...studentPayload, state: "active" })
        .select("id")
        .single();
      if (error) { showToast(error.message, "error"); setSaving(false); return; }

      const studentId = inserted.id;

      // Link parent
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
        {/* ── Basic Information ── */}
        <FormSection title="Basic Information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" required>
            <FieldInput value={name} onChange={setName} />
          </Field>
          <Field label="Form" required>
            <FieldSelect value={form} onChange={setForm} options={FORMS.map((f) => ({ value: f, label: f }))} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Gender">
            <FieldSelect
              value={gender}
              onChange={setGender}
              options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]}
            />
          </Field>
          <Field label="Date of Birth">
            <FieldInput value={dob} onChange={setDob} type="date" />
          </Field>
          <Field label="Nationality">
            <FieldInput value={nationality} onChange={setNationality} placeholder="e.g. Botswana" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Enrollment #">
            <FieldInput value={enrollment} onChange={setEnrollment} />
          </Field>
          <Field label="Class">
            <FieldInput value={className} onChange={setClassName} placeholder="e.g. B, M, K" />
          </Field>
          <Field label="Email">
            <FieldInput value={email} onChange={setEmail} type="email" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Admission Date">
            <FieldInput value={admissionDate} onChange={setAdmissionDate} type="date" />
          </Field>
          <Field label="Academic Year">
            <FieldInput value={academicYear} onChange={setAcademicYear} placeholder="e.g. 2026" />
          </Field>
          <Field label="Status">
            <FieldSelect
              value={state}
              onChange={setState}
              options={["active", "suspended", "graduated", "transferred", "inactive"].map((s) => ({
                value: s,
                label: cap(s),
              }))}
            />
          </Field>
        </div>

        {/* ── Identity Documents ── */}
        <FormSection title="Identity Documents" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="National ID">
            <FieldInput value={nationalId} onChange={setNationalId} />
          </Field>
          <Field label="Passport Number">
            <FieldInput value={passportNumber} onChange={setPassportNumber} />
          </Field>
        </div>

        {/* ── Academic History ── */}
        <FormSection title="Academic History" />
        <div className="grid grid-cols-1 gap-3">
          <Field label="Previous School">
            <FieldInput value={previousSchool} onChange={setPreviousSchool} placeholder="Name of previous school" />
          </Field>
        </div>

        {/* ── Medical Information ── */}
        <FormSection title="Medical Information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Blood Group">
            <FieldSelect
              value={bloodGroup}
              onChange={setBloodGroup}
              options={[
                { value: "", label: "Unknown" },
                ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => ({ value: g, label: g })),
              ]}
            />
          </Field>
          <Field label="Medical Condition / Allergies">
            <FieldInput value={medicalCondition} onChange={setMedicalCondition} placeholder="e.g. Asthma, Peanut allergy" />
          </Field>
        </div>

        {/* ── Parent / Guardian (new student only) ── */}
        {!id && (
          <>
            <FormSection title="Parent / Guardian" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Link to">
                <FieldSelect
                  value={parentMode}
                  onChange={(v) => setParentMode(v as "existing" | "new")}
                  options={[
                    { value: "new", label: "Add new parent" },
                    { value: "existing", label: "Select existing parent" },
                  ]}
                />
              </Field>
              {parentMode === "existing" ? (
                <Field label="Parent">
                  <FieldSelect
                    value={selectedParentId}
                    onChange={setSelectedParentId}
                    options={[
                      { value: "", label: "— Select —" },
                      ...allParents.map((p: any) => ({ value: p.id, label: `${p.name}${p.relation ? ` (${cap(p.relation)})` : ""}` })),
                    ]}
                  />
                </Field>
              ) : (
                <Field label="Full Name">
                  <FieldInput value={parentName} onChange={setParentName} placeholder="Parent / Guardian name" />
                </Field>
              )}
            </div>
            {parentMode === "new" && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Relation">
                  <FieldSelect
                    value={parentRelation}
                    onChange={setParentRelation}
                    options={["father", "mother", "guardian", "grandparent", "other"].map((r) => ({ value: r, label: cap(r) }))}
                  />
                </Field>
                <Field label="Phone">
                  <FieldInput value={parentPhone} onChange={setParentPhone} type="tel" />
                </Field>
                <Field label="Email">
                  <FieldInput value={parentEmail} onChange={setParentEmail} type="email" />
                </Field>
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : id ? "Update" : "Create"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

// ─── Class Teacher: Add / Remove Students ────────────────────────────────────

function ClassStudentModal({
  assignment,
  onClose,
}: {
  assignment: { form: string; class_name: string };
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const { data: students = [] } = useStudents();
  const invalidate = useInvalidate();
  const [tab, setTab] = useState<"add" | "remove">("add");
  const [search, setSearch] = useState("");

  // Students already IN this class
  const inClass = students.filter(
    (s: any) => s.form === assignment.form && s.class_name === assignment.class_name && s.state === "active",
  );

  // Students in same form but NOT yet in any class (available to add)
  const unassigned = students.filter(
    (s: any) =>
      s.state === "active" &&
      s.form === assignment.form &&
      (!s.class_name || s.class_name === "") &&
      (!search ||
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.enrollment_number || "").toLowerCase().includes(search.toLowerCase())),
  );

  const filteredInClass = inClass.filter(
    (s: any) =>
      !search ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.enrollment_number || "").toLowerCase().includes(search.toLowerCase()),
  );

  const assignStudent = async (student: any) => {
    const { error } = await supabase
      .from("students")
      .update({ class_name: assignment.class_name })
      .eq("id", student.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast(`${student.full_name} added to ${assignment.form} ${assignment.class_name}`);
    invalidate(["students"]);
  };

  const removeStudent = async (student: any) => {
    if (
      !confirm(
        `Remove ${student.full_name} from ${assignment.form} ${assignment.class_name}?\nThe student record will NOT be deleted.`,
      )
    )
      return;
    const { error } = await supabase.from("students").update({ class_name: null }).eq("id", student.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast(`${student.full_name} removed from class`);
    invalidate(["students"]);
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={`Manage Class — ${assignment.form} ${assignment.class_name}`} onClose={onClose} />
      <ModalBody>
        {/* Tab switcher */}
        <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ background: "hsl(var(--surface2))" }}>
          {[
            { key: "add", label: `Add Students (${unassigned.length} available)`, icon: "fa-user-plus" },
            { key: "remove", label: `Class Roster (${inClass.length})`, icon: "fa-users" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key as any);
                setSearch("");
              }}
              className="flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold border-none cursor-pointer transition-all"
              style={{
                background: tab === t.key ? "hsl(var(--surface))" : "transparent",
                color: tab === t.key ? "hsl(var(--text))" : "hsl(var(--text2))",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <i className={`fas ${t.icon} mr-1`} />
              {t.label}
            </button>
          ))}
        </div>

        <input
          className="w-full border rounded-md py-[7px] px-3 text-[12.5px] mb-3"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface))" }}
          placeholder="Search name or enrollment…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* ADD tab */}
        {tab === "add" && (
          <>
            <div
              className="rounded-md px-3 py-2 mb-2 text-[11px]"
              style={{ background: "#fff8c5", border: "1px solid #ffe07c", color: "#9a6700" }}
            >
              <i className="fas fa-info-circle mr-1" />
              Showing <strong>{assignment.form}</strong> students not yet assigned to any class.
            </div>
            {unassigned.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "hsl(var(--text3))" }}>
                <i className="fas fa-check-circle text-2xl mb-2 block" style={{ color: "#1a7f37" }} />
                No unassigned {assignment.form} students found
              </div>
            ) : (
              <div
                className="max-h-[300px] overflow-y-auto border rounded-md divide-y"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                {unassigned.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-[hsl(var(--surface2))] transition-colors"
                  >
                    <div>
                      <div className="text-[12.5px] font-semibold">{s.full_name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--text3))" }}>
                        {s.enrollment_number ? `#${s.enrollment_number} · ` : ""}
                        {cap(s.gender || "")}
                      </div>
                    </div>
                    <Btn size="sm" onClick={() => assignStudent(s)}>
                      <i className="fas fa-plus mr-1" />
                      Add
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* REMOVE / ROSTER tab */}
        {tab === "remove" && (
          <>
            {filteredInClass.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "hsl(var(--text3))" }}>
                <i className="fas fa-users text-2xl mb-2 block" style={{ color: "hsl(var(--text3))" }} />
                No students in {assignment.form} {assignment.class_name} yet
              </div>
            ) : (
              <div
                className="max-h-[300px] overflow-y-auto border rounded-md divide-y"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                {filteredInClass.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-[hsl(var(--surface2))] transition-colors"
                  >
                    <div>
                      <div className="text-[12.5px] font-semibold">{s.full_name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--text3))" }}>
                        {s.enrollment_number ? `#${s.enrollment_number} · ` : ""}
                        {cap(s.gender || "")}
                      </div>
                    </div>
                    <Btn variant="danger" size="sm" onClick={() => removeStudent(s)}>
                      <i className="fas fa-user-minus mr-1" />
                      Remove
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Done
        </Btn>
      </ModalFoot>
    </Modal>
  );
}
