// Utility functions and constants - no more mock data

export const FORMS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'];
export const GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'U'] as const;
export const RELATIONS = ['father', 'mother', 'guardian', 'grandparent', 'other'];

// Grade function matching the school's grading scale
export const G = (p: number) =>
  p >= 90 ? 'A*' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' :
  p >= 50 ? 'D' : p >= 45 ? 'E' : p >= 40 ? 'F' : p >= 35 ? 'G' : 'U';

export const P = (o: number, m: number) => m > 0 ? Math.round(o / m * 100) : 0;
export const cap = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

export function badgeClass(st: string) {
  const C: Record<string, string> = {
    active: 'green', graduated: 'blue', transferred: 'yellow', suspended: 'red', inactive: 'gray',
    done: 'green', confirmed: 'blue', ongoing: 'yellow', draft: 'gray', cancelled: 'red',
    present: 'green', absent: 'red', late: 'yellow', excused: 'blue', on_leave: 'yellow',
    published: 'green', closed: 'gray', submitted: 'blue', graded: 'purple', overdue: 'red',
    not_submitted: 'gray', file: 'blue', text: 'yellow', both: 'orange', returned: 'yellow',
    pending: 'yellow', approved: 'green', rejected: 'red', announcement: 'blue', event: 'purple',
  };
  return C[st] || 'gray';
}

export function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Grade color helpers
export const gradeColor = (g: string) => {
  if (g === 'A*' || g === 'A') return { bg: '#dafbe1', color: '#1a7f37' };
  if (g === 'B' || g === 'C') return { bg: '#fff8c5', color: '#9a6700' };
  if (g === 'D' || g === 'E') return { bg: '#ffebe9', color: '#cf222e' };
  return { bg: '#f6f8fa', color: '#656d76' };
};

// Credit pass = 60%+ (A*, A, B, C)
export const isCreditPass = (g: string) => ['A*', 'A', 'B', 'C'].includes(g);
// Pass = 50%+ (A*, A, B, C, D)
export const isPass = (g: string) => ['A*', 'A', 'B', 'C', 'D'].includes(g);
