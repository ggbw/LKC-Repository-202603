import React, { useState, useMemo } from "react";
import {
  useExamResults,
  useStudents,
  useTeachers,
  useSubjectTeachers,
  useClassTeachers,
  useParentStudents,
} from "@/hooks/useSupabaseData";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { G, P, cap } from "@/data/database";
import { FORMS } from "@/data/database";
import { downloadExcel } from "@/lib/excel";
import { Badge, Card, StatCard, SearchBar, FilterSelect, GradeChip, Btn } from "@/components/SharedUI";

export default function ResultsPage() {
  const { isAdmin, isHOD, isHOY, isTeacher, isStudent, isParent, isClassTeacher, user } = useAuth();
  const { showToast } = useApp();

  const { data: results = [], isLoading } = useExamResults();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: classTeachers = [] } = useClassTeachers();
  const { data: parentStudents = [] } = useParentStudents();

  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // ── Resolve who the logged-in user is ──────────────────────────────────────
  const myTeacher = useMemo(() => teachers.find((t: any) => t.user_id === user?.id), [teachers, user]);

  const myStudent = useMemo(() => students.find((s: any) => s.user_id === user?.id), [students, user]);

  // Parent: find their record and their children's student IDs
  const myParentRecord = useMemo(
    () => parentStudents.find((ps: any) => ps.parents?.user_id === user?.id)?.parents ?? null,
    [parentStudents, user],
  );
  const myChildIds = useMemo(() => {
    if (!myParentRecord) return new Set<string>();
    return new Set(
      parentStudents.filter((ps: any) => ps.parent_id === myParentRecord.id).map((ps: any) => ps.student_id),
    );
  }, [parentStudents, myParentRecord]);

  // Subject IDs this teacher teaches
  const mySubjectIds = useMemo(
    () =>
      myTeacher
        ? new Set(subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => st.subject_id))
        : new Set<string>(),
    [subjectTeachers, myTeacher],
  );

  // Class assignments for this class teacher
  const myClassAssignments = useMemo(
    () => (myTeacher ? classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id) : []),
    [classTeachers, myTeacher],
  );

  // Student IDs in this class teacher's class(es)
  const myClassStudentIds = useMemo(() => {
    if (!myClassAssignments.length) return new Set<string>();
    return new Set(
      students
        .filter(
          (s: any) =>
            s.state === "active" &&
            myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name),
        )
        .map((s: any) => s.id),
    );
  }, [students, myClassAssignments]);

  // ── Role-based result filtering ────────────────────────────────────────────
  const roleFilteredResults = useMemo(() => {
    // Admin, HOD, HOY — see everything
    if (isAdmin || isHOD || isHOY) return results;

    // Class teacher — see all results for students in their class
    if (isClassTeacher && myClassStudentIds.size > 0) {
      return results.filter((r: any) => myClassStudentIds.has(r.student_id));
    }

    // Regular teacher — see only results for subjects they teach
    if (isTeacher && myTeacher) {
      return results.filter((r: any) => mySubjectIds.has(r.subject_id));
    }

    // Student — see only their own results
    if (isStudent && myStudent) {
      return results.filter((r: any) => r.student_id === myStudent.id);
    }

    // Parent — see results for all their linked children
    if (isParent && myChildIds.size > 0) {
      return results.filter((r: any) => myChildIds.has(r.student_id));
    }

    return [];
  }, [
    results,
    isAdmin,
    isHOD,
    isHOY,
    isClassTeacher,
    isTeacher,
    isStudent,
    isParent,
    myTeacher,
    myStudent,
    mySubjectIds,
    myClassStudentIds,
    myChildIds,
  ]);

  // ── Available filter options derived from role-filtered results ────────────
  const availableExams = useMemo(
    () => [...new Set(roleFilteredResults.map((r: any) => r.exam_name))].sort(),
    [roleFilteredResults],
  );

  const availableForms = useMemo(
    () => [...new Set(roleFilteredResults.map((r: any) => r.students?.form).filter(Boolean))].sort(),
    [roleFilteredResults],
  );

  const availableClasses = useMemo(() => {
    const base = formFilter
      ? roleFilteredResults.filter((r: any) => r.students?.form === formFilter)
      : roleFilteredResults;
    return [...new Set(base.map((r: any) => r.students?.class_name).filter(Boolean))].sort();
  }, [roleFilteredResults, formFilter]);

  // ── Search + filter on top of role-filtered results ────────────────────────
  const filt = useMemo(
    () =>
      roleFilteredResults.filter((r: any) => {
        if (search && !(r.students?.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
        if (examFilter && r.exam_name !== examFilter) return false;
        if (formFilter && r.students?.form !== formFilter) return false;
        if (classFilter && r.students?.class_name !== classFilter) return false;
        return true;
      }),
    [roleFilteredResults, search, examFilter, formFilter, classFilter],
  );

  // ── Summary stats ──────────────────────────────────────────────────────────
  const avgPct = useMemo(() => {
    if (!filt.length) return null;
    const total = filt.reduce((sum: number, r: any) => sum + P(Number(r.obtained_marks), Number(r.max_marks)), 0);
    return Math.round(total / filt.length);
  }, [filt]);

  const passCount = useMemo(
    () => filt.filter((r: any) => P(Number(r.obtained_marks), Number(r.max_marks)) >= 50).length,
    [filt],
  );

  // ── Role label for the page header ────────────────────────────────────────
  const scopeLabel = useMemo(() => {
    if (isAdmin || isHOD || isHOY) return "All students";
    if (isClassTeacher && myClassAssignments.length) {
      return `Class: ${myClassAssignments.map((ct: any) => `${ct.form} ${ct.class_name}`).join(", ")}`;
    }
    if (isTeacher) return "Your subjects only";
    if (isStudent) return "Your results only";
    if (isParent) return "Your children's results";
    return "";
  }, [isAdmin, isHOD, isHOY, isClassTeacher, isTeacher, isStudent, myClassAssignments]);

  const handleExport = () => {
    downloadExcel(
      filt.map((r: any) => {
        const p = P(Number(r.obtained_marks), Number(r.max_marks));
        return {
          Student: r.students?.full_name || "",
          Form: r.students?.form || "",
          Class: r.students?.class_name || "",
          Subject: r.subjects?.name || "",
          Exam: r.exam_name,
          Obtained: r.obtained_marks,
          Max: r.max_marks,
          "%": p,
          Grade: G(p),
          Status: cap(r.state || "done"),
        };
      }),
      "exam_results_export",
      "Results",
    );
    showToast("Results exported");
  };

  if (isLoading)
    return (
      <div className="page-animate">
        <div className="text-sm" style={{ color: "hsl(var(--text2))" }}>
          Loading...
        </div>
      </div>
    );

  // Students see a personal view — no table, just their own results as cards
  if (isStudent && !isAdmin && !isHOD && !isHOY && !isTeacher) {
    return (
      <StudentResultsView
        results={roleFilteredResults}
        examFilter={examFilter}
        setExamFilter={setExamFilter}
        availableExams={availableExams}
        onExport={handleExport}
      />
    );
  }

  return (
    <div className="page-animate">
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-chart-bar mr-2" />
            Exam Results
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {scopeLabel}
            {scopeLabel && " · "}
            {roleFilteredResults.length} result{roleFilteredResults.length !== 1 ? "s" : ""}
          </div>
        </div>
        <Btn variant="outline" onClick={handleExport}>
          <i className="fas fa-download mr-1" />
          Export
        </Btn>
      </div>

      {/* ── Role banner for scoped views ── */}
      {isTeacher && !isAdmin && !isHOD && !isHOY && (
        <div
          className="rounded-md px-4 py-3 mb-4 text-[12px]"
          style={{
            background: isClassTeacher ? "#dafbe1" : "#ddf4ff",
            border: `1px solid ${isClassTeacher ? "#aceebb" : "#addcff"}`,
            color: isClassTeacher ? "#1a7f37" : "#0969da",
          }}
        >
          <i className={`fas ${isClassTeacher ? "fa-chalkboard-teacher" : "fa-book"} mr-1.5`} />
          {isClassTeacher ? (
            <>
              Showing all results for your class:{" "}
              <strong>{myClassAssignments.map((ct: any) => `${ct.form} ${ct.class_name}`).join(", ")}</strong>
            </>
          ) : (
            <>Showing results for your assigned subjects only.</>
          )}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard icon="fas fa-chart-bar" bg="#ddf4ff" value={filt.length} label="Results Shown" />
        <StatCard
          icon="fas fa-graduation-cap"
          bg="#dafbe1"
          value={[...new Set(filt.map((r: any) => r.student_id))].length}
          label="Students"
        />
        <StatCard
          icon="fas fa-percentage"
          bg="#fbefff"
          value={avgPct !== null ? `${avgPct}%` : "—"}
          label="Average"
          sub={avgPct !== null ? `Grade ${G(avgPct)}` : undefined}
        />
        <StatCard
          icon="fas fa-check-circle"
          bg="#fff8c5"
          value={filt.length ? `${Math.round((passCount / filt.length) * 100)}%` : "—"}
          label="Pass Rate"
        />
      </div>

      <Card>
        {/* ── Filters ── */}
        <div className="flex gap-2.5 mb-4 flex-wrap">
          {/* Search */}
          <input
            className="flex-1 min-w-[180px] border rounded-md py-[7px] px-3 text-[12.5px] outline-none font-sans"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface2))" }}
            placeholder="🔍  Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* Exam filter */}
          <FilterSelect
            value={examFilter}
            onChange={setExamFilter}
            allLabel="All Exams"
            options={availableExams.map((e) => ({ value: e, label: e }))}
          />
          {/* Form filter — only show for roles that can see multiple forms */}
          {(isAdmin || isHOD || isHOY || isClassTeacher) && (
            <FilterSelect
              value={formFilter}
              onChange={(v) => {
                setFormFilter(v);
                setClassFilter("");
              }}
              allLabel="All Forms"
              options={availableForms.map((f) => ({ value: f, label: f }))}
            />
          )}
          {/* Class filter — show when a form is selected, or for class teachers / admins */}
          {(isAdmin || isHOD || isHOY || isTeacher) && availableClasses.length > 0 && (
            <FilterSelect
              value={classFilter}
              onChange={setClassFilter}
              allLabel="All Classes"
              options={availableClasses.map((c) => ({ value: c, label: c }))}
            />
          )}
          {/* Clear filters */}
          {(search || examFilter || formFilter || classFilter) && (
            <Btn
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setExamFilter("");
                setFormFilter("");
                setClassFilter("");
              }}
            >
              <i className="fas fa-times mr-1" />
              Clear
            </Btn>
          )}
        </div>

        {filt.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: "hsl(var(--text3))" }}>
            No results found{search || examFilter || formFilter || classFilter ? " for current filters" : ""}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                  {["Student", "Form", "Class", "Subject", "Exam", "Marks", "%", "Grade", "Status"].map((h) => (
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
                {filt.slice(0, 200).map((r: any) => {
                  const p = P(Number(r.obtained_marks), Number(r.max_marks));
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                      <td className="py-2.5 px-3.5 font-semibold">{r.students?.full_name || "—"}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.students?.form || "—"}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.students?.class_name || "—"}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.subjects?.name || "—"}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.exam_name}</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">
                        {r.obtained_marks}/{r.max_marks}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold">{p}%</td>
                      <td className="py-2.5 px-3.5">
                        <GradeChip grade={G(p)} />
                      </td>
                      <td className="py-2.5 px-3.5">
                        <Badge status={r.state || "done"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[11px] mt-2.5 flex justify-between" style={{ color: "hsl(var(--text2))" }}>
              <span>
                Showing {Math.min(filt.length, 200)} of {filt.length} results
              </span>
              {filt.length > 200 && <span style={{ color: "#9a6700" }}>Use filters to narrow results</span>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Student personal results view ────────────────────────────────────────────

function StudentResultsView({
  results,
  examFilter,
  setExamFilter,
  availableExams,
  onExport,
}: {
  results: any[];
  examFilter: string;
  setExamFilter: (v: string) => void;
  availableExams: string[];
  onExport: () => void;
}) {
  const filt = examFilter ? results.filter((r: any) => r.exam_name === examFilter) : results;

  // Group by exam for the student view
  const byExam = useMemo(() => {
    const map: Record<string, any[]> = {};
    filt.forEach((r: any) => {
      if (!map[r.exam_name]) map[r.exam_name] = [];
      map[r.exam_name].push(r);
    });
    return map;
  }, [filt]);

  const overallAvg = useMemo(() => {
    if (!filt.length) return null;
    return Math.round(
      filt.reduce((s: number, r: any) => s + P(Number(r.obtained_marks), Number(r.max_marks)), 0) / filt.length,
    );
  }, [filt]);

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">
            <i className="fas fa-chart-bar mr-2" />
            My Results
          </div>
          <div className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
            {filt.length} result{filt.length !== 1 ? "s" : ""}
          </div>
        </div>
        <Btn variant="outline" onClick={onExport}>
          <i className="fas fa-download mr-1" />
          Export
        </Btn>
      </div>

      {/* Summary */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard icon="fas fa-clipboard-list" bg="#ddf4ff" value={Object.keys(byExam).length} label="Exams" />
        <StatCard icon="fas fa-book" bg="#dafbe1" value={filt.length} label="Subjects Taken" />
        <StatCard
          icon="fas fa-percentage"
          bg="#fbefff"
          value={overallAvg !== null ? `${overallAvg}%` : "—"}
          label="Overall Average"
          sub={overallAvg !== null ? `Grade ${G(overallAvg)}` : undefined}
        />
        <StatCard
          icon="fas fa-check-circle"
          bg="#fff8c5"
          value={
            filt.length
              ? `${Math.round((filt.filter((r: any) => P(Number(r.obtained_marks), Number(r.max_marks)) >= 50).length / filt.length) * 100)}%`
              : "—"
          }
          label="Pass Rate"
        />
      </div>

      {/* Exam filter */}
      {availableExams.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {["", ...availableExams].map((e) => (
            <button
              key={e || "_all"}
              onClick={() => setExamFilter(e)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer"
              style={{
                background: examFilter === e ? "#1a3fa0" : "hsl(var(--surface2))",
                color: examFilter === e ? "#fff" : "hsl(var(--text2))",
                borderColor: examFilter === e ? "#1a3fa0" : "hsl(var(--border))",
              }}
            >
              {e || "All Exams"}
            </button>
          ))}
        </div>
      )}

      {filt.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-xs" style={{ color: "hsl(var(--text3))" }}>
            No results recorded yet.
          </div>
        </Card>
      ) : (
        Object.entries(byExam).map(([examName, examResults]) => {
          const examAvg = Math.round(
            examResults.reduce((s, r) => s + P(Number(r.obtained_marks), Number(r.max_marks)), 0) / examResults.length,
          );
          return (
            <Card
              key={examName}
              className="mb-3.5"
              title={
                <>
                  <i className="fas fa-clipboard-list mr-1.5" />
                  {examName}
                </>
              }
              titleRight={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold">{examAvg}%</span>
                  <GradeChip grade={G(examAvg)} />
                </div>
              }
            >
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                    {["Subject", "Marks", "%", "Grade", "Comment"].map((h) => (
                      <th
                        key={h}
                        className="py-2 px-3.5 text-left text-[10px] font-semibold uppercase"
                        style={{ color: "hsl(var(--text2))" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {examResults.map((r: any) => {
                    const p = P(Number(r.obtained_marks), Number(r.max_marks));
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f6f8fa" }}>
                        <td className="py-2 px-3.5 font-semibold">{r.subjects?.name || "—"}</td>
                        <td className="py-2 px-3.5 font-mono text-[11px]">
                          {r.obtained_marks}/{r.max_marks}
                        </td>
                        <td
                          className="py-2 px-3.5 font-mono font-bold"
                          style={{ color: p >= 60 ? "#1a7f37" : p >= 50 ? "#9a6700" : "#cf222e" }}
                        >
                          {p}%
                        </td>
                        <td className="py-2 px-3.5">
                          <GradeChip grade={G(p)} />
                        </td>
                        <td className="py-2 px-3.5 text-[11px] italic" style={{ color: "hsl(var(--text2))" }}>
                          {r.long_comment || r.short_comment || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })
      )}
    </div>
  );
}
