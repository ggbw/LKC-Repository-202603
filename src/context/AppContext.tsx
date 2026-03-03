import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Role = 'admin' | 'teacher' | 'student';
export type PageId = 'dashboard' | 'students' | 'faculty' | 'parents' | 'exams' | 'results' | 'attendance' | 'hod' | 'config' | 'assignments';

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  page: PageId;
  setPage: (p: PageId) => void;
  detail: number | null;
  setDetail: (id: number | null) => void;
  // assignment-specific detail state
  asnDetail: number | null;
  setAsnDetail: (id: number | null) => void;
  asnSubDetail: number | null;
  setAsnSubDetail: (id: number | null) => void;
  stuAsnDetail: number | null;
  setStuAsnDetail: (id: number | null) => void;
  facDetail: number | null;
  setFacDetail: (id: number | null) => void;
  // toast
  showToast: (msg: string, type?: string) => void;
  // force re-render
  tick: number;
  refresh: () => void;
}

const AppContext = createContext<AppState>(null!);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('admin');
  const [page, setPageState] = useState<PageId>('dashboard');
  const [detail, setDetail] = useState<number | null>(null);
  const [asnDetail, setAsnDetail] = useState<number | null>(null);
  const [asnSubDetail, setAsnSubDetail] = useState<number | null>(null);
  const [stuAsnDetail, setStuAsnDetail] = useState<number | null>(null);
  const [facDetail, setFacDetail] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    setPageState('dashboard');
    setDetail(null);
    setAsnDetail(null);
    setAsnSubDetail(null);
    setStuAsnDetail(null);
    setFacDetail(null);
  }, []);

  const setPage = useCallback((p: PageId) => {
    setPageState(p);
    setDetail(null);
    setAsnDetail(null);
    setAsnSubDetail(null);
    setStuAsnDetail(null);
    setFacDetail(null);
  }, []);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <AppContext.Provider value={{
      role, setRole, page, setPage, detail, setDetail,
      asnDetail, setAsnDetail, asnSubDetail, setAsnSubDetail,
      stuAsnDetail, setStuAsnDetail, facDetail, setFacDetail,
      showToast, tick, refresh,
    }}>
      {children}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </AppContext.Provider>
  );
}

function Toast({ msg, type }: { msg: string; type: string }) {
  const bg = type === 'success' ? '#1a7f37' : type === 'error' ? '#cf222e' : type === 'info' ? '#0969da' : '#8250df';
  const icon = type === 'success' ? '✓' : type === 'info' ? 'ℹ' : type === 'error' ? '✕' : '★';
  return (
    <div className="app-toast" style={{ background: bg }}>
      {icon} {msg}
    </div>
  );
}
