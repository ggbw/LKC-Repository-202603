import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

export type PageId = 'dashboard' | 'students' | 'faculty' | 'parents' | 'exams' | 'results' |
  'attendance' | 'hod' | 'hoy' | 'config' | 'assignments' | 'announcements' | 'admission' | 'users';

interface AppState {
  page: PageId;
  setPage: (p: PageId) => void;
  detail: string | null;
  setDetail: (id: string | null) => void;
  showToast: (msg: string, type?: string) => void;
  tick: number;
  refresh: () => void;
}

const AppContext = createContext<AppState>(null!);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: ReactNode }) {
  const { primaryRole, isAdmin, isHOD, isHOY } = useAuth();
  const defaultPage: PageId = (isAdmin || isHOD || isHOY) ? 'dashboard' : 'announcements';

  const [page, setPageState] = useState<PageId>(defaultPage);
  const [detail, setDetail] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  const setPage = useCallback((p: PageId) => {
    setPageState(p);
    setDetail(null);
  }, []);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <AppContext.Provider value={{ page, setPage, detail, setDetail, showToast, tick, refresh }}>
      {children}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </AppContext.Provider>
  );
}

function Toast({ msg, type }: { msg: string; type: string }) {
  const bg = type === 'success' ? '#1a7f37' : type === 'error' ? '#cf222e' : type === 'info' ? '#0969da' : '#8250df';
  const icon = type === 'success' ? '✓' : type === 'info' ? 'ℹ' : type === 'error' ? '✕' : '★';
  return <div className="app-toast" style={{ background: bg }}>{icon} {msg}</div>;
}
