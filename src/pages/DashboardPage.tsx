import React, { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  useStudents,
  useTeachers,
  useAttendance,
  useAnnouncements,
  useClassTeachers,
  useExamResults,
  useSubjects,
} from "@/hooks/useSupabaseData";
import { StatCard, Card, Badge, Btn, GradeChip } from "@/components/SharedUI";
import { FORMS, formatDate, G, P } from "@/data/database";

export default function DashboardPage() {
  const { isClassTeacher, profile, user } = useAuth();
  const { setPage } = useApp();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: classTeachers = [] } = useClassTeachers();
  const { data: results = [] } = useExamResults();
  const { data: subjects = [] } = useSubjects();
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: todayAtt = [] } = useAttendance(todayStr);
  const { data: announcements = [] } = useAnnouncements();

  const active = students.filter((s: any) => s.state === "active").length;
  const rate = todayAtt.length
    ? Math.round((todayAtt.filter((a: any) => a.status === "present").length / todayAtt.length) * 100)
    : 0;
  const fCnts = FORMS.map((f) => ({ f, n: students.filter((s: any) => s.form === f && s.state === "active").length }));
  const mx = Math.max(...fCnts.map((x) => x.n), 1);

  // Derive class teacher's assigned class(es)
  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);
  const myClassAssignments = useMemo(
    () => (myTeacher ? classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id) : []),
    [classTeachers, myTeacher],
  );

  // Students in the class teacher's class(es)
  const myClassStudents = useMemo(() => {
    if (!myClassAssignments.length) return [];
    return students.filter(
      (s: any) =>
        s.state === "active" &&
        myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name),
    );
  }, [students, myClassAssignments]);

  const myClassStudentIds = useMemo(() => new Set(myClassStudents.map((s: any) => s.id)), [myClassStudents]);

  // Results for the class teacher's students only
  const myClassResults = useMemo(
    () => results.filter((r: any) => myClassStudentIds.has(r.student_id)),
    [results, myClassStudentIds],
  );

  // Per-subject performance stats
  const subjectStats = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number; passes: number }> = {};
    myClassResults.forEach((r: any) => {
      const sid = r.subject_id;
      const subName = r.subjects?.name || subjects.find((s: any) => s.id === sid)?.name || "Unknown";
      if (!map[sid]) map[sid] = { name: subName, total: 0, count: 0, passes: 0 };
      const pct = P(Number(r.obtained_marks), Number(r.max_marks));
      map[sid].total += pct;
      map[sid].count += 1;
      if (pct >= 50) map[sid].passes += 1;
    });
    return Object.values(map)
      .map((s) => ({ ...s, avg: Math.round(s.total / s.count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [myClassResults, subjects]);

  // Per-student averages
  const studentAverages = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    myClassResults.forEach((r: any) => {
      const sid = r.student_id;
      const name = r.students?.full_name || myClassStudents.find((s: any) => s.id === sid)?.full_name || "Unknown";
      if (!map[sid]) map[sid] = { name, total: 0, count: 0 };
      map[sid].total += P(Number(r.obtained_marks), Number(r.max_marks));
      map[sid].count += 1;
    });
    return Object.values(map)
      .map((s) => ({ ...s, avg: Math.round(s.total / s.count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [myClassResults, myClassStudents]);

  const classAvg = studentAverages.length
    ? Math.round(studentAverages.reduce((s, x) => s + x.avg, 0) / studentAverages.length)
    : null;

  return (
    <div className="page-animate">
      <div className="mb-4">
        <div className="text-lg font-bold">Welcome, {profile?.full_name || "User"}!</div>
        <div className="text-xs mt-0.5" style={{ color: "hsl(var(--text2))" }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
        <StatCard
          icon="fas fa-graduation-cap"
          bg="#dafbe1"
          value={students.length}
          label="Total Students"
          sub={`Active: ${active}`}
          subColor="#2ea043"
        />
        <StatCard icon="fas fa-chalkboard-teacher" bg="#ddf4ff" value={teachers.length} label="Teachers" />
        <StatCard icon="fas fa-calendar-check" bg="#fff8c5" value={`${rate}%`} label="Attendance Today" />
        <StatCard icon="fas fa-bullhorn" bg="#fbefff" value={announcements.length} label="Announcements" />
      </div>

      {/* ── CLASS TEACHER PERFORMANCE PANEL ── */}
      {isClassTeacher && myClassAssignments.length > 0 && (
        <div className="mb-5">
          {/* Header banner */}
          <div
            className="rounded-lg px-4 py-3 mb-3 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #1a3fa0 0%, #2563eb 100%)", color: "#fff" }}
          >
            <i className="fas fa-chalkboard-teacher" style={{ fontSize: "22px", opacity: 0.9 }} />
            <div>
              <div className="font-bold text-[14px]">
                Class Teacher — {myClassAssignments.map((ct: any) => `${ct.form} ${ct.class_name}`).join(", ")}
              </div>
              <div className="text-[11px] opacity-80">
                {myClassStudents.length} students · {myClassResults.length} result records
                {classAvg !== null && (
                  <>
                    {" "}
                    · Class average: <strong>{classAvg}%</strong> ({G(classAvg)})
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick stat cards for the class */}
          <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <StatCard icon="fas fa-users" bg="#ddf4ff" value={myClassStudents.length} label="My Class Students" />
            <StatCard
              icon="fas fa-chart-bar"
              bg="#dafbe1"
              value={classAvg !== null ? `${classAvg}%` : "—"}
              label="Class Average"
              sub={classAvg !== null ? `Grade ${G(classAvg)}` : undefined}
              subColor="#1a7f37"
            />
            <StatCard icon="fas fa-book" bg="#fbefff" value={subjectStats.length} label="Subjects Tracked" />
            <StatCard
              icon="fas fa-check-circle"
              bg="#fff8c5"
              value={
                studentAverages.length
                  ? `${Math.round((studentAverages.filter((s) => s.avg >= 50).length / studentAverages.length) * 100)}%`
                  : "—"
              }
              label="Class Pass Rate"
            />
          </div>

          {myClassResults.length === 0 ? (
            <div
              className="rounded-lg border px-5 py-8 text-center"
              style={{ background: "hsl(var(--surface))", borderColor: "hsl(var(--border))" }}
            >
              <i className="fas fa-chart-bar mb-2 block" style={{ fontSize: "24px", color: "hsl(var(--text3))" }} />
              <div className="text-sm" style={{ color: "hsl(var(--text3))" }}>
                No exam results recorded for your class yet.
              </div>
            </div>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
              {/* Subject Performance Table */}
              <Card
                title={
                  <>
                    <i className="fas fa-book mr-1.5" />
                    Performance by Subject (All Exams)
                  </>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr style={{ background: "hsl(var(--surface2))", borderBottom: "2px solid hsl(var(--border))" }}>
                        {["Subject", "Students", "Avg %", "Grade", "Pass Rate"].map((h) => (
                          <th
                            key={h}
                            className="py-2 px-3 text-left text-[10px] font-semibold uppercase tracking-wide"
                            style={{ color: "hsl(var(--text2))" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjectStats.map((s, i) => {
                        const passRate = Math.round((s.passes / s.count) * 100);
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f6f8fa" }}>
                            <td className="py-2 px-3 font-semibold">{s.name}</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{s.count}</td>
                            <td className="py-2 px-3 font-mono font-bold">{s.avg}%</td>
                            <td className="py-2 px-3">
                              <GradeChip grade={G(s.avg)} />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex-1 rounded-full overflow-hidden"
                                  style={{ height: "6px", background: "#f0f0f0", minWidth: "50px" }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${passRate}%`,
                                      background: passRate >= 70 ? "#2ea043" : passRate >= 50 ? "#e6a817" : "#cf222e",
                                    }}
                                  />
                                </div>
                                <span className="font-mono text-[10px]">{passRate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Student Rankings */}
              <Card
                title={
                  <>
                    <i className="fas fa-trophy mr-1.5" />
                    Student Rankings
                  </>
                }
                titleRight={
                  <Btn variant="outline" size="sm" onClick={() => setPage("results")} style={{ fontSize: "10px" }}>
                    Full Results <i className="fas fa-arrow-right ml-1" />
                  </Btn>
                }
              >
                {studentAverages.length === 0 ? (
                  <div className="text-xs py-4 text-center" style={{ color: "hsl(var(--text3))" }}>
                    No data yet
                  </div>
                ) : (
                  <>
                    <div className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: "hsl(var(--text3))" }}>
                      Top Performers
                    </div>
                    {studentAverages.slice(0, 5).map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5"
                        style={{ borderBottom: "1px solid #f6f8fa" }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[10px] w-5 text-right font-bold"
                            style={{
                              color:
                                i === 0 ? "#e6a817" : i === 1 ? "#656d76" : i === 2 ? "#b45309" : "hsl(var(--text3))",
                            }}
                          >
                            #{i + 1}
                          </span>
                          <span className="text-[12px] font-medium truncate" style={{ maxWidth: "130px" }}>
                            {s.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="font-mono text-[12px] font-bold">{s.avg}%</span>
                          <GradeChip grade={G(s.avg)} />
                        </div>
                      </div>
                    ))}

                    {studentAverages.length > 5 && (
                      <>
                        <div className="text-[10px] font-semibold uppercase mt-3 mb-1.5" style={{ color: "#cf222e" }}>
                          <i className="fas fa-exclamation-circle mr-1" />
                          Needs Attention
                        </div>
                        {[...studentAverages]
                          .reverse()
                          .slice(0, 3)
                          .map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between py-1.5"
                              style={{ borderBottom: "1px solid #f6f8fa" }}
                            >
                              <div className="flex items-center gap-2">
                                <i className="fas fa-exclamation-circle text-[10px]" style={{ color: "#cf222e" }} />
                                <span className="text-[12px] font-medium truncate" style={{ maxWidth: "130px" }}>
                                  {s.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="font-mono text-[12px] font-bold">{s.avg}%</span>
                                <GradeChip grade={G(s.avg)} />
                              </div>
                            </div>
                          ))}
                      </>
                    )}

                    <div
                      className="mt-2.5 pt-2 text-[11px]"
                      style={{ borderTop: "1px solid hsl(var(--border))", color: "hsl(var(--text2))" }}
                    >
                      {studentAverages.length} students with recorded results
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── STANDARD DASHBOARD BOTTOM ── */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <Card
          title="Recent Announcements"
          titleRight={
            <Btn variant="outline" size="sm" onClick={() => setPage("announcements")} style={{ fontSize: "10px" }}>
              View All
            </Btn>
          }
        >
          {announcements.slice(0, 5).map((a: any) => (
            <div key={a.id} className="py-2.5" style={{ borderBottom: "1px solid #f6f8fa" }}>
              <div className="flex justify-between items-start">
                <div className="font-semibold text-[12.5px]">{a.title}</div>
                <Badge status={a.type || "announcement"} />
              </div>
              <div className="text-[11px] mt-1" style={{ color: "hsl(var(--text2))" }}>
                {a.content?.slice(0, 100)}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "hsl(var(--text3))" }}>
                {formatDate(a.created_at)}
              </div>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="text-xs py-2" style={{ color: "hsl(var(--text3))" }}>
              No announcements yet
            </div>
          )}
        </Card>

        <Card title="Students by Form">
          {fCnts.map(({ f, n }) => (
            <div key={f} className="mb-2.5">
              <div className="flex justify-between text-[11px] mb-1" style={{ color: "hsl(var(--text2))" }}>
                <span>{f}</span>
                <span className="font-mono">{n}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(n / mx) * 100}%` }} />
              </div>
            </div>
          ))}
          <div
            className="mt-2.5 rounded-md px-3 py-[9px] text-[11px] font-semibold"
            style={{ background: "#f0fff4", border: "1px solid #aceebb", color: "#1a7f37" }}
          >
            <i className="fas fa-calendar-alt mr-1" /> Academic Year 2026 — Active
          </div>
        </Card>
      </div>
    </div>
  );
}
