import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useRequisitions, useRequisitionLogs, useReqRoleMappings, useInvalidate } from "@/hooks/useSupabaseData";
import {
  Card,
  Btn,
  Modal,
  ModalHead,
  ModalBody,
  ModalFoot,
  Field,
  FieldInput,
  FieldSelect,
  FieldTextarea,
  FilterSelect,
  SearchBar,
} from "@/components/SharedUI";
import { formatDate, formatDateTime, cap } from "@/data/database";

const CATEGORIES = ["Stationery", "Maintenance", "ICT Equipment", "Vehicle/Transport", "Resource Centre", "Other"];
const URGENCIES = ["Normal", "Urgent", "Emergency"];
const DEPARTMENTS = [
  "Administration",
  "Science",
  "Mathematics",
  "Languages",
  "Humanities",
  "ICT",
  "Arts",
  "Physical Education",
  "Finance",
  "Maintenance",
  "Library",
  "Other",
];

const CATEGORY_ROLE_MAP: Record<string, string> = {
  Stationery: "Stationery Officer",
  Maintenance: "Maintenance Officer",
  "ICT Equipment": "ICT Head",
  "Vehicle/Transport": "CFO",
  "Resource Centre": "Resource Centre Admin",
  Other: "Stationery Officer",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "Pending Officer Review": { bg: "#fff8c5", color: "#9a6700" },
  "Pending MD Approval": { bg: "#ddf4ff", color: "#0969da" },
  "Approved - Action Pending": { bg: "#f1f0ff", color: "#6e40c9" },
  Completed: { bg: "#dafbe1", color: "#1a7f37" },
  Rejected: { bg: "#ffebe9", color: "#cf222e" },
};

const URGENCY_COLORS: Record<string, { bg: string; color: string }> = {
  Normal: { bg: "#f6f8fa", color: "#656d76" },
  Urgent: { bg: "#fff8c5", color: "#9a6700" },
  Emergency: { bg: "#ffebe9", color: "#cf222e" },
};

const STAGE_STEPS = [
  { label: "Submitted", ico: "fas fa-paper-plane" },
  { label: "Officer Review", ico: "fas fa-user-check" },
  { label: "MD Approval", ico: "fas fa-crown" },
  { label: "Completed", ico: "fas fa-flag-checkered" },
];

export default function RequisitionsPage() {
  const { user, profile, isAdmin } = useAuth();
  const { showToast } = useApp();
  const invalidate = useInvalidate();

  const { data: allReqs = [], isLoading } = useRequisitions();
  const { data: roleMappings = [] } = useReqRoleMappings();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const myReqRoles = useMemo(
    () => roleMappings.filter((m: any) => m.user_id === user?.id).map((m: any) => m.req_role),
    [roleMappings, user?.id],
  );
  const isMD = myReqRoles.includes("MD");
  const isOfficer = myReqRoles.some((r: string) => r !== "MD");

  const visibleReqs = useMemo(() => {
    return allReqs.filter((r: any) => {
      if (isAdmin) return true;
      if (r.requestor_id === user?.id) return true;
      if (r.category_officer_id === user?.id) return true;
      if (isMD && (r.status === "Pending MD Approval" || r.status === "Approved - Action Pending")) return true;
      return false;
    });
  }, [allReqs, isAdmin, isMD, user?.id]);

  const filtered = useMemo(() => {
    return visibleReqs.filter((r: any) => {
      const s = search.toLowerCase();
      const matchSearch =
        !s ||
        r.ref_number?.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s) ||
        r.requestor_name?.toLowerCase().includes(s);
      return (
        matchSearch &&
        (!filterStatus || r.status === filterStatus) &&
        (!filterCategory || r.category === filterCategory)
      );
    });
  }, [visibleReqs, search, filterStatus, filterCategory]);

  const stats = useMemo(
    () => ({
      total: visibleReqs.length,
      pending: visibleReqs.filter((r: any) => !["Completed", "Rejected"].includes(r.status)).length,
      approved: visibleReqs.filter((r: any) => ["Approved - Action Pending", "Completed"].includes(r.status)).length,
      rejected: visibleReqs.filter((r: any) => r.status === "Rejected").length,
    }),
    [visibleReqs],
  );

  const canAct = (r: any) => {
    if (["Completed", "Rejected"].includes(r.status)) return false;
    if (isAdmin) return true;
    if (r.status === "Pending Officer Review" && r.category_officer_id === user?.id) return true;
    if (r.status === "Pending MD Approval" && isMD) return true;
    if (r.status === "Approved - Action Pending" && r.category_officer_id === user?.id) return true;
    return false;
  };

  const actionCount = visibleReqs.filter(canAct).length;

  return (
    <div className="page-animate">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold">
          <i className="fas fa-file-invoice mr-2" />
          Requisitions
        </div>
        <Btn onClick={() => setShowForm(true)}>
          <i className="fas fa-plus mr-1.5" />
          New Requisition
        </Btn>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total", value: stats.total, bg: "#ddf4ff", color: "#0969da", ico: "fas fa-list" },
          { label: "In Progress", value: stats.pending, bg: "#fff8c5", color: "#9a6700", ico: "fas fa-hourglass-half" },
          { label: "Approved", value: stats.approved, bg: "#f1f0ff", color: "#6e40c9", ico: "fas fa-check-circle" },
          { label: "Rejected", value: stats.rejected, bg: "#ffebe9", color: "#cf222e", ico: "fas fa-times-circle" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 p-4 rounded-lg border"
            style={{ background: "hsl(var(--surface))", borderColor: "hsl(var(--border))", boxShadow: "var(--shadow)" }}
          >
            <div
              className="w-10 h-10 rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ background: s.bg }}
            >
              <i className={s.ico} style={{ color: s.color, fontSize: "16px" }} />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono leading-none">{s.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "hsl(var(--text2))" }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {actionCount > 0 && (
        <div
          className="rounded-md px-4 py-3 mb-4 flex items-center gap-3 text-[12.5px]"
          style={{ background: "#fff8c5", border: "1px solid #ffe07c", color: "#9a6700" }}
        >
          <i className="fas fa-bell text-lg" />
          <strong>
            {actionCount} requisition{actionCount > 1 ? "s" : ""}
          </strong>
          &nbsp;awaiting your action
        </div>
      )}

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ref, description, requestor…">
          <FilterSelect
            value={filterStatus}
            onChange={setFilterStatus}
            allLabel="All Statuses"
            options={Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s }))}
          />
          <FilterSelect
            value={filterCategory}
            onChange={setFilterCategory}
            allLabel="All Categories"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </SearchBar>

        {isLoading ? (
          <div className="py-12 text-center text-sm" style={{ color: "hsl(var(--text3))" }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm font-semibold">No requisitions found</div>
            <div className="text-xs mt-1" style={{ color: "hsl(var(--text3))" }}>
              Submit a new requisition to get started
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                  {[
                    "Ref #",
                    "Category",
                    "Description",
                    "Urgency",
                    "Date Req.",
                    "Requestor",
                    "Officer",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="py-[9px] px-3 text-left text-[10px] font-semibold uppercase"
                      style={{ color: "hsl(var(--text2))" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const sc = STATUS_COLORS[r.status] || { bg: "#f6f8fa", color: "#656d76" };
                  const uc = URGENCY_COLORS[r.urgency] || URGENCY_COLORS.Normal;
                  const needsAction = canAct(r);
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid #f6f8fa", background: needsAction ? "#fffdf5" : undefined }}
                      className="transition-colors hover:bg-[hsl(var(--surface2))]"
                    >
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => setDetail(r)}
                          className="font-mono text-[11px] font-bold hover:underline bg-transparent border-none cursor-pointer p-0"
                          style={{ color: "#0969da" }}
                        >
                          {r.ref_number}
                        </button>
                        {needsAction && (
                          <span
                            className="ml-1.5 text-[9px] font-bold rounded-full px-1.5 py-0.5"
                            style={{ background: "#fff8c5", color: "#9a6700" }}
                          >
                            ACTION
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">{r.category}</td>
                      <td className="py-2.5 px-3 max-w-[180px] truncate">{r.description}</td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={uc}>
                          {r.urgency}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                        {formatDate(r.date_required)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[11px]">{r.requestor_name}</td>
                      <td className="py-2.5 px-3 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                        {r.category_officer_name || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap" style={sc}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Btn variant={needsAction ? "primary" : "outline"} size="sm" onClick={() => setDetail(r)}>
                          <i className={`fas ${needsAction ? "fa-tasks" : "fa-eye"} mr-1`} />
                          {needsAction ? "Act" : "View"}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[11px] mt-2" style={{ color: "hsl(var(--text2))" }}>
              {filtered.length} requisition(s)
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <RequisitionForm
          profile={profile}
          userId={user?.id}
          roleMappings={roleMappings}
          onClose={() => {
            setShowForm(false);
            invalidate(["requisitions"]);
            showToast("Requisition submitted");
          }}
        />
      )}

      {detail && (
        <RequisitionDetail
          req={detail}
          canAct={canAct(detail)}
          userId={user?.id}
          isMD={isMD}
          actorName={profile?.full_name || ""}
          actorId={user?.id || ""}
          onClose={() => {
            setDetail(null);
            invalidate(["requisitions", "requisition_logs"]);
          }}
        />
      )}
    </div>
  );
}

// ─── Requisition Form ─────────────────────────────────────────────────────────

function RequisitionForm({ profile, userId, roleMappings, onClose }: any) {
  const { showToast } = useApp();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "Stationery",
    description: "",
    quantity: "1",
    estimated_cost: "",
    justification: "",
    date_required: "",
    department: "",
    urgency: "Normal",
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const officerRole = CATEGORY_ROLE_MAP[form.category] || "Stationery Officer";
  const officerMappings = roleMappings.filter((m: any) => m.req_role === officerRole);
  const mdMappings = roleMappings.filter((m: any) => m.req_role === "MD");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = "Required";
    if (!form.justification.trim()) e.justification = "Required";
    if (!form.date_required) e.date_required = "Required";
    if (!form.department) e.department = "Required";
    if (!form.estimated_cost || isNaN(Number(form.estimated_cost))) e.estimated_cost = "Enter a valid amount";
    if (!form.quantity || Number(form.quantity) < 1) e.quantity = "Must be at least 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    let attachment_url = null,
      attachment_name = null;
    if (file) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await (supabase.storage as any).from("requisition-attachments").upload(path, file);
      if (upErr) {
        showToast(upErr.message, "error");
        setSaving(false);
        return;
      }
      const {
        data: { publicUrl },
      } = (supabase.storage as any).from("requisition-attachments").getPublicUrl(path);
      attachment_url = publicUrl;
      attachment_name = file.name;
    }
    const refNum = `REQ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const officer = officerMappings[0] || null;
    const md = mdMappings[0] || null;

    const { data: req, error } = await (supabase as any)
      .from("requisitions")
      .insert({
        ref_number: refNum,
        requestor_id: userId,
        requestor_name: profile?.full_name || "Unknown",
        category: form.category,
        description: form.description.trim(),
        quantity: parseInt(form.quantity),
        estimated_cost: parseFloat(form.estimated_cost),
        justification: form.justification.trim(),
        date_required: form.date_required,
        department: form.department,
        urgency: form.urgency,
        attachment_url,
        attachment_name,
        status: "Pending Officer Review",
        current_stage: 1,
        category_officer_id: officer?.user_id || null,
        category_officer_name: officer?.user_name || null,
        md_id: md?.user_id || null,
        md_name: md?.user_name || null,
      })
      .select()
      .single();

    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }

    await (supabase as any).from("requisition_logs").insert({
      requisition_id: req.id,
      actor_id: userId,
      actor_name: profile?.full_name || "Unknown",
      action: "submitted",
      stage: 1,
      note: `Submitted. Assigned to ${officer?.user_name || "unassigned"} for review.`,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title="New Requisition" onClose={onClose} />
      <ModalBody>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Field label="Category" required>
              <FieldSelect
                value={form.category}
                onChange={(v) => set("category", v)}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <div
              className="rounded-md px-3 py-2 text-[11px] mb-3 -mt-1"
              style={{
                background: officerMappings.length > 0 ? "#dafbe1" : "#fff8c5",
                border: `1px solid ${officerMappings.length > 0 ? "#aceebb" : "#ffe07c"}`,
              }}
            >
              <span style={{ color: officerMappings.length > 0 ? "#1a7f37" : "#9a6700" }}>
                <i
                  className={`fas ${officerMappings.length > 0 ? "fa-user-check" : "fa-exclamation-triangle"} mr-1.5`}
                />
                <strong>{officerRole}:</strong>{" "}
                {officerMappings.length > 0
                  ? officerMappings.map((m: any) => m.user_name).join(", ")
                  : "No user mapped — contact admin"}
              </span>
            </div>
          </div>
          <Field label="Department" required error={errors.department}>
            <FieldSelect
              value={form.department}
              onChange={(v) => set("department", v)}
              options={[
                { value: "", label: "— Select Department —" },
                ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
              ]}
              hasError={!!errors.department}
            />
          </Field>
        </div>

        <Field label="Item / Service Description" required error={errors.description}>
          <FieldInput
            value={form.description}
            onChange={(v) => set("description", v)}
            placeholder="Describe the item or service needed"
            hasError={!!errors.description}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Quantity" required error={errors.quantity}>
            <FieldInput
              value={form.quantity}
              onChange={(v) => set("quantity", v)}
              type="number"
              placeholder="1"
              hasError={!!errors.quantity}
            />
          </Field>
          <Field label="Estimated Cost (BWP)" required error={errors.estimated_cost}>
            <FieldInput
              value={form.estimated_cost}
              onChange={(v) => set("estimated_cost", v)}
              type="number"
              placeholder="0.00"
              hasError={!!errors.estimated_cost}
            />
          </Field>
          <Field label="Date Required" required error={errors.date_required}>
            <FieldInput
              value={form.date_required}
              onChange={(v) => set("date_required", v)}
              type="date"
              hasError={!!errors.date_required}
            />
          </Field>
        </div>

        <Field label="Urgency Level" required>
          <div className="flex gap-2">
            {URGENCIES.map((u) => {
              const c = URGENCY_COLORS[u];
              const selected = form.urgency === u;
              return (
                <button
                  key={u}
                  onClick={() => set("urgency", u)}
                  className="flex-1 py-2 rounded-md text-[12px] font-semibold border transition-all cursor-pointer"
                  style={{
                    background: selected ? c.bg : "hsl(var(--surface2))",
                    color: selected ? c.color : "hsl(var(--text2))",
                    borderColor: selected ? c.color : "hsl(var(--border))",
                  }}
                >
                  {u === "Emergency" && <i className="fas fa-exclamation-triangle mr-1" />}
                  {u === "Urgent" && <i className="fas fa-clock mr-1" />}
                  {u === "Normal" && <i className="fas fa-circle mr-1" />}
                  {u}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Reason / Justification" required error={errors.justification}>
          <FieldTextarea
            value={form.justification}
            onChange={(v) => set("justification", v)}
            placeholder="Explain why this requisition is needed…"
            minHeight="80px"
          />
        </Field>

        {/* Workflow preview */}
        <div
          className="rounded-md p-3 mb-3"
          style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border))" }}
        >
          <div className="text-[10px] font-bold uppercase mb-2" style={{ color: "hsl(var(--text2))" }}>
            Approval Workflow
          </div>
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            {[
              { label: "You submit", ico: "fa-paper-plane", bg: "#ddf4ff", color: "#0969da" },
              {
                label: `${officerRole}${officerMappings[0] ? ` — ${officerMappings[0].user_name}` : " (unassigned)"}`,
                ico: "fa-user-check",
                bg: "#fff8c5",
                color: "#9a6700",
              },
              {
                label: `MD${mdMappings[0] ? ` — ${mdMappings[0].user_name}` : " (unassigned)"}`,
                ico: "fa-crown",
                bg: "#fff3cd",
                color: "#856404",
              },
              {
                label: `${officerMappings[0]?.user_name || officerRole} completes`,
                ico: "fa-flag-checkered",
                bg: "#dafbe1",
                color: "#1a7f37",
              },
            ].map((step, i) => (
              <React.Fragment key={step.label}>
                {i > 0 && <i className="fas fa-arrow-right text-[10px]" style={{ color: "hsl(var(--text3))" }} />}
                <span
                  className="rounded-full px-2.5 py-1 font-semibold"
                  style={{ background: step.bg, color: step.color }}
                >
                  <i className={`fas ${step.ico} mr-1`} />
                  {step.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <Field label="Supporting Documents (Optional)">
          <div
            className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer"
            style={{
              borderColor: file ? "#1a7f37" : "hsl(var(--border))",
              background: file ? "#dafbe1" : "hsl(var(--surface2))",
            }}
            onClick={() => document.getElementById("req-file-input")?.click()}
          >
            <input
              id="req-file-input"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.png,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="text-[12px] font-semibold" style={{ color: "#1a7f37" }}>
                <i className="fas fa-check-circle mr-1.5" />
                {file.name}
                <button
                  className="ml-2 text-[10px]"
                  style={{ color: "#cf222e" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ color: "hsl(var(--text3))" }}>
                <i className="fas fa-paperclip text-xl mb-1 block" />
                <div className="text-[12px]">Click to attach a file</div>
                <div className="text-[10px] mt-0.5">PDF, Word, Excel, Image — max 10MB</div>
              </div>
            )}
          </div>
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={saving}>
          {saving ? "Submitting…" : "Submit Requisition"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

// ─── Requisition Detail ───────────────────────────────────────────────────────

function RequisitionDetail({ req, canAct, userId, isMD, actorName, actorId, onClose }: any) {
  const { showToast } = useApp();
  const { data: logs = [] } = useRequisitionLogs(req.id);
  const [action, setAction] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const sc = STATUS_COLORS[req.status] || { bg: "#f6f8fa", color: "#656d76" };
  const uc = URGENCY_COLORS[req.urgency] || URGENCY_COLORS.Normal;

  const currentStep =
    req.status === "Completed"
      ? 3
      : ["Approved - Action Pending"].includes(req.status)
        ? 2
        : req.status === "Pending MD Approval"
          ? 2
          : 1;

  const isOfficerAction = req.status === "Pending Officer Review" && req.category_officer_id === userId;
  const isMDAction = req.status === "Pending MD Approval" && isMD;
  const isCompleteAction = req.status === "Approved - Action Pending" && req.category_officer_id === userId;

  const doAction = async (act: string) => {
    if ((act === "reject" || act === "sendback") && !note.trim()) return;
    setSaving(true);

    const STATUS_MAP: Record<string, string> = {
      officer_approve: "Pending MD Approval",
      md_approve: "Approved - Action Pending",
      complete: "Completed",
      sendback: "Pending Officer Review",
      reject: "Rejected",
    };
    const LOG_MAP: Record<string, string> = {
      officer_approve: "approved",
      md_approve: "approved",
      complete: "completed",
      sendback: "reviewed",
      reject: "rejected",
    };
    const NOTE_MAP: Record<string, string> = {
      officer_approve: note || `Approved by ${actorName}. Forwarded to MD.`,
      md_approve: note || `Final approval by MD (${actorName}). Sent to ${req.category_officer_name} for completion.`,
      complete: note || `Marked complete by ${actorName}.`,
      sendback: note,
      reject: note,
    };

    const updateData: any = { status: STATUS_MAP[act], updated_at: new Date().toISOString() };
    if (act === "reject") updateData.rejection_reason = note;
    if (act === "officer_approve") updateData.category_officer_approved_at = new Date().toISOString();
    if (act === "md_approve") updateData.md_approved_at = new Date().toISOString();

    const { error } = await (supabase as any).from("requisitions").update(updateData).eq("id", req.id);
    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }

    await (supabase as any).from("requisition_logs").insert({
      requisition_id: req.id,
      actor_id: actorId,
      actor_name: actorName,
      action: LOG_MAP[act],
      note: NOTE_MAP[act],
    });

    const toastMsg: Record<string, string> = {
      officer_approve: "Approved — forwarded to MD",
      md_approve: "Final approval granted — returned to officer",
      complete: "Requisition marked as completed",
      sendback: "Sent back to officer for review",
      reject: "Requisition rejected",
    };
    showToast(toastMsg[act]);
    setAction(null);
    setNote("");
    setSaving(false);
    onClose();
  };

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title={<span className="font-mono">{req.ref_number}</span>} onClose={onClose} />
      <ModalBody>
        {/* Stepper */}
        <div
          className="mb-5 p-4 rounded-lg"
          style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border))" }}
        >
          <div className="flex items-start relative">
            <div
              className="absolute h-0.5 top-4 left-0 right-0 mx-8"
              style={{ background: "hsl(var(--border))", zIndex: 0 }}
            />
            {STAGE_STEPS.map((step, i) => {
              const done = currentStep > i || req.status === "Completed";
              const active = currentStep === i && !["Completed", "Rejected"].includes(req.status);
              const rejected = req.status === "Rejected" && currentStep === i;
              let bg = "#f6f8fa",
                color = "#8c959f",
                border = "#d1d9e0";
              if (rejected) {
                bg = "#ffebe9";
                color = "#cf222e";
                border = "#f1a7a1";
              } else if (done && i < currentStep) {
                bg = "#dafbe1";
                color = "#1a7f37";
                border = "#aceebb";
              } else if (active) {
                bg = "#ddf4ff";
                color = "#0969da";
                border = "#0969da";
              }
              return (
                <div key={step.label} className="flex-1 flex flex-col items-center z-10">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1.5 text-[11px]"
                    style={{ background: bg, color, borderColor: border, fontWeight: 700 }}
                  >
                    {done && i < currentStep ? (
                      <i className="fas fa-check text-[10px]" />
                    ) : (
                      <i className={`${step.ico} text-[10px]`} />
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-center" style={{ color }}>
                    {step.label}
                  </div>
                  {i === 1 && req.category_officer_name && (
                    <div className="text-[9px] text-center mt-0.5" style={{ color: "hsl(var(--text3))" }}>
                      {req.category_officer_name}
                    </div>
                  )}
                  {i === 2 && req.md_name && (
                    <div className="text-[9px] text-center mt-0.5" style={{ color: "hsl(var(--text3))" }}>
                      {req.md_name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center mt-3">
            <span className="rounded-md px-3 py-1 text-[11px] font-semibold" style={sc}>
              {req.status}
            </span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-8 mb-4">
          {[
            ["Category", req.category],
            ["Department", req.department],
            ["Quantity", String(req.quantity)],
            ["Estimated Cost", `BWP ${Number(req.estimated_cost).toLocaleString()}`],
            ["Date Required", formatDate(req.date_required)],
            ["Urgency", "__urgency__"],
            ["Requestor", req.requestor_name],
            ["Officer", req.category_officer_name || "—"],
            ["MD", req.md_name || "—"],
            ["Submitted", formatDateTime(req.created_at)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-[6px] text-[12.5px]"
              style={{ borderBottom: "1px solid #f6f8fa" }}
            >
              <span style={{ color: "hsl(var(--text2))" }}>{label}</span>
              {value === "__urgency__" ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={uc}>
                  {req.urgency}
                </span>
              ) : (
                <span className="font-medium text-right">{value}</span>
              )}
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "hsl(var(--text2))" }}>
            Description
          </div>
          <div className="text-[12.5px] p-3 rounded-md" style={{ background: "hsl(var(--surface2))" }}>
            {req.description}
          </div>
        </div>
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "hsl(var(--text2))" }}>
            Justification
          </div>
          <div className="text-[12.5px] p-3 rounded-md" style={{ background: "hsl(var(--surface2))" }}>
            {req.justification}
          </div>
        </div>

        {req.attachment_url && (
          <a
            href={req.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-md text-[12px] font-semibold mb-3"
            style={{ background: "#ddf4ff", color: "#0969da", border: "1px solid #b6d5f7", textDecoration: "none" }}
          >
            <i className="fas fa-paperclip" />
            {req.attachment_name || "View Attachment"}
          </a>
        )}

        {req.rejection_reason && (
          <div className="rounded-md px-3 py-2 mb-3" style={{ background: "#ffebe9", border: "1px solid #f1a7a1" }}>
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#cf222e" }}>
              Rejection Reason
            </div>
            <div className="text-[12.5px]" style={{ color: "#cf222e" }}>
              {req.rejection_reason}
            </div>
          </div>
        )}

        {/* Action panel */}
        {canAct && !action && (
          <div className="mt-4 pt-4" style={{ borderTop: "2px solid hsl(var(--border))" }}>
            <div className="text-[11px] font-bold uppercase mb-2.5" style={{ color: "hsl(var(--text2))" }}>
              <i className="fas fa-tasks mr-1.5" />
              Your Action Required
            </div>
            <div className="flex gap-2 flex-wrap">
              {isOfficerAction && (
                <>
                  <Btn variant="danger" size="sm" onClick={() => setAction("reject")}>
                    <i className="fas fa-times mr-1" />
                    Reject
                  </Btn>
                  <Btn
                    size="sm"
                    onClick={() => setAction("officer_approve")}
                    style={{ background: "#1a7f37", borderColor: "#1a7f37", color: "#fff" }}
                  >
                    <i className="fas fa-check mr-1" />
                    Approve & Forward to MD
                  </Btn>
                </>
              )}
              {isMDAction && (
                <>
                  <Btn variant="danger" size="sm" onClick={() => setAction("reject")}>
                    <i className="fas fa-times mr-1" />
                    Reject
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => setAction("sendback")}>
                    <i className="fas fa-undo mr-1" />
                    Send Back to Officer
                  </Btn>
                  <Btn
                    size="sm"
                    onClick={() => setAction("md_approve")}
                    style={{ background: "#856404", borderColor: "#856404", color: "#fff" }}
                  >
                    <i className="fas fa-crown mr-1" />
                    Final Approve
                  </Btn>
                </>
              )}
              {isCompleteAction && (
                <Btn
                  size="sm"
                  onClick={() => setAction("complete")}
                  style={{ background: "#1a7f37", borderColor: "#1a7f37", color: "#fff" }}
                >
                  <i className="fas fa-flag-checkered mr-1" />
                  Mark as Completed
                </Btn>
              )}
            </div>
          </div>
        )}

        {/* Inline confirmation */}
        {action && (
          <div
            className="mt-4 p-4 rounded-lg"
            style={{
              background: action === "reject" ? "#fff5f5" : action === "sendback" ? "#fffdf0" : "#f0fff4",
              border: `1px solid ${action === "reject" ? "#f1a7a1" : action === "sendback" ? "#ffe07c" : "#aceebb"}`,
            }}
          >
            <div className="font-semibold text-[13px] mb-3">
              {action === "officer_approve" && (
                <>
                  <i className="fas fa-check mr-1.5" style={{ color: "#1a7f37" }} />
                  Approve & Forward to MD
                </>
              )}
              {action === "md_approve" && (
                <>
                  <i className="fas fa-crown mr-1.5" style={{ color: "#856404" }} />
                  Final MD Approval
                </>
              )}
              {action === "complete" && (
                <>
                  <i className="fas fa-flag-checkered mr-1.5" style={{ color: "#1a7f37" }} />
                  Mark as Completed
                </>
              )}
              {action === "sendback" && (
                <>
                  <i className="fas fa-undo mr-1.5" style={{ color: "#9a6700" }} />
                  Send Back to Officer
                </>
              )}
              {action === "reject" && (
                <>
                  <i className="fas fa-times mr-1.5" style={{ color: "#cf222e" }} />
                  Reject Requisition
                </>
              )}
            </div>
            {(action === "reject" || action === "sendback") && (
              <div className="mb-3">
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "hsl(var(--text2))" }}>
                  {action === "reject" ? "Rejection Reason" : "Notes for Officer"}{" "}
                  <span style={{ color: "#f85149" }}>*</span>
                </label>
                <FieldTextarea
                  value={note}
                  onChange={setNote}
                  placeholder={action === "reject" ? "Explain why this is rejected…" : "What needs to be corrected?"}
                  minHeight="70px"
                />
              </div>
            )}
            {!["reject", "sendback"].includes(action) && (
              <div className="mb-3">
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "hsl(var(--text2))" }}>
                  Notes (Optional)
                </label>
                <FieldTextarea value={note} onChange={setNote} placeholder="Any additional notes…" minHeight="60px" />
              </div>
            )}
            <div className="flex gap-2">
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  setAction(null);
                  setNote("");
                }}
              >
                Cancel
              </Btn>
              <Btn
                size="sm"
                variant={action === "reject" ? "danger" : "primary"}
                style={
                  action === "md_approve"
                    ? { background: "#856404", borderColor: "#856404", color: "#fff" }
                    : action === "complete" || action === "officer_approve"
                      ? { background: "#1a7f37", borderColor: "#1a7f37", color: "#fff" }
                      : undefined
                }
                onClick={() => doAction(action)}
                disabled={saving || ((action === "reject" || action === "sendback") && !note.trim())}
              >
                {saving
                  ? "Saving…"
                  : action === "officer_approve"
                    ? "Confirm & Forward"
                    : action === "md_approve"
                      ? "Confirm Final Approval"
                      : action === "complete"
                        ? "Confirm Completion"
                        : action === "sendback"
                          ? "Send Back"
                          : "Confirm Rejection"}
              </Btn>
            </div>
          </div>
        )}

        {/* Audit trail */}
        {logs.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div className="text-[10px] font-bold uppercase mb-2" style={{ color: "hsl(var(--text2))" }}>
              <i className="fas fa-history mr-1" />
              Activity Log
            </div>
            <div className="space-y-2.5">
              {logs.map((log: any) => {
                const ac: Record<string, { bg: string; color: string }> = {
                  submitted: { bg: "#ddf4ff", color: "#0969da" },
                  approved: { bg: "#dafbe1", color: "#1a7f37" },
                  reviewed: { bg: "#fff8c5", color: "#9a6700" },
                  rejected: { bg: "#ffebe9", color: "#cf222e" },
                  completed: { bg: "#dafbe1", color: "#1a7f37" },
                };
                const c = ac[log.action] || { bg: "#f6f8fa", color: "#656d76" };
                return (
                  <div key={log.id} className="flex gap-3 items-start">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                      style={c}
                    >
                      {log.actor_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-semibold">{log.actor_name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={c}>
                          {cap(log.action)}
                        </span>
                      </div>
                      {log.note && (
                        <div className="text-[11px] mt-0.5" style={{ color: "hsl(var(--text2))" }}>
                          {log.note}
                        </div>
                      )}
                      <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--text3))" }}>
                        {formatDateTime(log.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Close
        </Btn>
      </ModalFoot>
    </Modal>
  );
}
