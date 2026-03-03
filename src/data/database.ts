// In-memory database matching the original HTML exactly

export const FORMS = ['Form 1','Form 2','Form 3','Form 4','Form 5','Form 6','Form 7'];
export const DIVS: Record<string, string[]> = {
  'Form 1':['A','B','K','L','M','N','P','S'],'Form 2':['A','B','K','L','M','N','P','S'],
  'Form 3':['A','B','K','L','M','N','P','S'],'Form 4':['A','B','K','L','M','N','P','S'],
  'Form 5':['A','B','K','L','M','N','P','S'],'Form 6':['AS Jan','AS June','A2 Jan','A2 June'],
  'Form 7':['AS Jan','AS June','A2 Jan','A2 June'],
};
export const SUBJECTS = ['Computer Science','ICT','Mathematics','Physics','Chemistry','Biology','English Language','Setswana','Geography','History','Accounts','Business'];
export const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
export const RELATIONS = ['father','mother','guardian','grandparent','other'];
export const STATES_STU = ['active','graduated','transferred','suspended','inactive'];
export const SUB_TYPES: [string, string][] = [['file','File Upload'],['text','Text Entry'],['both','File + Text']];

export interface Parent {
  id: number; parent_name: string; relation_with_child: string; phone: string;
  mobile: string; email: string; city: string; occupation: string; employer: string; notes: string;
}
export interface Student {
  id: number; student_full_name: string; enrollment_number: string; gender: string;
  date_of_birth: string; blood_group: string; form: string; div_letter: string;
  division: string; state: string; parent_id: number | null; parent_name: string | null;
  mobile: string; email: string; city: string; medical_notes: string; notes: string;
}
export interface Teacher {
  id: number; name: string; code: string; dept: string; subjects: string[];
  email: string; phone: string; state: string; exp: number;
}
export interface Assignment {
  id: number; title: string; description: string; subject: string | null; form: string;
  division: string | null; teacher_id: number; teacher_name: string; due_date: string;
  total_marks: number | null; submission_type: string; allow_late: boolean; state: string;
  attachment?: string | null;
}
export interface Submission {
  id: number; assignment_id: number; student_id: number; student_name: string;
  student_enrollment: string; student_div: string; submitted_at: string;
  submission_text: string; submission_file: string; is_late: boolean; status: string;
  obtained_marks: number | null; teacher_comment: string; graded_by: string | null;
}
export interface ExamResult {
  student: string; sid: number; exam: string; subject: string;
  obtained: number; max: number; teacher: string; state: string;
}
export interface AttendRecord {
  student: string; date: string; state: string; form: string; div: string;
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0x80000000; };
}

const FN = ['Kagiso','Naledi','Thabo','Lesego','Mpho','Kefilwe','Tebogo','Boipelo','Olorato','Dintle','Kabo','Gaone','Onkemetse','Tshepiso','Bontle','Modiri','Refilwe','Tshepo','Lerato','Kgotso'];
const LN = ['Moeti','Dube','Nkosi','Tau','Segoe','Gaone','Modise','Kgari','Molefi','Phiri','Seretse','Kgomo','Motswedi','Molaudi','Keabetswe','Seleke','Moseki','Gabaake','Maswabi','Mosweu'];

export const TEACHERS: Teacher[] = [
  {id:1,name:'Ms. Makoni',code:'T001',dept:'Teaching / IT',subjects:['Computer Science','ICT'],email:'makoni@lkc.ac.bw',phone:'+267 71 234 567',state:'active',exp:8},
  {id:2,name:'Mr. Ndaba',code:'T002',dept:'Teaching / IT',subjects:['Computer Science'],email:'ndaba@lkc.ac.bw',phone:'+267 72 345 678',state:'active',exp:5},
  {id:3,name:'Ms. Madzivanyika',code:'T003',dept:'Teaching / Mathematics',subjects:['Mathematics'],email:'madzivanyika@lkc.ac.bw',phone:'+267 73 456 789',state:'active',exp:12},
  {id:4,name:'Mr. Banda',code:'T004',dept:'Teaching / Languages',subjects:['English Language','Setswana'],email:'banda@lkc.ac.bw',phone:'+267 74 567 890',state:'active',exp:10},
  {id:5,name:'Ms. Sithole',code:'T005',dept:'Teaching / Commerce',subjects:['Accounts','Business'],email:'sithole@lkc.ac.bw',phone:'+267 75 678 901',state:'active',exp:7},
  {id:6,name:'Mr. Dube',code:'T006',dept:'Teaching / Humanities',subjects:['Geography','History'],email:'dube@lkc.ac.bw',phone:'+267 76 789 012',state:'on_leave',exp:15},
  {id:7,name:'Ms. Moyo',code:'T007',dept:'Teaching / Sciences',subjects:['Physics','Chemistry'],email:'moyo@lkc.ac.bw',phone:'+267 77 890 123',state:'active',exp:9},
  {id:8,name:'Mr. Khumalo',code:'T008',dept:'Teaching / Sciences',subjects:['Biology','Chemistry'],email:'khumalo@lkc.ac.bw',phone:'+267 78 901 234',state:'active',exp:6},
  {id:9,name:'Ms. Nkosi',code:'T009',dept:'Teaching / IT',subjects:['ICT'],email:'nkosi@lkc.ac.bw',phone:'+267 79 012 345',state:'active',exp:3},
];

// Mutable database
class Database {
  parents: Parent[] = [];
  students: Student[] = [];
  assignments: Assignment[] = [];
  submissions: Submission[] = [];
  results: ExamResult[] = [];
  attendance: AttendRecord[] = [];
  _pid = 1; _sid = 1; _eno = 1; _aid = 1; _subid = 1;

  constructor() {
    this.seed();
  }

  private seed() {
    // Seed parents
    const rp = rng(11);
    const parentNames = ['Mr. Moeti','Mrs. Dube','Mr. Nkosi','Ms. Tau','Mr. Segoe','Mrs. Gaone','Mr. Modise','Ms. Kgari','Mr. Molefi','Mrs. Phiri','Mr. Seretse','Mrs. Kgomo','Mr. Motswedi','Ms. Molaudi','Mr. Keabetswe'];
    const occupations = ['Business Owner','Civil Servant','Teacher','Nurse','Engineer'];
    const rels = ['father','mother','guardian','grandparent','other'];
    
    parentNames.forEach(n => {
      this.parents.push({
        id: this._pid++, parent_name: n,
        relation_with_child: rels[Math.floor(rp() * 5)],
        phone: `+267 7${Math.ceil(rp() * 9)} ${Math.floor(rp() * 900 + 100)} ${Math.floor(rp() * 900 + 100)}`,
        mobile: '', email: `${n.split(' ').pop()!.toLowerCase()}@gmail.com`,
        city: 'Gaborone', occupation: occupations[Math.floor(rp() * 5)],
        employer: '', notes: '',
      });
    });

    // Seed students
    const rs = rng(42);
    FORMS.forEach(form => {
      const divs = DIVS[form];
      const cnt = form.match(/[67]/) ? 6 : 16;
      for (let i = 0; i < cnt; i++) {
        const fn = FN[Math.floor(rs() * 20)], ln = LN[Math.floor(rs() * 20)];
        const dv = divs[Math.floor(rs() * divs.length)];
        const yr = 2026 - (parseInt(form.split(' ')[1]) + 11);
        const par = this.parents[Math.floor(rs() * this.parents.length)];
        this.students.push({
          id: this._sid++, student_full_name: `${fn} ${ln}`,
          enrollment_number: `STU${String(this._eno++).padStart(4, '0')}`,
          gender: rs() > .5 ? 'male' : 'female',
          date_of_birth: `${yr}-${String(Math.ceil(rs() * 12)).padStart(2, '0')}-${String(Math.ceil(rs() * 28)).padStart(2, '0')}`,
          blood_group: BLOOD_GROUPS[Math.floor(rs() * 8)],
          form, div_letter: dv,
          division: `${form.replace('Form ', '')}${dv}`,
          state: rs() > .05 ? 'active' : 'suspended',
          parent_id: par.id, parent_name: par.parent_name,
          mobile: `+267 7${Math.ceil(rs() * 9)} ${Math.floor(rs() * 900 + 100)} ${Math.floor(rs() * 900 + 100)}`,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@student.lkc.ac.bw`,
          city: 'Gaborone', medical_notes: '', notes: '',
        });
      }
    });

    // Seed assignments
    const dFut = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString(); };
    const dPast = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString(); };

    const seedAssignments: Assignment[] = [
      {id:this._aid++,title:'Python Programming Exercise 1',description:'Write a Python program that accepts a list of student marks and computes the mean, median, and mode. Include error handling for empty lists and non-numeric inputs.\n\nRequirements:\n- Use functions for each calculation\n- Include docstrings\n- Demonstrate with sample data',subject:'Computer Science',form:'Form 5',division:null,teacher_id:1,teacher_name:'Ms. Makoni',due_date:dFut(5),total_marks:50,submission_type:'file',allow_late:false,state:'published'},
      {id:this._aid++,title:'Algebra: Quadratic Equations',description:'Complete exercises 5.1 to 5.4 from the textbook. Show all working. Scan or photograph your work clearly.',subject:'Mathematics',form:'Form 3',division:'3A',teacher_id:3,teacher_name:'Ms. Madzivanyika',due_date:dFut(2),total_marks:30,submission_type:'file',allow_late:true,state:'published'},
      {id:this._aid++,title:'Essay: Climate Change in Botswana',description:"Write a 500-800 word essay on the effects of climate change on Botswana's environment and economy. Use at least 3 references. Submit as a typed document.",subject:'Geography',form:'Form 4',division:null,teacher_id:6,teacher_name:'Mr. Dube',due_date:dFut(10),total_marks:40,submission_type:'both',allow_late:false,state:'published'},
      {id:this._aid++,title:'ICT: Spreadsheet Project',description:'Create a spreadsheet to manage a fictional school timetable. Use formulas, conditional formatting, and charts. Save as .xlsx and submit.',subject:'ICT',form:'Form 2',division:null,teacher_id:9,teacher_name:'Ms. Nkosi',due_date:dPast(2),total_marks:60,submission_type:'file',allow_late:true,state:'published'},
      {id:this._aid++,title:'Term 1 Literature Review',description:'Review the assigned novel chapters 1-6. Write a character analysis for the main protagonist (300-400 words). Focus on character development and literary devices used.',subject:'English Language',form:'Form 5',division:'5A',teacher_id:4,teacher_name:'Mr. Banda',due_date:dPast(5),total_marks:25,submission_type:'text',allow_late:false,state:'closed'},
      {id:this._aid++,title:'Financial Statements Analysis',description:'Using the provided balance sheet data, calculate key financial ratios and write a brief analysis report. Template attached.',subject:'Accounts',form:'Form 6',division:null,teacher_id:5,teacher_name:'Ms. Sithole',due_date:dFut(7),total_marks:80,submission_type:'file',allow_late:false,state:'draft'},
    ];
    this.assignments.push(...seedAssignments);
    this._aid = seedAssignments.length + 1;

    // Seed submissions for assignment 1
    const ra = rng(55);
    const f5Students = this.students.filter(s => s.form === 'Form 5').slice(0, 10);
    f5Students.forEach(s => {
      if (ra() > 0.3) {
        const subDate = new Date(); subDate.setHours(subDate.getHours() - Math.floor(ra() * 48));
        const isGraded = ra() > 0.5;
        this.submissions.push({
          id: this._subid++, assignment_id: 1, student_id: s.id,
          student_name: s.student_full_name, student_enrollment: s.enrollment_number,
          student_div: s.division, submitted_at: subDate.toISOString(),
          submission_text: '', submission_file: `submission_${s.enrollment_number}.pdf`,
          is_late: false, status: isGraded ? 'graded' : 'submitted',
          obtained_marks: isGraded ? Math.floor(ra() * 30 + 18) : null,
          teacher_comment: isGraded ? 'Good work, well-structured code.' : '',
          graded_by: isGraded ? 'Ms. Makoni' : null,
        });
      }
    });

    // Seed submissions for assignment 4
    const f2Students = this.students.filter(s => s.form === 'Form 2').slice(0, 8);
    f2Students.forEach(s => {
      if (ra() > 0.2) {
        const subDate = new Date(); subDate.setDate(subDate.getDate() - Math.floor(ra() * 3));
        const isGraded = ra() > 0.4;
        this.submissions.push({
          id: this._subid++, assignment_id: 4, student_id: s.id,
          student_name: s.student_full_name, student_enrollment: s.enrollment_number,
          student_div: s.division, submitted_at: subDate.toISOString(),
          submission_text: '', submission_file: `spreadsheet_${s.enrollment_number}.xlsx`,
          is_late: true, status: isGraded ? 'graded' : 'late',
          obtained_marks: isGraded ? Math.floor(ra() * 40 + 15) : null,
          teacher_comment: isGraded ? 'Good spreadsheet design.' : '',
          graded_by: isGraded ? 'Ms. Nkosi' : null,
        });
      }
    });

    // Seed exam results
    const rr = rng(99);
    this.students.filter(s => s.form === 'Form 1').forEach(s => {
      this.results.push({ student: s.student_full_name, sid: s.id, exam: 'Mid-Term 1 2026', subject: 'Computer Science', obtained: Math.floor(rr() * 63 + 35), max: 100, teacher: 'Ms. Makoni', state: 'done' });
      this.results.push({ student: s.student_full_name, sid: s.id, exam: 'Mid-Term 1 2026', subject: 'Mathematics', obtained: Math.floor(rr() * 65 + 30), max: 100, teacher: 'Ms. Madzivanyika', state: 'confirmed' });
    });

    // Seed attendance
    const ratt = rng(77);
    this.students.slice(0, 25).forEach(s => {
      for (let d = 0; d < 5; d++) {
        const dt = new Date(); dt.setDate(dt.getDate() - d);
        if (dt.getDay() === 0 || dt.getDay() === 6) continue;
        const r = ratt();
        this.attendance.push({
          student: s.student_full_name, date: dt.toISOString().split('T')[0],
          state: r > .1 ? 'present' : r > .05 ? 'absent' : 'late',
          form: s.form, div: s.division,
        });
      }
    });
  }
}

export const DB = new Database();
export const DEMO_TEACHER = TEACHERS[0];
export const DEMO_STUDENT = DB.students.find(s => s.form === 'Form 5' && s.state === 'active')!;

// Helpers
export const G = (p: number) => p >= 90 ? 'A*' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : p >= 40 ? 'E' : 'U';
export const P = (o: number, m: number) => m > 0 ? Math.round(o / m * 100) : 0;
export const X = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const cap = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function badgeClass(st: string) {
  const C: Record<string, string> = {
    active:'green',graduated:'blue',transferred:'yellow',suspended:'red',inactive:'gray',
    done:'green',confirmed:'blue',ongoing:'yellow',draft:'gray',cancelled:'red',
    present:'green',absent:'red',late:'yellow',excused:'blue',on_leave:'yellow',
    published:'green',closed:'gray',submitted:'blue',graded:'purple',overdue:'red',
    not_submitted:'gray',file:'blue',text:'yellow',both:'orange',returned:'yellow',
  };
  return C[st] || 'gray';
}

export function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function isPastDue(a: Assignment) { return new Date() > new Date(a.due_date); }
export function daysLeft(a: Assignment) { return Math.ceil((new Date(a.due_date).getTime() - new Date().getTime()) / 86400000); }

export function getMySubmission(aid: number) {
  return DB.submissions.find(s => s.assignment_id === aid && s.student_id === DEMO_STUDENT?.id);
}
export function getMyAssignments() {
  if (!DEMO_STUDENT) return [];
  return DB.assignments.filter(a => {
    if (a.state === 'draft') return false;
    if (a.form !== DEMO_STUDENT.form) return false;
    if (a.division && a.division !== DEMO_STUDENT.division) return false;
    return true;
  });
}

export function gradeChipClass(g: string) {
  const c: Record<string, string> = {'A*':'gas','A':'ga','B':'gb','C':'gc','D':'gd','E':'ge','U':'gu'};
  return c[g] || 'gu';
}
