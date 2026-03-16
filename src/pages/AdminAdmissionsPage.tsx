import React from "react";
import { useAdmissionEnquiries, useInvalidate } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";

export default function AdminAdmissionsPage() {
  const { data: enquiries = [], isLoading } = useAdmissionEnquiries();
  const invalidate = useInvalidate();

  const updateStatus = async (id: string, status: string) => {
    await (supabase as any).from("admission_enquiries").update({ status }).eq("id", id);
    invalidate(["admission_enquiries"]);
  };

  if (isLoading) {
    return <div style={{ color: "#8b949e" }}>Loading enquiries…</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4" style={{ color: "#e6edf3" }}>
        Admission Enquiries
      </h1>
      {enquiries.length === 0 ? (
        <p style={{ color: "#8b949e" }}>No enquiries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #30363d" }}>
          <table className="w-full text-sm" style={{ color: "#e6edf3" }}>
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Student", "Form", "Parent", "Phone", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: "#8b949e" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e: any) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #21262d" }}>
                  <td className="px-3 py-2">{e.student_name}</td>
                  <td className="px-3 py-2">{e.form_applying}</td>
                  <td className="px-3 py-2">{e.parent_name}</td>
                  <td className="px-3 py-2">{e.parent_phone || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background:
                          e.status === "approved"
                            ? "#1a3a2a"
                            : e.status === "rejected"
                            ? "#3d1a1a"
                            : e.status === "enrolled"
                            ? "#0d3a5c"
                            : "#2d2a1a",
                        color:
                          e.status === "approved"
                            ? "#3fb950"
                            : e.status === "rejected"
                            ? "#ff7b72"
                            : e.status === "enrolled"
                            ? "#58a6ff"
                            : "#d29922",
                      }}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#8b949e" }}>
                    {e.created_at ? new Date(e.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    {e.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(e.id, "approved")}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ background: "#238636", color: "#fff" }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(e.id, "rejected")}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ background: "#cf222e", color: "#fff" }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
