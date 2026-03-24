import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
  useProfiles,
  useUserRoles,
  useTeachers,
  useStudents,
  useParents,
  useDepartments,
  useInvalidate,
} from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { FORMS, cap } from "@/data/database";
import { downloadExcel, downloadCSV, parseExcel, triggerFileUpload } from "@/lib/excel";
import {
  Card,
  Badge,
  Btn,
  SearchBar,
  Modal,
  ModalHead,
  ModalBody,
  ModalFoot,
  FormSection,
  Field,
  FieldInput,
  FieldSelect,
} from "@/components/SharedUI";

// Departments loaded from DB via useDepartments hook

type RoleFilter = "all" | "admin" | "teacher" | "student" | "parent" | "no-account";

interface UnifiedUser {
  id: string;
  name: string;
  email: string | null;
  roles: string[];
  hasAccount: boolean;
  mustChangePassword: boolean;
  userId: string | null;
  profileId: string | null;
  source: ("profile" | "teacher" | "student" | "parent")[];
  createdAt: string | null;
  form?: string | null;
  department?: string | null;
  linkTable?: string;
  linkId?: string;
}

export default function UserManagementPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useApp();
  const { data: profiles = [], isLoading: pLoading } = useProfiles();
  const { data: userRoles = [] } = useUserRoles();
  const { data: teachers = [], isLoading: tLoading } = useTeachers();
  const { data: students = [], isLoading: sLoading } = useStudents();
  const { data: parents = [], isLoading: prLoading } = useParents();
  const invalidate = useInvalidate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [modal, setModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [resetModal, setResetModal] = useState<any>(null);
  const [editModal, setEditModal] = useState<UnifiedUser | null>(null);
  const [deleteModal, setDeleteModal] = useState<UnifiedUser | null>(null);
  const [newUsers, setNewUsers] = useState<{ email: string; password: string; name: string; role: string }[]>([]);

  const isLoading = pLoading || tLoading || sLoading || prLoading;
  const getRoles = (userId: string) => userRoles.filter((r: any) => r.user_id === userId).map((r: any) => r.role);

  const unifiedUsers = useMemo(() => {
    const userMap = new Map<string, UnifiedUser>();

    profiles.forEach((p: any) => {
      const key = p.user_id;
      userMap.set(key, {
        id: key,
        name: p.full_name,
        email: p.email,
        roles: getRoles(p.user_id),
        hasAccount: true,
        mustChangePassword: p.must_change_password ?? false,
        userId: p.user_id,
        profileId: p.id,
        source: ["profile"],
        createdAt: p.created_at,
      });
    });

    teachers.forEach((t: any) => {
      if (t.user_id) {
        if (userMap.has(t.user_id)) {
          const e = userMap.get(t.user_id)!;
          e.source.push("teacher");
          e.department = t.department;
          e.linkTable = "teachers";
          e.linkId = t.id;
        } else {
          userMap.set(t.user_id, {
            id: t.user_id,
            name: t.name,
            email: t.email,
            roles: getRoles(t.user_id),
            hasAccount: true,
            mustChangePassword: false,
            userId: t.user_id,
            profileId: null,
            source: ["teacher"],
            createdAt: t.created_at,
            department: t.department,
            linkTable: "teachers",
            linkId: t.id,
          });
        }
      } else {
        userMap.set(`teacher-${t.id}`, {
          id: `teacher-${t.id}`,
          name: t.name,
          email: t.email,
          roles: ["teacher"],
          hasAccount: false,
          mustChangePassword: false,
          userId: null,
          profileId: null,
          source: ["teacher"],
          createdAt: t.created_at,
          department: t.department,
          linkTable: "teachers",
          linkId: t.id,
        });
      }
    });

    students.forEach((s: any) => {
      if (s.user_id) {
        // Student has a linked auth account
        if (userMap.has(s.user_id)) {
          // Profile already loaded — merge into it
          const e = userMap.get(s.user_id)!;
          e.source.push("student");
          e.form = s.form;
          if (!e.linkTable) {
            e.linkTable = "students";
            e.linkId = s.id;
          }
        } else {
          // Profile not yet loaded (race condition after account creation)
          // Key by user_id so it won't duplicate once profiles reload
          userMap.set(s.user_id, {
            id: s.user_id,
            name: s.full_name,
            email: s.email,
            roles: getRoles(s.user_id),
            hasAccount: true,
            mustChangePassword: false,
            userId: s.user_id,
            profileId: null,
            source: ["student"],
            createdAt: s.created_at,
            form: s.form,
            linkTable: "students",
            linkId: s.id,
          });
        }
      } else {
        // No account — show as unlinked entry
        userMap.set(`student-${s.id}`, {
          id: `student-${s.id}`,
          name: s.full_name,
          email: s.email,
          roles: ["student"],
          hasAccount: false,
          mustChangePassword: false,
          userId: null,
          profileId: null,
          source: ["student"],
          createdAt: s.created_at,
          form: s.form,
          linkTable: "students",
          linkId: s.id,
        });
      }
    });

    parents.forEach((pr: any) => {
      if (pr.user_id) {
        if (userMap.has(pr.user_id)) {
          const e = userMap.get(pr.user_id)!;
          e.source.push("parent");
          if (!e.linkTable) {
            e.linkTable = "parents";
            e.linkId = pr.id;
          }
        } else {
          userMap.set(pr.user_id, {
            id: pr.user_id,
            name: pr.name,
            email: pr.email,
            roles: getRoles(pr.user_id),
            hasAccount: true,
            mustChangePassword: false,
            userId: pr.user_id,
            profileId: null,
            source: ["parent"],
            createdAt: pr.created_at,
            linkTable: "parents",
            linkId: pr.id,
          });
        }
      } else {
        userMap.set(`parent-${pr.id}`, {
          id: `parent-${pr.id}`,
          name: pr.name,
          email: pr.email,
          roles: ["parent"],
          hasAccount: false,
          mustChangePassword: false,
          userId: null,
          profileId: null,
          source: ["parent"],
          createdAt: pr.created_at,
          linkTable: "parents",
          linkId: pr.id,
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, teachers, students, parents, userRoles]);

  const rows = useMemo(() => {
    return unifiedUsers.filter((u) => {
      if (search) {
        const s = search.toLowerCase();
        if (!u.name?.toLowerCase().includes(s) && !u.email?.toLowerCase().includes(s)) return false;
      }
      if (roleFilter === "no-account") return !u.hasAccount;
      if (roleFilter !== "all") return u.roles.includes(roleFilter) || u.source.includes(roleFilter as any);
      return true;
    });
  }, [unifiedUsers, search, roleFilter]);

  const counts = useMemo(
    () => ({
      all: unifiedUsers.length,
      teacher: unifiedUsers.filter((u) => u.roles.includes("teacher") || u.source.includes("teacher")).length,
      student: unifiedUsers.filter((u) => u.roles.includes("student") || u.source.includes("student")).length,
      parent: unifiedUsers.filter((u) => u.roles.includes("parent") || u.source.includes("parent")).length,
      admin: unifiedUsers.filter((u) => u.roles.includes("admin")).length,
      noAccount: unifiedUsers.filter((u) => !u.hasAccount).length,
    }),
    [unifiedUsers],
  );

  const usersWithoutAccounts = useMemo(() => unifiedUsers.filter((u) => !u.hasAccount && u.email), [unifiedUsers]);

  const downloadCredentials = () => {
    if (newUsers.length === 0) {
      showToast("No new credentials to download", "info");
      return;
    }
    downloadCSV(
      newUsers.map((u) => ({ Name: u.name, Email: u.email, Password: u.password, Role: u.role })),
      "lkc_user_credentials",
    );
    showToast("Credentials downloaded");
  };

  const downloadAllUsers = () => {
    const data = unifiedUsers.map((u) => ({
      Name: u.name,
      Email: u.email || "",
      Roles: u.roles.join(", "),
      "Has Account": u.hasAccount ? "Yes" : "No",
      "Must Change Password": u.mustChangePassword ? "Yes" : "No",
      "Created At": u.createdAt?.split("T")[0] || "",
    }));
    downloadExcel(data, "lkc_all_users", "Users");
    showToast("Users exported");
  };

  // ── Delete user handler ──
  const handleDelete = async (u: UnifiedUser) => {
    if (u.hasAccount && u.userId) {
      // Delete from auth (cascades to profiles and user_roles via FK)
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "delete_user", user_id: u.userId },
      });
      if (error || data?.error) {
        showToast(data?.error || error?.message || "Failed to delete user", "error");
        return;
      }
      // Un-link source tables
      if (u.linkTable && u.linkId) {
        await (supabase as any).from(u.linkTable).update({ user_id: null }).eq("id", u.linkId);
      }
    } else if (u.linkTable && u.linkId) {
      // No auth account — delete the person record itself
      await (supabase as any).from(u.linkTable).delete().eq("id", u.linkId);
    }
    showToast(`${u.name} deleted`);
    setDeleteModal(null);
    invalidate(["profiles", "user_roles", "teachers", "students", "parents"]);
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

  const filterTabs: { key: RoleFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "teacher", label: "Teachers", count: counts.teacher },
    { key: "student", label: "Students", count: counts.student },
    { key: "parent", label: "Parents", count: counts.parent },
    { key: "admin", label: "Admins", count: counts.admin },
    { key: "no-account", label: "No Account", count: counts.noAccount },
  ];

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-user-cog mr-2" />
            User Management
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {counts.all} total
            {counts.noAccount > 0 && (
              <>
                {" "}
                · <span style={{ color: "#cf222e" }}>{counts.noAccount} without accounts</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="outline" onClick={downloadAllUsers}>
            <i className="fas fa-download mr-1" />
            Export
          </Btn>
          <Btn variant="outline" onClick={() => setImportModal(true)}>
            <i className="fas fa-file-import mr-1" />
            Import
          </Btn>
          {counts.noAccount > 0 && (
            <Btn variant="purple" onClick={() => setBulkModal(true)}>
              <i className="fas fa-users-cog mr-1" />
              Create All Accounts ({usersWithoutAccounts.length})
            </Btn>
          )}
          {newUsers.length > 0 && (
            <Btn variant="purple" onClick={downloadCredentials}>
              <i className="fas fa-key mr-1" />
              Credentials ({newUsers.length})
            </Btn>
          )}
          <Btn onClick={() => setModal(true)}>
            <i className="fas fa-plus mr-1" />
            Create User
          </Btn>
        </div>
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setRoleFilter(t.key)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer border-none transition-all"
            style={{
              background: roleFilter === t.key ? "hsl(var(--primary))" : "hsl(var(--surface2))",
              color: roleFilter === t.key ? "#fff" : "hsl(var(--text2))",
            }}
          >
            {t.label} <span className="ml-1 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search users..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                {["Name", "Email", "Roles", "Account", "Details", "Actions"].map((h) => (
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
              {rows.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <td className="py-2.5 px-3.5 font-semibold">{u.name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">
                    {u.email || <span style={{ color: "hsl(var(--text3))" }}>—</span>}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length > 0 ? (
                        u.roles.map((r: string) => (
                          <span
                            key={r}
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border))" }}
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px]" style={{ color: "hsl(var(--text3))" }}>
                          No roles
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    {u.hasAccount ? (
                      <Badge status={u.mustChangePassword ? "pending" : "done"} />
                    ) : (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: "#ffebe9", color: "#cf222e", border: "1px solid #ffcecb" }}
                      >
                        No Account
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                    {u.form && <span className="mr-2">Form {u.form}</span>}
                    {u.department && <span>{u.department}</span>}
                    {!u.form && !u.department && <span>{u.createdAt?.split("T")[0] || "—"}</span>}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {/* Edit button — always shown */}
                      <Btn variant="outline" size="sm" onClick={() => setEditModal(u)}>
                        <i className="fas fa-edit mr-1" />
                        Edit
                      </Btn>
                      {u.hasAccount ? (
                        <Btn
                          variant="outline"
                          size="sm"
                          onClick={() => setResetModal({ full_name: u.name, email: u.email, user_id: u.userId })}
                        >
                          <i className="fas fa-key mr-1" />
                          Reset PW
                        </Btn>
                      ) : (
                        <Btn
                          size="sm"
                          onClick={async () => {
                            if (!u.email) {
                              showToast("No email set for this user", "error");
                              return;
                            }
                            const password =
                              (u.name.split(" ")[0]?.toLowerCase() || "user") + Math.floor(1000 + Math.random() * 9000);
                            const { data, error } = await supabase.functions.invoke("create-user", {
                              body: {
                                email: u.email,
                                password,
                                full_name: u.name,
                                role: u.roles[0] || "student",
                                link_table: u.linkTable,
                                link_id: u.linkId,
                              },
                            });
                            if (error || data?.error) {
                              showToast(data?.error || error?.message || "Failed", "error");
                              return;
                            }
                            showToast(`Account created for ${u.name}`);
                            setNewUsers((prev) => [
                              ...prev,
                              { email: u.email!, password, name: u.name, role: u.roles[0] || "student" },
                            ]);
                            invalidate(["profiles", "user_roles", "teachers", "students", "parents"]);
                          }}
                        >
                          <i className="fas fa-user-plus mr-1" />
                          Create
                        </Btn>
                      )}
                      {/* Delete button */}
                      <Btn variant="danger" size="sm" onClick={() => setDeleteModal(u)}>
                        <i className="fas fa-trash" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[12px]" style={{ color: "hsl(var(--text3))" }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <CreateUserModal
          onClose={(created) => {
            setModal(false);
            if (created) {
              setNewUsers((prev) => [...prev, created]);
              invalidate(["profiles", "user_roles", "teachers", "students", "parents"]);
            }
          }}
        />
      )}
      {importModal && (
        <ImportUsersModal
          onClose={(imported) => {
            setImportModal(false);
            if (imported) {
              setNewUsers((prev) => [...prev, ...imported]);
              invalidate(["profiles", "user_roles", "teachers", "students", "parents"]);
            }
          }}
        />
      )}
      {bulkModal && (
        <BulkCreateModal
          users={usersWithoutAccounts}
          onClose={(created) => {
            setBulkModal(false);
            if (created) {
              setNewUsers((prev) => [...prev, ...created]);
              invalidate(["profiles", "user_roles", "teachers", "students", "parents"]);
            }
          }}
        />
      )}
      {resetModal && (
        <ResetPasswordModal
          profile={resetModal}
          onClose={() => {
            setResetModal(null);
            invalidate(["profiles"]);
          }}
        />
      )}
      {editModal && (
        <EditUserModal
          user={editModal}
          onClose={() => {
            setEditModal(null);
            invalidate(["profiles", "user_roles", "teachers", "students", "parents"]);
          }}
        />
      )}
      {deleteModal && (
        <DeleteUserModal
          user={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={() => handleDelete(deleteModal)}
        />
      )}
    </div>
  );
}

/* ── Edit User Modal ── */
function EditUserModal({ user, onClose }: { user: UnifiedUser; onClose: () => void }) {
  const { showToast } = useApp();
  const { data: departmentsData = [] } = useDepartments();
  const DEPARTMENTS = departmentsData.map((d: any) => d.name);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || "");
  const [dept, setDept] = useState(user.department || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);

    // Update profile if user has an account
    if (user.userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name, email: email || null })
        .eq("user_id", user.userId);
      if (error) {
        showToast(error.message, "error");
        setSaving(false);
        return;
      }
    }

    // Update source record
    if (user.linkTable && user.linkId) {
      const nameField = user.linkTable === "students" ? "full_name" : "name";
      const updates: any = { [nameField]: name, email: email || null };
      if (user.linkTable === "teachers") updates.department = dept || null;
      await (supabase as any).from(user.linkTable).update(updates).eq("id", user.linkId);
    }

    showToast(`${name} updated`);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="Edit User" onClose={onClose} />
      <ModalBody>
        <Field label="Full Name" required>
          <FieldInput value={name} onChange={setName} />
        </Field>
        <Field label="Email">
          <FieldInput value={email} onChange={setEmail} type="email" />
        </Field>
        {(user.source.includes("teacher") || user.roles.includes("teacher")) && (
          <Field label="Department">
            <select
              className="w-full border rounded-md py-[7px] px-3 text-[12.5px]"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface))" }}
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="">— Select Department —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div
          className="rounded-md px-3 py-2 text-[11px]"
          style={{ background: "#ddf4ff", border: "1px solid #addcff", color: "#0969da" }}
        >
          <i className="fas fa-info-circle mr-1" />
          Changes update both the login profile and the linked people record.
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

/* ── Delete User Confirmation Modal ── */
function DeleteUserModal({
  user,
  onClose,
  onConfirm,
}: {
  user: UnifiedUser;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHead title="Delete User" onClose={onClose} />
      <ModalBody>
        <div className="text-[12.5px] mb-3">
          Are you sure you want to delete <strong>{user.name}</strong>?
        </div>
        {user.hasAccount && (
          <div
            className="rounded-md px-3 py-2 text-[11px] mb-2"
            style={{ background: "#ffebe9", border: "1px solid #ffcecb", color: "#cf222e" }}
          >
            <i className="fas fa-exclamation-triangle mr-1" />
            This will <strong>delete their login account</strong>. They will no longer be able to sign in. The
            underlying {user.source.filter((s) => s !== "profile").join("/") || "person"} record will be kept but
            unlinked.
          </div>
        )}
        {!user.hasAccount && (
          <div
            className="rounded-md px-3 py-2 text-[11px]"
            style={{ background: "#fff8c5", border: "1px solid #ffe07c", color: "#9a6700" }}
          >
            <i className="fas fa-info-circle mr-1" />
            This person has no system account. Their {user.linkTable} record will be permanently deleted.
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn
          variant="danger"
          disabled={confirming}
          onClick={() => {
            setConfirming(true);
            onConfirm();
          }}
        >
          {confirming ? "Deleting…" : "Delete"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

/* ── Bulk Create Accounts Modal ── */
function BulkCreateModal({
  users,
  onClose,
}: {
  users: UnifiedUser[];
  onClose: (created?: { email: string; password: string; name: string; role: string }[]) => void;
}) {
  const { showToast } = useApp();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [results, setResults] = useState<any[] | null>(null);

  const run = async () => {
    setProcessing(true);
    const total = users.length;
    setProgress({ done: 0, total, failed: 0 });
    const batchSize = 10;
    const allResults: any[] = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize).map((u) => ({
        email: u.email,
        full_name: u.name,
        role: u.roles[0] || "student",
        link_table: u.linkTable,
        link_id: u.linkId,
      }));
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "bulk_create", users: batch },
      });
      if (error) {
        batch.forEach((b) => allResults.push({ ...b, success: false, error: error.message }));
      } else if (data?.results) {
        allResults.push(...data.results);
      }
      const s = allResults.filter((r) => r.success).length;
      const f = allResults.filter((r) => !r.success).length;
      setProgress({ done: s + f, total, failed: f });
    }

    setResults(allResults);
    setProcessing(false);
    const created = allResults.filter((r) => r.success);
    showToast(`${created.length}/${total} accounts created`);
  };

  return (
    <Modal onClose={() => onClose()} size="lg">
      <ModalHead title="Bulk Create Accounts" onClose={() => onClose()} />
      <ModalBody>
        {!results ? (
          <>
            <div className="text-xs mb-3" style={{ color: "hsl(var(--text2))" }}>
              Create accounts for <strong>{users.length}</strong> people without system accounts.
            </div>
            <div
              className="rounded-md px-3 py-2 text-[11px] mb-3"
              style={{ background: "#fff8c5", border: "1px solid #ffe07c", color: "#9a6700" }}
            >
              ⚠ Only users with email addresses will get accounts.
            </div>
            <div
              className="max-h-[200px] overflow-y-auto rounded border text-[11px]"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {users.map((u, i) => (
                <div
                  key={i}
                  className="flex justify-between px-3 py-1.5"
                  style={{ borderBottom: "1px solid hsl(var(--border))" }}
                >
                  <span className="font-semibold">{u.name}</span>
                  <span style={{ color: "hsl(var(--text2))" }}>
                    {u.email || <span style={{ color: "#cf222e" }}>No email</span>} · {u.roles[0]}
                  </span>
                </div>
              ))}
            </div>
            {processing && (
              <div className="mt-3">
                <div className="text-[11px] mb-1" style={{ color: "hsl(var(--text2))" }}>
                  Processing {progress.done}/{progress.total}...
                </div>
                <div className="w-full rounded-full h-2" style={{ background: "hsl(var(--surface2))" }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%`, background: "hsl(var(--primary))" }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs mb-2" style={{ color: "hsl(var(--text2))" }}>
              ✅ {results.filter((r) => r.success).length} created · ❌ {results.filter((r) => !r.success).length}{" "}
              failed
            </div>
            <div
              className="max-h-[300px] overflow-y-auto rounded border text-[11px]"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between px-3 py-1.5"
                  style={{
                    borderBottom: "1px solid hsl(var(--border))",
                    background: r.success ? undefined : "#ffebe9",
                  }}
                >
                  <span className="font-semibold">{r.name}</span>
                  <span>
                    {r.success ? (
                      <span style={{ color: "#1a7f37" }}>✓ {r.email}</span>
                    ) : (
                      <span style={{ color: "#cf222e" }}>✕ {r.error}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFoot>
        {!results ? (
          <>
            <Btn variant="outline" onClick={() => onClose()}>
              Cancel
            </Btn>
            <Btn onClick={run} disabled={processing}>
              {processing ? "Creating…" : `Create ${users.length} Accounts`}
            </Btn>
          </>
        ) : (
          <>
            <Btn
              variant="outline"
              onClick={() => {
                const created = results.filter((r) => r.success);
                if (created.length > 0)
                  downloadCSV(
                    created.map((r) => ({ Name: r.name, Email: r.email, Password: r.password, Role: r.role })),
                    "bulk_credentials",
                  );
              }}
            >
              <i className="fas fa-download mr-1" />
              Download Credentials
            </Btn>
            <Btn
              onClick={() =>
                onClose(
                  results
                    .filter((r) => r.success)
                    .map((r) => ({ email: r.email, password: r.password, name: r.name, role: r.role })),
                )
              }
            >
              Done
            </Btn>
          </>
        )}
      </ModalFoot>
    </Modal>
  );
}

/* ── Import Users Modal ── */
function ImportUsersModal({
  onClose,
}: {
  onClose: (imported?: { email: string; password: string; name: string; role: string }[]) => void;
}) {
  const { showToast } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<any[] | null>(null);

  const handleUpload = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      const normalized = data
        .map((row) => {
          const r: any = {};
          Object.keys(row).forEach((k) => {
            const lower = k.toLowerCase().trim();
            if (["name", "full name", "full_name", "fullname"].includes(lower)) r.name = row[k];
            else if (["email", "e-mail"].includes(lower)) r.email = row[k];
            else if (["role", "type"].includes(lower)) r.role = row[k]?.toLowerCase();
          });
          return r;
        })
        .filter((r) => r.name && r.email);
      if (normalized.length === 0) {
        showToast("No valid rows found. Ensure columns: Name, Email, Role", "error");
        return;
      }
      setRows(normalized);
    } catch (err: any) {
      showToast("Failed to parse file: " + err.message, "error");
    }
  };

  const run = async () => {
    setProcessing(true);
    const total = rows.length;
    setProgress({ done: 0, total });
    const batch = rows.map((r) => ({ email: r.email, full_name: r.name, role: r.role || "teacher" }));
    const batchSize = 10;
    const allResults: any[] = [];
    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize);
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "bulk_create", users: chunk },
      });
      if (error) {
        chunk.forEach((c) => allResults.push({ ...c, name: c.full_name, success: false, error: error.message }));
      } else if (data?.results) {
        allResults.push(...data.results);
      }
      setProgress({ done: Math.min(i + batchSize, total), total });
    }
    setResults(allResults);
    setProcessing(false);
    showToast(`${allResults.filter((r) => r.success).length}/${total} users imported`);
  };

  const downloadTemplate = () =>
    downloadExcel(
      [
        { Name: "John Doe", Email: "john@school.com", Role: "teacher" },
        { Name: "Jane Smith", Email: "jane@school.com", Role: "student" },
      ],
      "user_import_template",
      "Template",
    );

  return (
    <Modal onClose={() => onClose()} size="lg">
      <ModalHead title="Import Users" onClose={() => onClose()} />
      <ModalBody>
        {!results ? (
          <>
            <div className="text-xs mb-3" style={{ color: "hsl(var(--text2))" }}>
              Upload an Excel/CSV file with columns: <strong>Name</strong>, <strong>Email</strong>,{" "}
              <strong>Role</strong>.
            </div>
            <div className="flex gap-2 mb-3">
              <Btn variant="outline" onClick={downloadTemplate}>
                <i className="fas fa-file-download mr-1" />
                Download Template
              </Btn>
              <Btn onClick={handleUpload}>
                <i className="fas fa-upload mr-1" />
                Upload File
              </Btn>
            </div>
            {rows.length > 0 && (
              <>
                <div className="text-xs mb-2 font-semibold">{rows.length} users ready to import:</div>
                <div
                  className="max-h-[200px] overflow-y-auto rounded border text-[11px]"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "hsl(var(--surface2))" }}>
                        <th className="px-3 py-1.5 text-left">Name</th>
                        <th className="px-3 py-1.5 text-left">Email</th>
                        <th className="px-3 py-1.5 text-left">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                          <td className="px-3 py-1.5">{r.name}</td>
                          <td className="px-3 py-1.5">{r.email}</td>
                          <td className="px-3 py-1.5">{r.role || "teacher"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {processing && (
              <div className="mt-3">
                <div className="text-[11px] mb-1" style={{ color: "hsl(var(--text2))" }}>
                  Processing {progress.done}/{progress.total}...
                </div>
                <div className="w-full rounded-full h-2" style={{ background: "hsl(var(--surface2))" }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%`, background: "hsl(var(--primary))" }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs mb-2" style={{ color: "hsl(var(--text2))" }}>
              ✅ {results.filter((r) => r.success).length} imported · ❌ {results.filter((r) => !r.success).length}{" "}
              failed
            </div>
            <div
              className="max-h-[300px] overflow-y-auto rounded border text-[11px]"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between px-3 py-1.5"
                  style={{
                    borderBottom: "1px solid hsl(var(--border))",
                    background: r.success ? undefined : "#ffebe9",
                  }}
                >
                  <span className="font-semibold">{r.name}</span>
                  <span>
                    {r.success ? (
                      <span style={{ color: "#1a7f37" }}>✓</span>
                    ) : (
                      <span style={{ color: "#cf222e" }}>✕ {r.error}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFoot>
        {!results ? (
          <>
            <Btn variant="outline" onClick={() => onClose()}>
              Cancel
            </Btn>
            {rows.length > 0 && (
              <Btn onClick={run} disabled={processing}>
                {processing ? "Importing…" : `Import ${rows.length} Users`}
              </Btn>
            )}
          </>
        ) : (
          <>
            <Btn
              variant="outline"
              onClick={() => {
                const c = results.filter((r) => r.success);
                if (c.length > 0)
                  downloadCSV(
                    c.map((r) => ({ Name: r.name, Email: r.email, Password: r.password, Role: r.role })),
                    "imported_credentials",
                  );
              }}
            >
              <i className="fas fa-download mr-1" />
              Download Credentials
            </Btn>
            <Btn
              onClick={() =>
                onClose(
                  results
                    .filter((r) => r.success)
                    .map((r) => ({ email: r.email, password: r.password, name: r.name, role: r.role })),
                )
              }
            >
              Done
            </Btn>
          </>
        )}
      </ModalFoot>
    </Modal>
  );
}

/* ── Reset Password Modal ── */
function ResetPasswordModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const { showToast } = useApp();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const pw =
      newPassword ||
      (profile.full_name?.split(" ")[0]?.toLowerCase() || "user") + Math.floor(1000 + Math.random() * 9000);
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { action: "reset_password", user_id: profile.user_id, new_password: pw },
    });
    if (error || data?.error) {
      showToast(data?.error || error?.message || "Failed", "error");
      setSaving(false);
      return;
    }
    showToast(`Password reset for ${profile.full_name}. New password: ${pw}`);
    onClose();
  };

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHead title="Reset Password" onClose={onClose} />
      <ModalBody>
        <div className="text-xs mb-3" style={{ color: "hsl(var(--text2))" }}>
          Reset password for <strong>{profile.full_name}</strong> ({profile.email})
        </div>
        <Field label="New Password (leave blank for auto-generated)">
          <FieldInput value={newPassword} onChange={setNewPassword} type="text" placeholder="Auto-generate" />
        </Field>
        <div
          className="rounded-md px-3 py-2 text-[11px]"
          style={{ background: "#fff8c5", border: "1px solid #ffe07c", color: "#9a6700" }}
        >
          ⚠ User will be required to change password on next login.
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Resetting…" : "Reset Password"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

/* ── Create Single User Modal ── */
function CreateUserModal({
  onClose,
}: {
  onClose: (created?: { email: string; password: string; name: string; role: string }) => void;
}) {
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const { data: departmentsData = [] } = useDepartments();
  const DEPARTMENTS = departmentsData.map((d: any) => d.name);
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: parents = [] } = useParents();

  // ── Core account fields ──
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [linkMode, setLinkMode] = useState<"new" | "existing">("new");
  const [linkId, setLinkId] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Teacher fields ──
  const [dept, setDept] = useState("");

  // ── Student fields ──
  const [sForm, setSForm] = useState("Form 1");
  const [sGender, setSGender] = useState("male");
  const [sDob, setSdob] = useState("");
  const [sNationality, setSNationality] = useState("");
  const [sEnrollment, setSEnrollment] = useState("");
  const [sClass, setSClass] = useState("");
  const [sAdmissionDate, setSAdmissionDate] = useState("");
  const [sAcademicYear, setSAcademicYear] = useState("");
  const [sPreviousSchool, setSPreviousSchool] = useState("");
  const [sBloodGroup, setSBloodGroup] = useState("");
  const [sMedical, setSMedical] = useState("");
  const [sNationalId, setSNationalId] = useState("");
  const [sPassport, setSPassport] = useState("");
  // parent to link to student
  const [sParentId, setSParentId] = useState("");

  // ── Parent fields ──
  const [pRelation, setPRelation] = useState("guardian");
  const [pPhone, setPPhone] = useState("");
  const [pAltPhone, setPAltPhone] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pOccupation, setPOccupation] = useState("");
  const [pNationalId, setPNationalId] = useState("");
  const [pPassport, setPPassport] = useState("");
  // student to link to parent
  const [pStudentId, setPStudentId] = useState("");

  const linkableRecords = useMemo(() => {
    const table = role === "teacher" ? teachers : role === "student" ? students : parents;
    return (table as any[]).filter((r: any) => !r.user_id);
  }, [role, teachers, students, parents]);

  const handleRoleChange = (v: string) => {
    setRole(v);
    setLinkId("");
    setLinkMode("new");
    if (v !== "teacher") setDept("");
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const password = (name.split(" ")[0]?.toLowerCase() || "user") + Math.floor(1000 + Math.random() * 9000);

    let finalLinkTable: string | undefined;
    let finalLinkId: string | undefined;

    if (linkMode === "existing" && linkId) {
      finalLinkTable = role === "teacher" ? "teachers" : role === "student" ? "students" : "parents";
      finalLinkId = linkId;
    }

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email, password, full_name: name, role, link_table: finalLinkTable, link_id: finalLinkId },
    });
    if (error || data?.error) {
      showToast(data?.error || error?.message || "Failed to create user", "error");
      setSaving(false);
      return;
    }

    const userId = data?.user_id;

    if (linkMode === "new" && userId) {
      if (role === "teacher") {
        await (supabase as any)
          .from("teachers")
          .insert({ name: name.trim(), email: email.trim(), department: dept || null, user_id: userId });

      } else if (role === "student") {
        const { data: newStudent } = await (supabase as any)
          .from("students")
          .insert({
            full_name: name.trim(),
            email: email.trim(),
            form: sForm,
            gender: sGender,
            date_of_birth: sDob || null,
            nationality: sNationality || null,
            enrollment_number: sEnrollment || null,
            class_name: sClass || null,
            admission_date: sAdmissionDate || null,
            academic_year: sAcademicYear || null,
            previous_school: sPreviousSchool || null,
            blood_group: sBloodGroup || null,
            medical_condition: sMedical || null,
            national_id: sNationalId || null,
            passport_number: sPassport || null,
            state: "active",
            user_id: userId,
          })
          .select("id")
          .single();
        if (newStudent && sParentId) {
          await supabase.from("parent_students").insert({ parent_id: sParentId, student_id: newStudent.id });
        }

      } else if (role === "parent") {
        const { data: newParent } = await (supabase as any)
          .from("parents")
          .insert({
            name: name.trim(),
            email: email.trim(),
            relation: pRelation,
            phone: pPhone || null,
            alternative_phone: pAltPhone || null,
            address: pAddress || null,
            occupation: pOccupation || null,
            national_id: pNationalId || null,
            passport_number: pPassport || null,
            user_id: userId,
          })
          .select("id")
          .single();
        if (newParent && pStudentId) {
          await supabase.from("parent_students").insert({ parent_id: newParent.id, student_id: pStudentId });
        }
      }
    }

    invalidate(["students", "parents", "parent_students", "teachers"]);
    showToast(`User "${name}" created with password: ${password}`);
    onClose({ email, password, name, role });
  };

  const linkToggle = (
    <div className="flex gap-2 mb-2">
      {(["new", "existing"] as const).map((m) => (
        <button
          key={m}
          onClick={() => { setLinkMode(m); setLinkId(""); }}
          className="px-3 py-1.5 rounded text-[11px] font-semibold border cursor-pointer"
          style={{
            background: linkMode === m ? "hsl(var(--primary))" : "hsl(var(--surface2))",
            color: linkMode === m ? "#fff" : "hsl(var(--text2))",
            borderColor: "hsl(var(--border))",
          }}
        >
          {m === "new" ? "Create new record" : "Link to existing"}
        </button>
      ))}
    </div>
  );

  return (
    <Modal onClose={() => onClose()}>
      <ModalHead title="Create User Account" onClose={() => onClose()} />
      <ModalBody>
        {/* ── Account ── */}
        <FormSection title="Account" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" required>
            <FieldInput value={name} onChange={setName} />
          </Field>
          <Field label="Email" required>
            <FieldInput value={email} onChange={setEmail} type="email" />
          </Field>
        </div>
        <Field label="Role" required>
          <FieldSelect value={role} onChange={handleRoleChange}
            options={[
              { value: "admin", label: "Admin" },
              { value: "teacher", label: "Teacher" },
              { value: "student", label: "Student" },
              { value: "parent", label: "Parent" },
            ]}
          />
        </Field>

        {/* ── Link toggle (non-admin) ── */}
        {["teacher", "student", "parent"].includes(role) && linkableRecords.length > 0 && (
          <Field label={`Link to existing ${role} record?`}>
            {linkToggle}
            {linkMode === "existing" && (
              <FieldSelect
                value={linkId}
                onChange={setLinkId}
                options={[
                  { value: "", label: `— Select existing ${role} —` },
                  ...linkableRecords.map((r: any) => ({
                    value: r.id,
                    label: `${r.full_name || r.name}${r.email ? ` (${r.email})` : ""}`,
                  })),
                ]}
              />
            )}
          </Field>
        )}

        {/* ── Teacher fields (new record) ── */}
        {role === "teacher" && linkMode === "new" && (
          <>
            <FormSection title="Teacher Details" />
            <Field label="Department">
              <FieldSelect value={dept} onChange={setDept}
                options={[{ value: "", label: "— Select Department (optional) —" }, ...DEPARTMENTS.map((d: string) => ({ value: d, label: d }))]}
              />
            </Field>
          </>
        )}

        {/* ── Student fields (new record) ── */}
        {role === "student" && linkMode === "new" && (
          <>
            <FormSection title="Student Details" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Form" required>
                <FieldSelect value={sForm} onChange={setSForm} options={FORMS.map((f) => ({ value: f, label: f }))} />
              </Field>
              <Field label="Gender">
                <FieldSelect value={sGender} onChange={setSGender}
                  options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Date of Birth"><FieldInput value={sDob} onChange={setSdob} type="date" /></Field>
              <Field label="Nationality"><FieldInput value={sNationality} onChange={setSNationality} placeholder="e.g. Botswana" /></Field>
              <Field label="Class"><FieldInput value={sClass} onChange={setSClass} placeholder="e.g. A, B" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Enrollment #"><FieldInput value={sEnrollment} onChange={setSEnrollment} /></Field>
              <Field label="Admission Date"><FieldInput value={sAdmissionDate} onChange={setSAdmissionDate} type="date" /></Field>
              <Field label="Academic Year"><FieldInput value={sAcademicYear} onChange={setSAcademicYear} placeholder="e.g. 2026" /></Field>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Previous School"><FieldInput value={sPreviousSchool} onChange={setSPreviousSchool} /></Field>
            </div>
            <FormSection title="Identity & Medical" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="National ID"><FieldInput value={sNationalId} onChange={setSNationalId} /></Field>
              <Field label="Passport Number"><FieldInput value={sPassport} onChange={setSPassport} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Blood Group">
                <FieldSelect value={sBloodGroup} onChange={setSBloodGroup}
                  options={[
                    { value: "", label: "Unknown" },
                    ...["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((g) => ({ value: g, label: g })),
                  ]}
                />
              </Field>
              <Field label="Medical Condition / Allergies">
                <FieldInput value={sMedical} onChange={setSMedical} placeholder="e.g. Asthma" />
              </Field>
            </div>
            <FormSection title="Parent / Guardian" />
            <Field label="Link to existing parent">
              <FieldSelect value={sParentId} onChange={setSParentId}
                options={[
                  { value: "", label: "— None / add later —" },
                  ...(parents as any[]).map((p: any) => ({
                    value: p.id,
                    label: `${p.name}${p.relation ? ` (${cap(p.relation)})` : ""}`,
                  })),
                ]}
              />
            </Field>
          </>
        )}

        {/* ── Parent fields (new record) ── */}
        {role === "parent" && linkMode === "new" && (
          <>
            <FormSection title="Parent Details" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Relation">
                <FieldSelect value={pRelation} onChange={setPRelation}
                  options={["father","mother","guardian","grandparent","other"].map((r) => ({ value: r, label: cap(r) }))} />
              </Field>
              <Field label="Occupation"><FieldInput value={pOccupation} onChange={setPOccupation} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><FieldInput value={pPhone} onChange={setPPhone} type="tel" /></Field>
              <Field label="Alternative Phone"><FieldInput value={pAltPhone} onChange={setPAltPhone} type="tel" /></Field>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Home Address"><FieldInput value={pAddress} onChange={setPAddress} /></Field>
            </div>
            <FormSection title="Identity Documents" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="National ID"><FieldInput value={pNationalId} onChange={setPNationalId} /></Field>
              <Field label="Passport Number"><FieldInput value={pPassport} onChange={setPPassport} /></Field>
            </div>
            <FormSection title="Link to Child (Student)" />
            <Field label="Student">
              <FieldSelect value={pStudentId} onChange={setPStudentId}
                options={[
                  { value: "", label: "— None / add later —" },
                  ...(students as any[]).map((s: any) => ({
                    value: s.id,
                    label: `${s.full_name} (${s.form}${s.class_name ? " " + s.class_name : ""})`,
                  })),
                ]}
              />
            </Field>
          </>
        )}

        <div className="rounded-md px-3 py-2 text-[11px] mt-2"
          style={{ background: "#ddf4ff", border: "1px solid #addcff", color: "#0969da" }}>
          <i className="fas fa-info-circle mr-1" />A random password will be generated. Download credentials after creation.
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={() => onClose()}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? "Creating…" : "Create User"}</Btn>
      </ModalFoot>
    </Modal>
  );
}
