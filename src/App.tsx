import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider, useApp } from '@/context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import LoginPage from '@/pages/LoginPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import AdmissionPage from '@/pages/AdmissionPage';
import DashboardPage from '@/pages/DashboardPage';
import StudentsPage from '@/pages/StudentsPage';
import ParentsPage from '@/pages/ParentsPage';
import FacultyPage from '@/pages/FacultyPage';
import AssignmentsPage from '@/pages/AssignmentsPage';
import { ExamsPage, ResultsPage, AttendancePage, HODPage, ConfigPage } from '@/pages/OtherPages';

const queryClient = new QueryClient();

function ProtectedApp() {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <img src="/images/lkc-logo.jpeg" alt="LKC" className="w-20 h-20 rounded-full mx-auto mb-4" />
          <div className="text-sm" style={{ color: '#8b949e' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (profile?.must_change_password) return <ChangePasswordPage />;

  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

function AppInner() {
  const { page, tick } = useApp();
  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    students: <StudentsPage />,
    parents: <ParentsPage />,
    faculty: <FacultyPage />,
    assignments: <AssignmentsPage />,
    exams: <ExamsPage />,
    results: <ResultsPage />,
    attendance: <AttendancePage />,
    hod: <HODPage />,
    config: <ConfigPage />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-5" key={`${page}-${tick}`}>
          {pages[page] || <DashboardPage />}
        </div>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admission" element={<AdmissionPage />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
