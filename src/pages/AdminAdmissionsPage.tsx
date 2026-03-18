import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useAdmissionEnquiries, useInvalidate } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  StatCard,
  SearchBar,
  Btn,
  Badge,
  Modal,
  ModalHead,
  ModalBody,
  ModalFoot,
  Field,
  FieldInput,
  FieldSelect,
} from "@/components/SharedUI";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminAdmissionsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useApp();
  const { data: enquiries = [], isLoading } = useAdmissionEnquiries();
  const invalidate = useInvalidate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<any>(null); // detail / review modal
  const [enrollModal, setEnrollModal] = useState<any>(null); // enrol modal

  const counts = useMemo(
    () => ({
      all: enquiries.length,
      pending: enquiries.filter((e: any) => e.status === "pending").length,
      approved: enquiries.filter((e: any) => e.status === "approved").length,
      rejected: enquiries.filter((e: any) => e.status === "rejected").length,
    }),
    [enquiries],
  );

  const rows = useMemo(
    () =>
      enquiries.filter((e: any) => {
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return (
            e.student_name?.toLowerCase().includes(s) ||
            e.parent_name?.toLowerCase().includes(s) ||
            e.parent_email?.toLowerCase().includes(s)
          );
        }
        return true;
      }),
    [enquiries, search, statusFilter],
  );

  const updateStatus = async (id: string, status: string, rejection_reason?: string) => {
    const { error } = await supabase
      .from("admission_enquiries")
      .update({ status, ...(rejection_reason ? { rejection_reason } : {}) } as any)
      .eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return false;
    }
    invalidate(["admission_enquiries"]);
    return true;
  };

  if (!isAdmin)
    return (
      <div className="page-animate">
        <div className="text-sm" style={{ color: "hsl(var(--text2))" }}>
          Access denied
        </div>
      </div>
    );

  if (isLoading)
    return (
      <div className="page-animate">
        <div className="text-sm" style={{ color: "hsl(var(--text2))" }}>
          Loading...
        </div>
      </div>
    );

  const filterTabs: { key: StatusFilter; label: string; count: number; color: string }[] = [
    { key: "all", label: "All", count: counts.all, color: "#1a3fa0" },
    { key: "pending", label: "Pending", count: counts.pending, color: "#9a6700" },
    { key: "approved", label: "Approved", count: counts.approved, color: "#1a7f37" },
    { key: "rejected", label: "Rejected", count: counts.rejected, color: "#cf222e" },
  ];

  return (
    <div className="page-animate">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-file-alt mr-2" />
            Admissions
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {counts.all} total · {counts.pending} pending review
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard icon="fas fa-inbox" bg="#ddf4ff" value={counts.all} label="Total" />
        <StatCard icon="fas fa-clock" bg="#fff8c5" value={counts.pending} label="Pending" />
        <StatCard icon="fas fa-check-circle" bg="#dafbe1" value={counts.approved} label="Approved" />
        <StatCard icon="fas fa-times-circle" bg="#ffebe9" value={counts.rejected} label="Rejected" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer border-none transition-all"
            style={{
              background: statusFilter === t.key ? t.color : "hsl(var(--surface2))",
              color: statusFilter === t.key ? "#fff" : "hsl(var(--text2))",
            }}
          >
            {t.label} <span className="ml-1 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search student or parent name..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Student", "Form", "Parent", "Contact", "Date", "Status", "Actions"].map((h) => (
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
              {rows.map((e: any) => (
                <tr
                  key={e.id}
                  className="hover:bg-[hsl(var(--surface2))] transition-colors"
                  style={{ borderBottom: "1px solid hsl(var(--border))" }}
                >
                  <td className="py-2.5 px-3.5 font-semibold">{e.student_name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{e.form_applying}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{e.parent_name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                    {e.parent_email && <div>{e.parent_email}</div>}
                    {e.parent_phone && <div>{e.parent_phone}</div>}
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                    {e.created_at?.split("T")[0]}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex gap-1">
                      <Btn variant="outline" size="sm" onClick={() => setSelected(e)}>
                        <i className="fas fa-eye mr-1" />
                        Review
                      </Btn>
                      {e.status === "approved" && (
                        <Btn size="sm" onClick={() => setEnrollModal(e)}>
                          <i className="fas fa-user-plus mr-1" />
                          Enrol
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[12px]" style={{ color: "hsl(var(--text3))" }}>
                    No enquiries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <ReviewModal
          enquiry={selected}
          onClose={() => {
            setSelected(null);
            invalidate(["admission_enquiries"]);
          }}
          onApprove={async (id) => {
            const ok = await updateStatus(id, "approved");
            if (ok) {
              showToast("Application approved");
              setSelected(null);
            }
          }}
          onReject={async (id, reason) => {
            const ok = await updateStatus(id, "rejected", reason);
            if (ok) {
              showToast("Application rejected");
              setSelected(null);
            }
          }}
          onEnrol={(enq) => {
            setSelected(null);
            setEnrollModal(enq);
          }}
        />
      )}

      {enrollModal && (
        <EnrolModal
          enquiry={enrollModal}
          onClose={() => {
            setEnrollModal(null);
            invalidate(["admission_enquiries"]);
          }}
        />
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
    pending: { bg: "#fff8c5", color: "#9a6700", border: "#ffe07c", label: "Pending", icon: "fa-clock" },
    approved: { bg: "#dafbe1", color: "#1a7f37", border: "#aceebb", label: "Approved", icon: "fa-check-circle" },
    rejected: { bg: "#ffebe9", color: "#cf222e", border: "#ffcecb", label: "Rejected", icon: "fa-times-circle" },
  };
  const s = styles[status] || styles.pending;
  return (
    <span
      className="rounded px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <i className={`fas ${s.icon} mr-1`} />
      {s.label}
    </span>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({
  enquiry: e,
  onClose,
  onApprove,
  onReject,
  onEnrol,
}: {
  enquiry: any;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onEnrol: (enquiry: any) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(e.rejection_reason || "");

  const Row = ({ label, value }: { label: string; value: any }) =>
    value ? (
      <div className="flex py-2" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="w-36 flex-shrink-0 text-[11px] font-semibold" style={{ color: "hsl(var(--text2))" }}>
          {label}
        </div>
        <div className="text-[12.5px]">{value}</div>
      </div>
    ) : null;

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title={`Application — ${e.student_name}`} onClose={onClose} />
      <ModalBody>
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={e.status} />
          <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            Submitted {e.created_at?.split("T")[0]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
              Student
            </div>
            <Row label="Full Name" value={e.student_name} />
            <Row label="Date of Birth" value={e.date_of_birth} />
            <Row label="Gender" value={e.gender} />
            <Row label="Nationality" value={e.nationality} />
            <Row label="Form Applying" value={e.form_applying} />
            <Row label="Previous School" value={e.previous_school} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
              Parent / Guardian
            </div>
            <Row label="Name" value={e.parent_name} />
            <Row label="Email" value={e.parent_email} />
            <Row label="Phone" value={e.parent_phone} />
          </div>
        </div>

        {e.notes && (
          <div
            className="mt-3 rounded-md px-3 py-2.5 text-[12px]"
            style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="font-semibold text-[10px] uppercase mb-1" style={{ color: "hsl(var(--text2))" }}>
              Notes
            </div>
            {e.notes}
          </div>
        )}

        {e.status === "rejected" && e.rejection_reason && (
          <div
            className="mt-3 rounded-md px-3 py-2.5 text-[12px]"
            style={{ background: "#ffebe9", border: "1px solid #ffcecb", color: "#cf222e" }}
          >
            <div className="font-semibold text-[10px] uppercase mb-1">Rejection Reason</div>
            {e.rejection_reason}
          </div>
        )}

        {rejecting && (
          <div className="mt-3">
            <Field label="Reason for rejection (optional)">
              <FieldInput value={reason} onChange={setReason} placeholder="e.g. No places available for Form 3" />
            </Field>
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Close
        </Btn>
        {e.status === "pending" && !rejecting && (
          <>
            <Btn variant="danger" onClick={() => setRejecting(true)}>
              <i className="fas fa-times mr-1" />
              Reject
            </Btn>
            <Btn onClick={() => onApprove(e.id)}>
              <i className="fas fa-check mr-1" />
              Approve
            </Btn>
          </>
        )}
        {rejecting && (
          <>
            <Btn variant="outline" onClick={() => setRejecting(false)}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={() => onReject(e.id, reason)}>
              <i className="fas fa-times mr-1" />
              Confirm Rejection
            </Btn>
          </>
        )}
        {e.status === "approved" && (
          <Btn onClick={() => onEnrol(e)}>
            <i className="fas fa-user-graduate mr-1" />
            Enrol Student
          </Btn>
        )}
      </ModalFoot>
    </Modal>
  );
}

// ── Enrol Modal ───────────────────────────────────────────────────────────────
function EnrolModal({ enquiry: e, onClose }: { enquiry: any; onClose: () => void }) {
  const { showToast } = useApp();
  const invalidate = useInvalidate();

  // Student fields — pre-filled from enquiry
  const [studentName, setStudentName] = useState(e.student_name || "");
  const [form, setForm] = useState(e.form_applying || "Form 1");
  const [gender, setGender] = useState(e.gender?.toLowerCase() || "male");
  const [dob, setDob] = useState(e.date_of_birth || "");
  const [nationality, setNationality] = useState(e.nationality || "");
  const [enrollment, setEnrollment] = useState("");
  const [className, setClassName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // Parent fields — pre-filled from enquiry
  const [parentName, setParentName] = useState(e.parent_name || "");
  const [parentEmail, setParentEmail] = useState(e.parent_email || "");
  const [parentPhone, setParentPhone] = useState(e.parent_phone || "");
  const [relation, setRelation] = useState("Parent");

  // Account creation options
  const [createStudentAccount, setCreateStudentAccount] = useState(false);
  const [createParentAccount, setCreateParentAccount] = useState(false);

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ studentPw?: string; parentPw?: string } | null>(null);

  const FORMS = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6", "Form 7"];

  const enrol = async () => {
    if (!studentName.trim() || !parentName.trim()) {
      showToast("Student name and parent name are required", "error");
      return;
    }
    setSaving(true);

    // 1. Create student record
    const { data: studentData, error: sErr } = await supabase
      .from("students")
      .insert({
        full_name: studentName,
        form,
        gender: gender || null,
        date_of_birth: dob || null,
        nationality: nationality || null,
        enrollment_number: enrollment || null,
        class_name: className || null,
        email: studentEmail || null,
        state: "active",
        admission_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (sErr) {
      showToast("Failed to create student: " + sErr.message, "error");
      setSaving(false);
      return;
    }
    const studentId = studentData.id;

    // 2. Create parent record
    const { data: parentData, error: pErr } = await supabase
      .from("parents")
      .insert({
        name: parentName,
        email: parentEmail || null,
        phone: parentPhone || null,
        relation: relation || null,
      })
      .select()
      .single();

    if (pErr) {
      showToast("Failed to create parent: " + pErr.message, "error");
      setSaving(false);
      return;
    }
    const parentId = parentData.id;

    // 3. Link parent ↔ student
    await supabase.from("parent_students").insert({ parent_id: parentId, student_id: studentId });

    let studentPw: string | undefined;
    let parentPw: string | undefined;

    // 4. Optionally create student login account
    if (createStudentAccount && studentEmail) {
      studentPw = studentName.split(" ")[0]?.toLowerCase() + Math.floor(1000 + Math.random() * 9000);
      const { error: saErr } = await supabase.functions.invoke("create-user", {
        body: {
          email: studentEmail,
          password: studentPw,
          full_name: studentName,
          role: "student",
          link_table: "students",
          link_id: studentId,
        },
      });
      if (saErr) showToast("Student account creation failed: " + saErr.message, "warning");
    }

    // 5. Optionally create parent login account
    if (createParentAccount && parentEmail) {
      parentPw = parentName.split(" ")[0]?.toLowerCase() + Math.floor(1000 + Math.random() * 9000);
      const { error: paErr } = await supabase.functions.invoke("create-user", {
        body: {
          email: parentEmail,
          password: parentPw,
          full_name: parentName,
          role: "parent",
          link_table: "parents",
          link_id: parentId,
        },
      });
      if (paErr) showToast("Parent account creation failed: " + paErr.message, "warning");
    }

    // 6. Mark enquiry as enrolled
    await supabase
      .from("admission_enquiries")
      .update({ status: "enrolled" } as any)
      .eq("id", e.id);

    invalidate(["students", "parents", "parent_students", "admission_enquiries"]);
    setSaving(false);
    setDone({ studentPw, parentPw });
  };

  // ── Success screen ──
  if (done) {
    return (
      <Modal onClose={onClose} size="lg">
        <ModalHead title="✅ Student Enrolled!" onClose={onClose} />
        <ModalBody>
          <div className="rounded-lg px-4 py-3 mb-3" style={{ background: "#dafbe1", border: "1px solid #aceebb" }}>
            <div className="font-bold text-[12.5px] mb-2" style={{ color: "#1a7f37" }}>
              <i className="fas fa-graduation-cap mr-1" />
              {studentName} has been enrolled as a student.
            </div>
            <div className="text-[11px]" style={{ color: "#2ea043" }}>
              Form: {form}
              {className ? ` · Class: ${className}` : ""}
            </div>
            <div className="text-[11px]" style={{ color: "#2ea043" }}>
              Parent linked: {parentName}
            </div>
          </div>

          {(done.studentPw || done.parentPw) && (
            <div className="rounded-lg px-4 py-3" style={{ background: "#fff8c5", border: "1px solid #ffe07c" }}>
              <div className="font-semibold text-[11px] mb-2" style={{ color: "#9a6700" }}>
                <i className="fas fa-key mr-1" />
                Login Credentials — share securely
              </div>
              {done.studentPw && (
                <div className="text-[11px] mb-1" style={{ color: "#9a6700" }}>
                  Student: <strong>{studentEmail}</strong> · Password:{" "}
                  <strong className="font-mono">{done.studentPw}</strong>
                </div>
              )}
              {done.parentPw && (
                <div className="text-[11px]" style={{ color: "#9a6700" }}>
                  Parent: <strong>{parentEmail}</strong> · Password:{" "}
                  <strong className="font-mono">{done.parentPw}</strong>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFoot>
          <Btn onClick={onClose}>Done</Btn>
        </ModalFoot>
      </Modal>
    );
  }

  // ── Enrol form ──
  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title={`Enrol — ${e.student_name}`} onClose={onClose} />
      <ModalBody>
        <div
          className="rounded-md px-3 py-2 text-[11px] mb-4"
          style={{ background: "#ddf4ff", border: "1px solid #addcff", color: "#0969da" }}
        >
          <i className="fas fa-info-circle mr-1" />
          Review and confirm the details below. This will create a student record, a parent record, and link them
          together.
        </div>

        {/* Student details */}
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
          <i className="fas fa-graduation-cap mr-1" />
          Student Details
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Full Name" required>
            <FieldInput value={studentName} onChange={setStudentName} />
          </Field>
          <Field label="Form" required>
            <FieldSelect value={form} onChange={setForm} options={FORMS.map((f) => ({ value: f, label: f }))} />
          </Field>
          <Field label="Gender">
            <FieldSelect
              value={gender}
              onChange={setGender}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Field>
          <Field label="Date of Birth">
            <FieldInput value={dob} onChange={setDob} type="date" />
          </Field>
          <Field label="Nationality">
            <FieldInput value={nationality} onChange={setNationality} />
          </Field>
          <Field label="Enrollment Number">
            <FieldInput value={enrollment} onChange={setEnrollment} placeholder="Auto-assigned if blank" />
          </Field>
          <Field label="Class">
            <FieldInput value={className} onChange={setClassName} placeholder="e.g. A, B, Blue" />
          </Field>
          <Field label="Student Email">
            <FieldInput value={studentEmail} onChange={setStudentEmail} type="email" />
          </Field>
        </div>

        {/* Parent details */}
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
          <i className="fas fa-users mr-1" />
          Parent / Guardian Details
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Full Name" required>
            <FieldInput value={parentName} onChange={setParentName} />
          </Field>
          <Field label="Relation">
            <FieldSelect
              value={relation}
              onChange={setRelation}
              options={[
                { value: "Parent", label: "Parent" },
                { value: "Mother", label: "Mother" },
                { value: "Father", label: "Father" },
                { value: "Guardian", label: "Guardian" },
              ]}
            />
          </Field>
          <Field label="Email">
            <FieldInput value={parentEmail} onChange={setParentEmail} type="email" />
          </Field>
          <Field label="Phone">
            <FieldInput value={parentPhone} onChange={setParentPhone} />
          </Field>
        </div>

        {/* Account creation toggles */}
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--text2))" }}>
          <i className="fas fa-user-cog mr-1" />
          Create Login Accounts
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Create student login account",
              checked: createStudentAccount,
              set: setCreateStudentAccount,
              email: studentEmail,
              note: "Requires student email",
            },
            {
              label: "Create parent login account",
              checked: createParentAccount,
              set: setCreateParentAccount,
              email: parentEmail,
              note: "Requires parent email",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg px-3.5 py-3 cursor-pointer transition-all"
              style={{
                background: item.checked ? "#dafbe1" : "hsl(var(--surface2))",
                border: `1px solid ${item.checked ? "#aceebb" : "hsl(var(--border))"}`,
              }}
              onClick={() => item.set((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <i
                  className={`fas ${item.checked ? "fa-check-square" : "fa-square"} text-sm`}
                  style={{ color: item.checked ? "#1a7f37" : "hsl(var(--text3))" }}
                />
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: item.checked ? "#1a7f37" : "hsl(var(--text2))" }}
                >
                  {item.label}
                </span>
              </div>
              {item.checked && !item.email && (
                <div className="text-[10px] mt-1 ml-5" style={{ color: "#cf222e" }}>
                  <i className="fas fa-exclamation-triangle mr-1" />
                  {item.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={enrol} disabled={saving}>
          {saving ? (
            "Enrolling…"
          ) : (
            <>
              <i className="fas fa-user-graduate mr-1" />
              Confirm Enrolment
            </>
          )}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}
