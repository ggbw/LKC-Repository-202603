import React, { useState, useMemo } from "react";
import {
  useExams,
  useExamResults,
  useSubjects,
  useStudents,
  useTeachers,
  useSubjectTeachers,
  useStudentSubjects,
  useInvalidate,
} from "@/hooks/useSupabaseData";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { FORMS, cap, formatDate, G, P } from "@/data/database";
import { downloadExcel } from "@/lib/excel";
import {
  Badge,
  Card,
  StatCard,
  Btn,
  BackBtn,
  GradeChip,
  FilterSelect,
  Modal,
  ModalHead,
  ModalBody,
  ModalFoot,
  Field,
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from "@/components/SharedUI";

export default function ExamsPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin, isHOD, isHOY, isTeacher } = useAuth();
  const { data: exams = [], isLoading } = useExams();
  const { data: results = [] } = useExamResults();
  const invalidate = useInvalidate();
  const [modal, setModal] = useState(false);

  if (detail) return <ExamDetail id={detail} onBack={() => setDetail(null)} />;

  const confirmed = exams.filter((e: any) => e.state === "confirmed").length;

  const handleExport = () => {
    downloadExcel(
      exams.map((e: any) => ({
        Name: e.name,
        Form: e.form,
        Class: e.class_name || "All Classes",
        Status: cap(e.state || "draft"),
        Start: e.start_date || "",
        End: e.end_date || "",
      })),
      "exams_export",
      "Exams",
    );
    showToast("Exported");
  };

  if (isLoading)
    return (
      <div className="page-animate">
        <div className="text-sm" style={{ color: "hsl(var(--text2))" }}>
          Loading...
        </div>
      </div>
    );

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-clipboard-list mr-2" />
            Examinations
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {exams.length} exam periods
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}>
            <i className="fas fa-download mr-1" />
            Export
          </Btn>
          {(isAdmin || isHOD || isTeacher) && (
            <Btn onClick={() => setModal(true)}>
              <i className="fas fa-plus mr-1" />
              Create Exam
            </Btn>
          )}
        </div>
      </div>

      {isTeacher && !isAdmin && !isHOD && (
        <div
          className="rounded-md px-4 py-3 mb-4 text-[12px]"
          style={{ background: "#ddf4ff", border: "1px solid #addcff", color: "#0969da" }}
        >
          <i className="fas fa-info-circle mr-1" />
          You can create exams and enter results for your assigned subjects. Click "Create Exam" to get started, then
          open the exam to add results.
        </div>
      )}

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
        <StatCard icon="fas fa-clipboard-list" bg="#ddf4ff" value={exams.length} label="Total Exams" />
        <StatCard icon="fas fa-check-circle" bg="#dafbe1" value={confirmed} label="Confirmed" />
        <StatCard icon="fas fa-chart-bar" bg="#fbefff" value={results.length} label="Results Entered" />
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {exams.map((e: any) => {
          const examResults = results.filter((r: any) => r.exam_name === e.name);
          return (
            <Card key={e.id}>
              <div className="flex justify-between mb-2.5">
                <div className="font-bold text-sm">{e.name}</div>
                <div className="flex items-center gap-1.5">
                  {e.show_on_report_card === false && (
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "#fff8c5", color: "#9a6700", border: "1px solid #ffe07c" }}
                    >
                      <i className="fas fa-eye-slash mr-0.5" />
                      No Report Card
                    </span>
                  )}
                  <Badge status={e.state || "draft"} />
                </div>
              </div>
              <div className="text-[11px] mb-0.5" style={{ color: "hsl(var(--text2))" }}>
                <i className="fas fa-school mr-1" />
                {e.form}
                {e.class_name && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded font-medium"
                    style={{ background: "#ddf4ff", color: "#0969da", fontSize: "10px" }}
                  >
                    {e.class_name}
                  </span>
                )}
              </div>
              <div className="text-[11px] mb-0.5" style={{ color: "hsl(var(--text2))" }}>
                <i className="fas fa-calendar-alt mr-1" />
                {formatDate(e.start_date)} → {formatDate(e.end_date)}
              </div>
              <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                <i className="fas fa-chart-bar mr-1" />
                {examResults.length} results
              </div>
              <div className="mt-3 pt-2.5 flex gap-1.5" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                <Btn variant="primary" size="sm" onClick={() => setDetail(e.id)}>
                  <i className="fas fa-eye mr-1" />
                  View & Enter Results
                </Btn>
                {(isAdmin || isHOD) && e.state === "draft" && (
                  <Btn
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase.from("exams").update({ state: "confirmed" }).eq("id", e.id);
                      invalidate(["exams"]);
                      showToast("Exam confirmed");
                    }}
                  >
                    <i className="fas fa-check mr-1" />
                    Confirm
                  </Btn>
                )}
                {isAdmin && (
                  <Btn
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Delete this exam?")) return;
                      await supabase.from("exams").delete().eq("id", e.id);
                      invalidate(["exams"]);
                      showToast("Deleted");
                    }}
                  >
                    <i className="fas fa-trash" />
                  </Btn>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <ExamModal
          onClose={() => {
            setModal(false);
            invalidate(["exams"]);
          }}
        />
      )}
    </div>
  );
}

// ─── Exam Detail ────────────────────────────────────────────────────────────

function ExamDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { showToast } = useApp();
  const { isAdmin, isHOD, isHOY, isTeacher, user } = useAuth();
  const { data: exams = [] } = useExams();
  const { data: subjects = [] } = useSubjects();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: studentSubjects = [] } = useStudentSubjects();
  const invalidate = useInvalidate();
  const exam = exams.find((e: any) => e.id === id) as any;
  const { data: results = [] } = useExamResults(exam?.name);
  const [resultModal, setResultModal] = useState(false);
  const [commentModal, setCommentModal] = useState<any>(null);
  const [editMarksModal, setEditMarksModal] = useState<any>(null);
  const [filterSubject, setFilterSubject] = useState("");

  if (!exam)
    return (
      <>
        <BackBtn onClick={onBack} label="Back" />
        <div>Not found</div>
      </>
    );

  // For teachers, only show subjects they teach
  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);
  const mySubjectIds = myTeacher
    ? subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => st.subject_id)
    : [];

  const filtResults = results.filter((r: any) => {
    if (filterSubject && r.subject_id !== filterSubject) return false;
    if (isTeacher && !isAdmin && !isHOD && !isHOY && mySubjectIds.length > 0 && !mySubjectIds.includes(r.subject_id))
      return false;
    return true;
  });
  const subjectsInResults = [...new Set(results.map((r: any) => r.subject_id))];

  const handleExport = () => {
    downloadExcel(
      filtResults.map((r: any) => {
        const p = P(Number(r.obtained_marks), Number(r.max_marks));
        return {
          Student: r.students?.full_name || "",
          Enrollment: r.students?.enrollment_number || "",
          Subject: r.subjects?.name || "",
          Obtained: r.obtained_marks,
          Max: r.max_marks,
          "%": p,
          Grade: G(p),
          "Short Comment": r.short_comment || "",
          "Long Comment": r.long_comment || "",
        };
      }),
      `${exam.name}_results`,
      "Results",
    );
    showToast("Exported");
  };

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Examinations" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div
          className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(var(--surface2))", border: "2px solid hsl(var(--border))" }}
        >
          <i className="fas fa-clipboard-list" style={{ fontSize: "28px", color: "#1a3fa0" }} />
        </div>
        <div>
          <div className="text-xl font-bold">{exam.name}</div>
          <div className="flex gap-2 items-center mt-1.5">
            <Badge status={exam.state || "draft"} />
            <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
              {exam.form}
            </span>
            {exam.class_name && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "#ddf4ff", color: "#0969da" }}
              >
                {exam.class_name}
              </span>
            )}
          </div>
          <div className="text-xs mt-1" style={{ color: "hsl(var(--text2))" }}>
            <i className="fas fa-calendar-alt mr-1" />
            {formatDate(exam.start_date)} → {formatDate(exam.end_date)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard icon="fas fa-chart-bar" bg="#ddf4ff" value={filtResults.length} label="Results" />
        <StatCard
          icon="fas fa-graduation-cap"
          bg="#dafbe1"
          value={[...new Set(filtResults.map((r: any) => r.student_id))].length}
          label="Students"
        />
        <StatCard
          icon="fas fa-book"
          bg="#fbefff"
          value={[...new Set(filtResults.map((r: any) => r.subject_id))].length}
          label="Subjects"
        />
      </div>

      <Card
        title={`Results (${filtResults.length})`}
        titleRight={
          <div className="flex gap-2">
            <FilterSelect
              value={filterSubject}
              onChange={setFilterSubject}
              allLabel="All Subjects"
              options={subjects
                .filter((s: any) => subjectsInResults.includes(s.id))
                .map((s: any) => ({ value: s.id, label: s.name }))}
            />
            <Btn variant="outline" size="sm" onClick={handleExport}>
              <i className="fas fa-download mr-1" />
              Export
            </Btn>
            {(isAdmin || isHOD || isHOY || isTeacher) && (
              <Btn size="sm" onClick={() => setResultModal(true)}>
                <i className="fas fa-plus mr-1" />
                Add Results
              </Btn>
            )}
          </div>
        }
      >
        {filtResults.length === 0 ? (
          <div className="text-xs py-6 text-center" style={{ color: "hsl(var(--text3))" }}>
            No results yet. Click "Add Results" to enter marks.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                  {["Student", "Form", "Subject", "Marks", "%", "Grade", "Comment", "Actions"].map((h) => (
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
                {filtResults.slice(0, 100).map((r: any) => {
                  const p = P(Number(r.obtained_marks), Number(r.max_marks));
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                      <td className="py-2.5 px-3.5 font-semibold">{r.students?.full_name || "—"}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.students?.form || "—"}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.subjects?.name || "—"}</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">
                        {r.obtained_marks}/{r.max_marks}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold">{p}%</td>
                      <td className="py-2.5 px-3.5">
                        <GradeChip grade={G(p)} />
                      </td>
                      <td
                        className="py-2.5 px-3.5 text-[10px] max-w-[120px] truncate"
                        style={{ color: "hsl(var(--text2))" }}
                      >
                        {r.short_comment || "—"}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {(isAdmin || isTeacher || isHOD || isHOY) && (
                          <div className="flex gap-1">
                            <Btn variant="outline" size="sm" onClick={() => setEditMarksModal(r)}>
                              <i className="fas fa-pen mr-1" />
                              Marks
                            </Btn>
                            <Btn variant="outline" size="sm" onClick={() => setCommentModal(r)}>
                              <i className="fas fa-comment" />
                            </Btn>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {resultModal && (
        <ResultModal
          examName={exam.name}
          examForm={exam.form}
          examClass={exam.class_name || ""}
          subjects={subjects}
          students={students}
          teachers={teachers}
          subjectTeachers={subjectTeachers}
          studentSubjects={studentSubjects}
          onClose={() => {
            setResultModal(false);
            invalidate(["exam_results"]);
          }}
        />
      )}

      {commentModal && (
        <CommentModal
          result={commentModal}
          onClose={() => {
            setCommentModal(null);
            invalidate(["exam_results"]);
          }}
        />
      )}

      {editMarksModal && (
        <EditMarksModal
          result={editMarksModal}
          onClose={() => {
            setEditMarksModal(null);
            invalidate(["exam_results"]);
          }}
        />
      )}
    </div>
  );
}

// ─── Edit Marks Modal ────────────────────────────────────────────────────────

function EditMarksModal({ result, onClose }: { result: any; onClose: () => void }) {
  const { showToast } = useApp();
  const [obtainedMarks, setObtainedMarks] = useState(result.obtained_marks?.toString() || "");
  const [maxMarks, setMaxMarks] = useState(result.max_marks?.toString() || "100");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (obtainedMarks === "" || maxMarks === "") {
      showToast("Both marks fields are required", "error");
      return;
    }
    if (Number(obtainedMarks) > Number(maxMarks)) {
      showToast("Obtained marks cannot exceed maximum marks", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("exam_results")
      .update({ obtained_marks: Number(obtainedMarks), max_marks: Number(maxMarks) })
      .eq("id", result.id);
    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }
    showToast(`Marks updated for ${result.students?.full_name}`);
    onClose();
  };

  const pct = maxMarks && obtainedMarks ? Math.round((Number(obtainedMarks) / Number(maxMarks)) * 100) : null;

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHead title="Edit Marks" onClose={onClose} />
      <ModalBody>
        <div className="text-[12px] mb-3" style={{ color: "hsl(var(--text2))" }}>
          <strong>{result.students?.full_name}</strong> — {result.subjects?.name}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Obtained Marks" required>
            <FieldInput value={obtainedMarks} onChange={setObtainedMarks} type="number" placeholder="e.g. 78" />
          </Field>
          <Field label="Maximum Marks" required>
            <FieldInput value={maxMarks} onChange={setMaxMarks} type="number" placeholder="e.g. 100" />
          </Field>
        </div>
        {pct !== null && (
          <div
            className="rounded-md px-3 py-2 text-[11px] text-center font-semibold mt-2"
            style={{
              background: pct >= 50 ? "#dafbe1" : "#ffebe9",
              border: `1px solid ${pct >= 50 ? "#aceebb" : "#ffcecb"}`,
              color: pct >= 50 ? "#1a7f37" : "#cf222e",
            }}
          >
            {obtainedMarks}/{maxMarks} = {pct}% — {G(pct)}
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Update Marks"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

// ─── Comment Modal ────────────────────────────────────────────────────────────

function CommentModal({ result, onClose }: { result: any; onClose: () => void }) {
  const { showToast } = useApp();
  const [shortComment, setShortComment] = useState(result.short_comment || "");
  const [longComment, setLongComment] = useState(result.long_comment || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("exam_results")
      .update({
        short_comment: shortComment || null,
        long_comment: longComment || null,
      })
      .eq("id", result.id);
    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }
    showToast("Comments saved");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={`Comments — ${result.students?.full_name}`} onClose={onClose} />
      <ModalBody>
        <div className="text-[11px] mb-3" style={{ color: "hsl(var(--text2))" }}>
          {result.subjects?.name} · {result.obtained_marks}/{result.max_marks}
        </div>
        <Field label="Short Comment (for parents, not on report card)">
          <FieldTextarea
            value={shortComment}
            onChange={setShortComment}
            placeholder="e.g. Good improvement, needs more practice..."
            minHeight="60px"
          />
        </Field>
        <Field label="Long Comment (appears on report card)">
          <FieldTextarea
            value={longComment}
            onChange={setLongComment}
            placeholder="Detailed comment for the report card..."
            minHeight="100px"
          />
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Comments"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

// ─── Exam Creation Modal ─────────────────────────────────────────────────────

function ExamModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useApp();
  const { data: students = [] } = useStudents();
  const [name, setName] = useState("");
  const [form, setForm] = useState("All Forms");
  const [className, setClassName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showOnReport, setShowOnReport] = useState(false);
  const [saving, setSaving] = useState(false);

  // Derive available classes for the selected form
  const availableClasses = useMemo(() => {
    if (form === "All Forms") return [];
    const names = [
      ...new Set(students.filter((s: any) => s.form === form && s.class_name).map((s: any) => s.class_name as string)),
    ].sort();
    return names;
  }, [students, form]);

  // When form changes, reset class selection
  const handleFormChange = (newForm: string) => {
    setForm(newForm);
    setClassName("");
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("exams").insert({
      name,
      form,
      class_name: className || null,
      start_date: startDate || null,
      end_date: endDate || null,
      state: "draft",
      show_on_report_card: showOnReport,
    });
    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }
    showToast("Exam created");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="New Examination" onClose={onClose} />
      <ModalBody>
        <Field label="Exam Name" required>
          <FieldInput value={name} onChange={setName} placeholder="e.g. Mid-Term 1 2026" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Form">
            <FieldSelect
              value={form}
              onChange={handleFormChange}
              options={[{ value: "All Forms", label: "All Forms" }, ...FORMS.map((f) => ({ value: f, label: f }))]}
            />
          </Field>

          <Field label="Class">
            {form === "All Forms" ? (
              <div
                className="rounded-md px-3 py-2 text-[11px]"
                style={{
                  background: "hsl(var(--surface2))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--text3))",
                }}
              >
                Select a specific form first
              </div>
            ) : availableClasses.length === 0 ? (
              <div
                className="rounded-md px-3 py-2 text-[11px]"
                style={{
                  background: "hsl(var(--surface2))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--text3))",
                }}
              >
                No classes found for {form}
              </div>
            ) : (
              <FieldSelect
                value={className}
                onChange={setClassName}
                options={[
                  { value: "", label: "All Classes" },
                  ...availableClasses.map((c) => ({ value: c, label: c })),
                ]}
              />
            )}
          </Field>
        </div>

        {form !== "All Forms" && className && (
          <div
            className="rounded-md px-3 py-2 text-[11px] mb-1"
            style={{ background: "#dafbe1", border: "1px solid #aceebb", color: "#1a7f37" }}
          >
            <i className="fas fa-users mr-1" />
            This exam will be scoped to{" "}
            <strong>
              {form} — {className}
            </strong>{" "}
            students only.
          </div>
        )}
        {form !== "All Forms" && !className && (
          <div
            className="rounded-md px-3 py-2 text-[11px] mb-1"
            style={{ background: "#fff8c5", border: "1px solid #ffe07c", color: "#9a6700" }}
          >
            <i className="fas fa-info-circle mr-1" />
            No class selected — exam will cover <strong>all classes</strong> in {form}.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-1">
          <Field label="Start Date">
            <FieldInput value={startDate} onChange={setStartDate} type="date" />
          </Field>
          <Field label="End Date">
            <FieldInput value={endDate} onChange={setEndDate} type="date" />
          </Field>
        </div>

        {/* ── Report Card Toggle ── */}
        <div
          className="flex items-center justify-between rounded-lg px-3.5 py-3 mt-1 cursor-pointer"
          style={{
            background: showOnReport ? "#dafbe1" : "hsl(var(--surface2))",
            border: `1px solid ${showOnReport ? "#aceebb" : "hsl(var(--border))"}`,
            transition: "all 0.15s",
          }}
          onClick={() => setShowOnReport((v) => !v)}
        >
          <div>
            <div
              className="text-[12.5px] font-semibold"
              style={{ color: showOnReport ? "#1a7f37" : "hsl(var(--text2))" }}
            >
              <i className={`fas ${showOnReport ? "fa-check-square" : "fa-square"} mr-2`} />
              Include results on report card
            </div>
            <div className="text-[10px] mt-0.5 ml-5" style={{ color: showOnReport ? "#2ea043" : "hsl(var(--text3))" }}>
              {showOnReport
                ? "Results from this exam will appear on student report cards"
                : "Results will be recorded but hidden from report cards"}
            </div>
          </div>
          <div
            className="w-9 h-5 rounded-full flex-shrink-0 relative ml-3"
            style={{ background: showOnReport ? "#2ea043" : "#d0d7de", transition: "background 0.15s" }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
              style={{ left: showOnReport ? "18px" : "2px" }}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

// ─── Result Entry Modal ──────────────────────────────────────────────────────

function ResultModal({
  examName,
  examForm,
  examClass,
  subjects,
  students,
  teachers,
  subjectTeachers,
  studentSubjects,
  onClose,
}: {
  examName: string;
  examForm: string;
  examClass: string;
  subjects: any[];
  students: any[];
  teachers: any[];
  subjectTeachers: any[];
  studentSubjects: any[];
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const { user, isAdmin, isHOD, isHOY } = useAuth();
  const { data: existingResults = [] } = useExamResults(examName);
  const [subjectId, setSubjectId] = useState("");
  const [filterForm, setFilterForm] = useState(examForm !== "All Forms" ? examForm : "Form 1");
  const [filterClass, setFilterClass] = useState(examClass || "");
  const [maxMarks, setMaxMarks] = useState("100");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);

  // Teachers only see their assigned subjects
  const availableSubjects = useMemo(() => {
    if (isAdmin || isHOD || isHOY) return subjects;
    if (myTeacher) {
      const mySubjectIds = subjectTeachers
        .filter((st: any) => st.teacher_id === myTeacher.id)
        .map((st: any) => st.subject_id);
      return subjects.filter((s: any) => mySubjectIds.includes(s.id));
    }
    return subjects;
  }, [subjects, subjectTeachers, myTeacher, isAdmin, isHOD]);

  // Derive available classes for the selected form
  const availableClasses = useMemo(() => {
    if (filterForm === "All Forms") return [];
    const names = [
      ...new Set(
        students.filter((s: any) => s.form === filterForm && s.class_name).map((s: any) => s.class_name as string),
      ),
    ].sort();
    return names;
  }, [students, filterForm]);

  // Reset class when form changes
  const handleFormChange = (newForm: string) => {
    setFilterForm(newForm);
    setFilterClass("");
    setMarks({});
  };

  // Only show students taking the selected subject, filtered by form and class
  const formStudents = useMemo(() => {
    let filtered = students.filter((s: any) => s.form === filterForm && s.state === "active");

    // Apply class filter if set
    if (filterClass) {
      filtered = filtered.filter((s: any) => s.class_name === filterClass);
    }

    if (!subjectId) return filtered;

    // Filter to only students enrolled in the selected subject
    const enrolledStudentIds = new Set(
      studentSubjects.filter((ss: any) => ss.subject_id === subjectId).map((ss: any) => ss.student_id),
    );
    if (enrolledStudentIds.size === 0) return filtered;
    return filtered.filter((s: any) => enrolledStudentIds.has(s.id));
  }, [students, filterForm, filterClass, subjectId, studentSubjects]);

  // Clear marks when student list changes
  const handleSubjectChange = (val: string) => {
    setSubjectId(val);
    // Pre-populate with existing results for this subject so teacher sees what's already entered
    const existing: Record<string, string> = {};
    existingResults
      .filter((r: any) => r.subject_id === val)
      .forEach((r: any) => {
        existing[r.student_id] = String(r.obtained_marks);
      });
    setMarks(existing);
    // Also set maxMarks from existing if available
    const first = existingResults.find((r: any) => r.subject_id === val);
    if (first) setMaxMarks(String(first.max_marks));
  };

  const save = async () => {
    if (!subjectId) return;
    setSaving(true);
    const records = Object.entries(marks)
      .filter(([, v]) => v !== "")
      .map(([studentId, obtained]) => ({
        exam_name: examName,
        student_id: studentId,
        subject_id: subjectId,
        obtained_marks: Number(obtained),
        max_marks: Number(maxMarks),
        teacher_id: myTeacher?.id || null,
        state: "done",
      }));
    if (records.length === 0) {
      showToast("Enter at least one mark", "error");
      setSaving(false);
      return;
    }
    // Upsert: update existing rows, insert new ones — prevents duplicates
    const { error } = await supabase.from("exam_results").upsert(records, {
      onConflict: "student_id,subject_id,exam_name",
      ignoreDuplicates: false,
    });
    if (error) {
      // Fallback: if no unique constraint yet, try insert with individual upsert logic
      // Delete existing then insert (safe path until migration adds UNIQUE constraint)
      const studentIds = records.map((r) => r.student_id);
      await supabase
        .from("exam_results")
        .delete()
        .eq("exam_name", examName)
        .eq("subject_id", subjectId)
        .in("student_id", studentIds);
      const { error: insertErr } = await supabase.from("exam_results").insert(records);
      if (insertErr) {
        showToast(insertErr.message, "error");
        setSaving(false);
        return;
      }
    }
    showToast(`${records.length} results saved`);
    onClose();
  };

  const scopeLabel = [filterForm, filterClass].filter(Boolean).join(" — ");

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title={`Add Results — ${examName}`} onClose={onClose} />
      <ModalBody>
        {/* Row 1: Subject + Max Marks */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Subject" required>
            <FieldSelect
              value={subjectId}
              onChange={handleSubjectChange}
              options={[
                { value: "", label: "— Select —" },
                ...availableSubjects.map((s: any) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          <Field label="Max Marks">
            <FieldInput value={maxMarks} onChange={setMaxMarks} type="number" />
          </Field>
        </div>

        {/* Row 2: Form + Class */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Form">
            <FieldSelect
              value={filterForm}
              onChange={handleFormChange}
              options={FORMS.map((f) => ({ value: f, label: f }))}
            />
          </Field>
          <Field label="Class">
            {availableClasses.length === 0 ? (
              <div
                className="rounded-md px-3 py-2 text-[11px]"
                style={{
                  background: "hsl(var(--surface2))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--text3))",
                }}
              >
                No classes found for {filterForm}
              </div>
            ) : (
              <FieldSelect
                value={filterClass}
                onChange={(val) => {
                  setFilterClass(val);
                  setMarks({});
                }}
                options={[
                  { value: "", label: "All Classes" },
                  ...availableClasses.map((c) => ({ value: c, label: c })),
                ]}
              />
            )}
          </Field>
        </div>

        {subjectId && formStudents.length > 0 && (
          <>
            <div className="text-[11px] mb-2 px-1" style={{ color: "hsl(var(--text2))" }}>
              <i className="fas fa-users mr-1" />
              Showing <strong>{formStudents.length}</strong> students
              {filterClass ? ` in ${scopeLabel}` : ` in ${filterForm} (all classes)`} enrolled in this subject
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "350px" }}>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                    {["Student", "Class", "Enrollment", "Marks"].map((h) => (
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
                  {formStudents.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                      <td className="py-2 px-3.5 font-semibold">{s.full_name}</td>
                      <td className="py-2 px-3.5 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                        {s.class_name || "—"}
                      </td>
                      <td className="py-2 px-3.5 font-mono text-[11px]">{s.enrollment_number || "—"}</td>
                      <td className="py-2 px-3.5">
                        <input
                          type="number"
                          min="0"
                          max={maxMarks}
                          value={marks[s.id] || ""}
                          onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                          className="w-20 border rounded py-1 px-2 text-[12px] font-mono outline-none"
                          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface2))" }}
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {subjectId && formStudents.length === 0 && (
          <div className="text-xs py-4 text-center" style={{ color: "hsl(var(--text3))" }}>
            No students enrolled in this subject for {scopeLabel || filterForm}
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Results"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}
