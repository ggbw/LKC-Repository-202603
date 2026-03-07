import React, { useState, useMemo, useRef } from "react";
import {
  useAssignments,
  useSubmissions,
  useSubjects,
  useTeachers,
  useSubjectTeachers,
  useStudents,
  useStudentSubjects,
  useInvalidate,
} from "@/hooks/useSupabaseData";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { FORMS, cap, formatDate, formatDateTime } from "@/data/database";
import { downloadExcel } from "@/lib/excel";
import {
  Badge,
  Card,
  StatCard,
  SearchBar,
  Btn,
  BackBtn,
  Modal,
  ModalHead,
  ModalBody,
  ModalFoot,
  Field,
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from "@/components/SharedUI";

export default function AssignmentsPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin, isTeacher, isStudent, user } = useAuth();
  const { data: assignments = [], isLoading } = useAssignments();
  const { data: submissions = [] } = useSubmissions();
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: students = [] } = useStudents();
  const { data: studentSubjects = [] } = useStudentSubjects();
  const invalidate = useInvalidate();
  const [modal, setModal] = useState(false);
  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);
  const myStudent = students.find((s: any) => s.user_id === user?.id);

  // Filter assignments: teachers see own, students see only published + matching their subjects/form
  const visibleAssignments = useMemo(() => {
    if (isAdmin) return assignments;
    if (isTeacher && myTeacher) return assignments.filter((a: any) => a.teacher_id === myTeacher.id);
    if (isStudent && myStudent) {
      const mySubjectIds = studentSubjects
        .filter((ss: any) => ss.student_id === myStudent.id)
        .map((ss: any) => ss.subject_id);
      return assignments.filter(
        (a: any) =>
          a.state === "published" &&
          a.form === myStudent.form &&
          // If assignment has a class_name set, only show to students in that class
          (a.class_name ? a.class_name === myStudent.class_name : true) &&
          (a.subject_id ? mySubjectIds.includes(a.subject_id) : true),
      );
    }
    return assignments.filter((a: any) => a.state === "published");
  }, [assignments, isAdmin, isTeacher, isStudent, myTeacher, myStudent, studentSubjects]);

  if (detail) return <AssignmentDetail id={detail} onBack={() => setDetail(null)} />;

  const handleExport = () => {
    downloadExcel(
      visibleAssignments.map((a: any) => ({
        Title: a.title,
        Subject: a.subjects?.name || "",
        Form: a.form,
        "Due Date": a.due_date || "",
        Status: cap(a.state || "draft"),
        "Total Marks": a.total_marks || "",
        "Has Attachment": a.attachment_url ? "Yes" : "No",
      })),
      "assignments_export",
      "Assignments",
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

  const pubCount = visibleAssignments.filter((a: any) => a.state === "published").length;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-tasks mr-2" />
            Assignments
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {visibleAssignments.length} total
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}>
            <i className="fas fa-download mr-1" />
            Export
          </Btn>
          {(isAdmin || isTeacher) && (
            <Btn onClick={() => setModal(true)}>
              <i className="fas fa-plus mr-1" />
              Create Assignment
            </Btn>
          )}
        </div>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
        <StatCard icon="fas fa-tasks" bg="#ddf4ff" value={visibleAssignments.length} label="Total" />
        <StatCard icon="fas fa-check-circle" bg="#dafbe1" value={pubCount} label="Published" />
        <StatCard icon="fas fa-inbox" bg="#fff8c5" value={submissions.length} label="Submissions" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {[
                  "Title",
                  "Subject",
                  "Form",
                  "Class",
                  "Due Date",
                  "Type",
                  "Status",
                  "Submissions",
                  ...(isAdmin || isTeacher ? ["Actions"] : []),
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
              {visibleAssignments.map((a: any) => {
                const subs = submissions.filter((s: any) => s.assignment_id === a.id);
                return (
                  <tr
                    key={a.id}
                    className="hover:bg-[hsl(var(--surface2))] cursor-pointer"
                    style={{ borderBottom: "1px solid #f6f8fa" }}
                    onClick={() => setDetail(a.id)}
                  >
                    <td className="py-2.5 px-3.5 font-semibold" style={{ color: "#1a3fa0" }}>
                      {a.title}
                      {a.attachment_url && (
                        <span className="ml-1.5" title="Has attachment">
                          <i className="fas fa-paperclip text-[10px]" style={{ color: "#6e40c9" }} />
                        </span>
                      )}
                      {a.show_on_report_card === false && (
                        <span
                          className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: "#fff8c5", color: "#9a6700", border: "1px solid #ffe07c" }}
                        >
                          <i className="fas fa-eye-slash mr-0.5" />
                          No RC
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-[11px]">{a.subjects?.name || "—"}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{a.form}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">
                      {a.class_name ? (
                        <span
                          className="px-1.5 py-0.5 rounded font-medium"
                          style={{ background: "#ddf4ff", color: "#0969da", fontSize: "10px" }}
                        >
                          {a.class_name}
                        </span>
                      ) : (
                        <span style={{ color: "hsl(var(--text3))" }}>All</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">{formatDate(a.due_date)}</td>
                    <td className="py-2.5 px-3.5">
                      <Badge status={a.submission_type || "file"} />
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge status={a.state || "draft"} />
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-center">{subs.length}</td>
                    {(isAdmin || isTeacher) && (
                      <td className="py-2.5 px-3.5">
                        <div className="flex gap-1">
                          {a.state === "draft" && (a.teacher_id === myTeacher?.id || isAdmin) && (
                            <Btn
                              variant="primary"
                              size="sm"
                              onClick={async (e: any) => {
                                e.stopPropagation();
                                await supabase.from("assignments").update({ state: "published" }).eq("id", a.id);
                                invalidate(["assignments"]);
                                showToast("Published!");
                              }}
                            >
                              <i className="fas fa-globe mr-1" />
                              Publish
                            </Btn>
                          )}
                          {(a.teacher_id === myTeacher?.id || isAdmin) && (
                            <Btn
                              variant="danger"
                              size="sm"
                              onClick={async (e: any) => {
                                e.stopPropagation();
                                if (!confirm("Delete this assignment?")) return;
                                await supabase.from("submissions").delete().eq("assignment_id", a.id);
                                await supabase.from("assignments").delete().eq("id", a.id);
                                invalidate(["assignments", "submissions"]);
                                showToast("Deleted");
                              }}
                            >
                              <i className="fas fa-trash" />
                            </Btn>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <AssignmentModal
          subjects={subjects}
          teachers={teachers}
          subjectTeachers={subjectTeachers}
          onClose={() => {
            setModal(false);
            invalidate(["assignments"]);
          }}
        />
      )}
    </div>
  );
}

// ─── Assignment Detail ────────────────────────────────────────────────────────

function AssignmentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { showToast } = useApp();
  const { isStudent, isTeacher, isAdmin, user } = useAuth();
  const { data: assignments = [] } = useAssignments();
  const { data: submissions = [] } = useSubmissions(id);
  const { data: students = [] } = useStudents();
  const invalidate = useInvalidate();
  const a = assignments.find((x: any) => x.id === id) as any;
  const [submitModal, setSubmitModal] = useState(false);

  if (!a)
    return (
      <>
        <BackBtn onClick={onBack} label="Back" />
        <div>Not found</div>
      </>
    );

  const myStudent = students.find((s: any) => s.user_id === user?.id);
  const mySubmission = myStudent ? submissions.find((s: any) => s.student_id === myStudent.id) : null;

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Assignments" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div
          className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(var(--surface2))", border: "2px solid hsl(var(--border))" }}
        >
          <i className="fas fa-tasks" style={{ fontSize: "28px", color: "#1a3fa0" }} />
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold">{a.title}</div>
          <div className="flex gap-2 items-center mt-1.5">
            <Badge status={a.state || "draft"} />
            <Badge status={a.submission_type || "file"} />
            <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
              {a.subjects?.name} · {a.form}
              {a.class_name ? ` · ${a.class_name}` : ""}
            </span>
          </div>
          <div className="text-xs mt-1" style={{ color: "hsl(var(--text2))" }}>
            Due: {formatDateTime(a.due_date)} · {a.total_marks ? a.total_marks + " marks" : ""}
          </div>
        </div>
        {isStudent && a.state === "published" && !mySubmission && (
          <Btn onClick={() => setSubmitModal(true)}>
            <i className="fas fa-paper-plane mr-1" />
            Submit
          </Btn>
        )}
      </div>

      {a.description && (
        <Card title="Description" className="mb-3.5">
          <div className="text-[12.5px] whitespace-pre-wrap" style={{ color: "hsl(var(--text2))" }}>
            {a.description}
          </div>
        </Card>
      )}

      {/* ── Attachment download card ── */}
      {a.attachment_url && (
        <Card className="mb-3.5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#f0ebff", border: "1px solid #d8b4fe" }}
            >
              <i className="fas fa-paperclip" style={{ color: "#6e40c9", fontSize: "16px" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold truncate">{a.attachment_name || "Attached Document"}</div>
              <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                Attached by teacher · Click to download
              </div>
            </div>
            <a
              href={a.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border rounded-md font-semibold cursor-pointer font-sans transition-all py-[7px] px-3.5 text-xs"
              style={{
                background: "transparent",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--text2))",
                textDecoration: "none",
              }}
            >
              <i className="fas fa-download mr-1" />
              Download
            </a>
          </div>
        </Card>
      )}

      {isStudent && mySubmission && (
        <Card title="My Submission" className="mb-3.5">
          <div className="text-[12px]" style={{ color: "hsl(var(--text2))" }}>
            <div>
              Status: <Badge status={mySubmission.status || "submitted"} />
            </div>
            {mySubmission.submission_text && (
              <div className="mt-2 whitespace-pre-wrap">{mySubmission.submission_text}</div>
            )}
            {mySubmission.obtained_marks !== null && (
              <div className="mt-2 font-bold">
                Marks: {mySubmission.obtained_marks}/{a.total_marks}
              </div>
            )}
            {mySubmission.teacher_comment && <div className="mt-2 italic">Teacher: {mySubmission.teacher_comment}</div>}
          </div>
        </Card>
      )}

      <Card title={`Submissions (${submissions.length})`}>
        {submissions.length === 0 ? (
          <div className="text-xs py-4" style={{ color: "hsl(var(--text3))" }}>
            No submissions yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                  {["Student", "Submitted", "Type", "Marks", "Status", ...(isTeacher || isAdmin ? ["Grade"] : [])].map(
                    (h) => (
                      <th
                        key={h}
                        className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase"
                        style={{ color: "hsl(var(--text2))" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                    <td className="py-2.5 px-3.5 font-semibold">{s.students?.full_name || "—"}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">{formatDateTime(s.submitted_at)}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{s.submission_text ? "Softcopy" : "Hardcopy"}</td>
                    <td className="py-2.5 px-3.5 font-mono">
                      {s.obtained_marks !== null ? `${s.obtained_marks}/${a.total_marks || "?"}` : "—"}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge status={s.status || "submitted"} />
                    </td>
                    {(isTeacher || isAdmin) && (
                      <td className="py-2.5 px-3.5">
                        <GradeSubmissionBtn
                          submission={s}
                          totalMarks={a.total_marks}
                          onDone={() => invalidate(["submissions"])}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {submitModal && (
        <SubmitAssignmentModal
          assignment={a}
          studentId={myStudent?.id}
          onClose={() => {
            setSubmitModal(false);
            invalidate(["submissions"]);
          }}
        />
      )}
    </div>
  );
}

// ─── Grade Submission inline ──────────────────────────────────────────────────

function GradeSubmissionBtn({
  submission,
  totalMarks,
  onDone,
}: {
  submission: any;
  totalMarks: number;
  onDone: () => void;
}) {
  const { showToast } = useApp();
  const [grading, setGrading] = useState(false);
  const [marks, setMarks] = useState(submission.obtained_marks?.toString() || "");
  const [comment, setComment] = useState(submission.teacher_comment || "");

  if (!grading)
    return (
      <Btn variant="outline" size="sm" onClick={() => setGrading(true)}>
        <i className="fas fa-pen mr-1" />
        Grade
      </Btn>
    );

  return (
    <div className="flex gap-1 items-center">
      <input
        type="number"
        value={marks}
        onChange={(e) => setMarks(e.target.value)}
        className="w-14 border rounded py-0.5 px-1 text-[11px] font-mono"
        style={{ borderColor: "hsl(var(--border))" }}
        placeholder="Marks"
      />
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-24 border rounded py-0.5 px-1 text-[11px]"
        style={{ borderColor: "hsl(var(--border))" }}
        placeholder="Comment"
      />
      <Btn
        variant="primary"
        size="sm"
        onClick={async () => {
          await supabase
            .from("submissions")
            .update({
              obtained_marks: marks ? Number(marks) : null,
              teacher_comment: comment || null,
              status: "graded",
            })
            .eq("id", submission.id);
          showToast("Graded");
          setGrading(false);
          onDone();
        }}
      >
        ✓
      </Btn>
    </div>
  );
}

// ─── Student Submit Modal ─────────────────────────────────────────────────────

function SubmitAssignmentModal({
  assignment,
  studentId,
  onClose,
}: {
  assignment: any;
  studentId: string;
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const defaultType = assignment.submission_type === "text" ? "hardcopy" : "softcopy";
  const [submissionType, setSubmissionType] = useState<"softcopy" | "hardcopy">(defaultType);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("submissions").insert({
      assignment_id: assignment.id,
      student_id: studentId,
      submission_text: submissionType === "softcopy" ? text : `[Hardcopy submission]`,
      status: "submitted",
      is_late: assignment.due_date ? new Date() > new Date(assignment.due_date) : false,
    });
    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }
    showToast("Assignment submitted!");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={`Submit: ${assignment.title}`} onClose={onClose} />
      <ModalBody>
        {assignment.submission_type === "both" && (
          <Field label="Submission Type" required>
            <FieldSelect
              value={submissionType}
              onChange={(v) => setSubmissionType(v as any)}
              options={[
                { value: "softcopy", label: "Softcopy (type answer)" },
                { value: "hardcopy", label: "Hardcopy (physical submission)" },
              ]}
            />
          </Field>
        )}
        {submissionType === "softcopy" && (
          <Field label="Your Answer" required>
            <FieldTextarea value={text} onChange={setText} placeholder="Type your answer here..." minHeight="120px" />
          </Field>
        )}
        {submissionType === "hardcopy" && (
          <div
            className="rounded-md px-3 py-2 text-[11px]"
            style={{ background: "#ddf4ff", border: "1px solid #addcff", color: "#0969da" }}
          >
            ℹ Submit the physical copy to your teacher. This records that you intend to submit a hardcopy.
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Submitting…" : "Submit"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

// ─── Create Assignment Modal ──────────────────────────────────────────────────

function AssignmentModal({
  subjects,
  teachers,
  subjectTeachers,
  onClose,
}: {
  subjects: any[];
  teachers: any[];
  subjectTeachers: any[];
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const { user, isAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [form, setForm] = useState("Form 1");
  const [className, setClassName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [submissionType, setSubmissionType] = useState("file");
  const [showOnReport, setShowOnReport] = useState(true);
  const [saving, setSaving] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);

  // Derive available classes for the selected form (read from students table)
  const { data: allStudents = [] } = useStudents();
  const availableClasses = useMemo(() => {
    const names = [
      ...new Set(
        allStudents.filter((s: any) => s.form === form && s.class_name).map((s: any) => s.class_name as string),
      ),
    ].sort();
    return names;
  }, [allStudents, form]);

  // Reset class when form changes
  const handleFormChange = (newForm: string) => {
    setForm(newForm);
    setClassName("");
  };

  // Only show teacher's assigned subjects
  const availableSubjects = useMemo(() => {
    if (isAdmin) return subjects;
    if (myTeacher) {
      const mySubjectIds = subjectTeachers
        .filter((st: any) => st.teacher_id === myTeacher.id)
        .map((st: any) => st.subject_id);
      return subjects.filter((s: any) => mySubjectIds.includes(s.id));
    }
    return subjects;
  }, [subjects, subjectTeachers, myTeacher, isAdmin]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      showToast("File must be under 10 MB", "error");
      return;
    }
    setAttachedFile(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    // Upload file first if one is attached
    if (attachedFile) {
      setUploading(true);
      const ext = attachedFile.name.split(".").pop();
      const filePath = `assignments/${Date.now()}_${myTeacher?.id || "unknown"}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("assignment-attachments")
        .upload(filePath, attachedFile, { upsert: false });

      if (uploadError) {
        showToast(`Upload failed: ${uploadError.message}`, "error");
        setSaving(false);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("assignment-attachments").getPublicUrl(filePath);

      attachmentUrl = urlData?.publicUrl || null;
      attachmentName = attachedFile.name;
      setUploading(false);
    }

    const { error } = await supabase.from("assignments").insert({
      title,
      form,
      class_name: className || null,
      subject_id: subjectId || null,
      description: desc,
      due_date: dueDate || null,
      total_marks: totalMarks ? Number(totalMarks) : null,
      teacher_id: myTeacher?.id || teachers[0]?.id,
      state: "draft",
      submission_type: submissionType,
      show_on_report_card: showOnReport,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    });

    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }
    showToast("Assignment created as draft. Publish when ready.");
    onClose();
  };

  // Allowed file types label
  const allowedTypes = ".pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt, .zip, .png, .jpg, .jpeg";

  return (
    <Modal onClose={onClose}>
      <ModalHead title="Create Assignment" onClose={onClose} />
      <ModalBody>
        <Field label="Title" required>
          <FieldInput value={title} onChange={setTitle} placeholder="e.g. Chapter 3 Exercise" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Form">
            <FieldSelect
              value={form}
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

        {className && (
          <div
            className="rounded-md px-3 py-2 mb-1 text-[11px]"
            style={{ background: "#dafbe1", border: "1px solid #aceebb", color: "#1a7f37" }}
          >
            <i className="fas fa-users mr-1" />
            This assignment will only be visible to{" "}
            <strong>
              {form} — {className}
            </strong>{" "}
            students.
          </div>
        )}

        <Field label="Subject">
          <FieldSelect
            value={subjectId}
            onChange={setSubjectId}
            options={[
              { value: "", label: "— Select —" },
              ...availableSubjects.map((s: any) => ({ value: s.id, label: s.name })),
            ]}
          />
        </Field>

        <Field label="Description">
          <FieldTextarea value={desc} onChange={setDesc} placeholder="Assignment instructions..." />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Due Date">
            <FieldInput value={dueDate} onChange={setDueDate} type="datetime-local" />
          </Field>
          <Field label="Total Marks">
            <FieldInput value={totalMarks} onChange={setTotalMarks} type="number" />
          </Field>
          <Field label="Submission Type">
            <FieldSelect
              value={submissionType}
              onChange={setSubmissionType}
              options={[
                { value: "file", label: "Softcopy" },
                { value: "text", label: "Hardcopy" },
                { value: "both", label: "Both" },
              ]}
            />
          </Field>
        </div>

        {/* ── Document Upload ── */}
        <Field label="Attach Document (optional)">
          {!attachedFile ? (
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface2))" }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "#6e40c9";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "hsl(var(--border))";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "hsl(var(--border))";
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    showToast("File must be under 10 MB", "error");
                    return;
                  }
                  setAttachedFile(file);
                }
              }}
            >
              <i className="fas fa-cloud-upload-alt mb-2 block" style={{ fontSize: "22px", color: "#6e40c9" }} />
              <div className="text-[12px] font-medium" style={{ color: "hsl(var(--text2))" }}>
                Click to browse or drag & drop
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--text3))" }}>
                {allowedTypes} · Max 10 MB
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div
              className="flex items-center gap-3 border rounded-lg px-3 py-2.5"
              style={{ borderColor: "#d8b4fe", background: "#f0ebff" }}
            >
              <i className="fas fa-file text-[18px] flex-shrink-0" style={{ color: "#6e40c9" }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold truncate">{attachedFile.name}</div>
                <div className="text-[10px]" style={{ color: "#6e40c9" }}>
                  {(attachedFile.size / 1024).toFixed(0)} KB · Ready to upload
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-[18px] bg-transparent border-none cursor-pointer leading-none flex-shrink-0"
                style={{ color: "#6e40c9" }}
                title="Remove file"
              >
                ×
              </button>
            </div>
          )}
        </Field>

        {/* ── Report Card Toggle ── */}
        <div
          className="flex items-center justify-between rounded-lg px-3.5 py-3 cursor-pointer"
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
              Include marks on report card
            </div>
            <div className="text-[10px] mt-0.5 ml-5" style={{ color: showOnReport ? "#2ea043" : "hsl(var(--text3))" }}>
              {showOnReport
                ? "This assignment's marks will appear on student report cards"
                : "Marks will be recorded but hidden from report cards"}
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

        <div
          className="rounded-md px-3 py-2 text-[11px]"
          style={{ background: "#fff8c5", border: "1px solid #ffe07c", color: "#9a6700" }}
        >
          ⚠ Assignment will be created as <strong>Draft</strong>. Click "Publish" to make it visible to students.
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving || uploading}>
          {uploading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-1" />
              Uploading…
            </>
          ) : saving ? (
            "Saving…"
          ) : (
            "Create Draft"
          )}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}
