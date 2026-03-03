import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import DashboardPage from '@/pages/DashboardPage';
import StudentsPage from '@/pages/StudentsPage';
import ParentsPage from '@/pages/ParentsPage';
import FacultyPage from '@/pages/FacultyPage';
import AssignmentsPage from '@/pages/AssignmentsPage';
import { ExamsPage, ResultsPage, AttendancePage, HODPage, ConfigPage } from '@/pages/OtherPages';

function AppContent() {
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
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
