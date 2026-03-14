import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const log: string[] = [];
    const addLog = (msg: string) => { log.push(msg); console.log(msg); };

    // Helper to create user + profile + role
    async function createUser(email: string, password: string, fullName: string, role: string) {
      const { data: user, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) {
        if (error.message?.includes("already been registered")) {
          // Get existing user
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const existing = users?.find((u: any) => u.email === email);
          if (existing) {
            // Ensure role exists
            await supabase.from("user_roles").upsert({ user_id: existing.id, role }, { onConflict: "user_id,role" });
            return existing.id;
          }
          return null;
        }
        addLog(`Error creating ${email}: ${error.message}`);
        return null;
      }
      if (user?.user) {
        await supabase.from("user_roles").insert({ user_id: user.user.id, role });
        return user.user.id;
      }
      return null;
    }

    // ==================== STEP 1: SUBJECTS ====================
    addLog("Creating subjects...");
    const subjectsData = [
      { name: "Computer Science", code: "CS1", max_marks: 100, min_marks: 50 },
      { name: "Maths", code: "MT1", max_marks: 100, min_marks: 50 },
      { name: "Economics", code: "BS3" },
      { name: "Business", code: "BS1" },
      { name: "Accounts", code: "BS2" },
      { name: "Enterprise", code: "BS4" },
      { name: "Art & Design", code: "CR1" },
      { name: "Design & Technology", code: "CR2" },
      { name: "Geography", code: "HM1" },
      { name: "History", code: "HM2" },
      { name: "Global Perspectives", code: "HM3" },
      { name: "Travel and Tourism", code: "HM4" },
      { name: "Psychology", code: "HM5" },
      { name: "ICT", code: "CS2", max_marks: 100 },
      { name: "French", code: "LG5" },
      { name: "English Literature", code: "LG3" },
      { name: "English Second Language", code: "LG2" },
      { name: "English Language", code: "LG1" },
      { name: "Setswana", code: "LG4" },
      { name: "Chinese", code: "LG6" },
      { name: "Add Maths", code: "MT2" },
      { name: "Further Mathematics", code: "MT3" },
      { name: "Physical Education", code: "PE1" },
      { name: "Physics", code: "SC2" },
      { name: "Combined Science", code: "SC1" },
      { name: "Chemistry", code: "SC3" },
      { name: "Biology", code: "SC4" },
      { name: "Agriculture", code: "SC5" },
    ];

    for (const s of subjectsData) {
      await supabase.from("subjects").upsert(s, { onConflict: "code" });
    }
    addLog(`Created ${subjectsData.length} subjects`);

    // ==================== STEP 2: ADMIN ====================
    addLog("Creating admin user...");
    const adminId = await createUser("admin@lkc.ac.bw", "password", "LKC Administrator", "admin");
    addLog(`Admin created: ${adminId ? "OK" : "FAILED"}`);

    // ==================== STEP 3: TEACHERS ====================
    addLog("Creating teachers...");
    const teachersData = [
      { name: "Ms Irene T Tafirei", code: "BITT", dept: "Teaching / Business", email: "", phone: "123456", date: "2025-01-01" },
      { name: "Ms T Munodawafa", code: "BTM", dept: "Teaching / Business", email: "traceymunos@gmail.com", phone: "12345666", date: "2025-01-01" },
      { name: "Mrs M Katai", code: "BMK", dept: "Teaching / Business", email: "", phone: "1234567", date: "2025-01-01" },
      { name: "Ms T N. Muchedzi", code: "BTNM", dept: "Teaching / Business", email: "tmuchedzinyambo@gmail.com", phone: "1234567", date: "2025-01-01" },
      { name: "Mr P Sakala", code: "BPS", dept: "Teaching / Business", email: "petersakala@gmail.com", phone: "2123445", date: "2025-01-01" },
      { name: "Mr C Mutero", code: "BCM", dept: "Teaching / Business", email: "muterotakunda38@gmail.com", phone: "1223324", date: "2025-01-01" },
      { name: "Ms G Gasha", code: "BGG", dept: "Teaching / Business", email: "", phone: "12345", date: "2025-01-01" },
      { name: "Ms D Modimakwane", code: "BDM", dept: "Teaching / Business", email: "", phone: "12345", date: "2025-01-01" },
      { name: "Mr H Sibanda", code: "CHS", dept: "Teaching / Creatives", email: "mqamdabantu@gmail.com", phone: "123456", date: "2025-01-01" },
      { name: "Ms M Gordon", code: "CMG", dept: "Teaching / Creatives", email: "malexandring@yahoo.co.uk", phone: "1234321", date: "2025-01-01" },
      { name: "Ms Z Magadi", code: "HZM", dept: "Teaching / Humanities", email: "", phone: "1234543", date: "2026-01-13" },
      { name: "Mr Anderson Dube", code: "HAD", dept: "Teaching / Humanities", email: "andersondube2023@gmail.com", phone: "123432", date: "2025-01-01" },
      { name: "Ms Evelyn Mpofu", code: "HEM", dept: "Teaching / Humanities", email: "evempofu1992@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Mr P Muzeza", code: "HPM", dept: "Teaching / Humanities", email: "muzezapeter@gmail.com", phone: "123432", date: "2025-01-01" },
      { name: "Dr J Ramsay", code: "HJM", dept: "Teaching / Humanities", email: "jefframsayeots@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Dr F Mutenheri", code: "HFM", dept: "Teaching / Humanities", email: "feddiousmutenheri@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Mr Theo Wame Serefhete", code: "ITWS", dept: "Teaching / IT", email: "theoserefhete32@gmail.com", phone: "12321", date: "2025-01-01" },
      { name: "Mr Tapiwa Norman Chivorese", code: "ITNC", dept: "Teaching / IT", email: "tapiwachivorese95@gmail.com", phone: "12345678", date: "2025-01-01" },
      { name: "Ms F Madzivanyika", code: "IFM", dept: "Teaching / IT", email: "madzivanyikafadzayi@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Mr Kendra Tafadzwa Makoni", code: "IKTM", dept: "Teaching / IT", email: "makonikendrat@lkc.ac.bw", phone: "12345432", date: "2025-01-01" },
      { name: "Ms Natasha Tsetse", code: "LNT", dept: "Teaching / Languages", email: "natachamudongo@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Ms Obakeng Banyatsang", code: "LOB", dept: "Teaching / Languages", email: "msbanyatsangob@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Mr Takudzwa Rodney Chambwera", code: "LTRC", dept: "Teaching / Languages", email: "rodneychambwera@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Ms Precious Nozithulele Ngwenya", code: "LPNN", dept: "Teaching / Languages", email: "preengwen@gmail.com", phone: "12345678", date: "2025-01-01" },
      { name: "Mr P Tau", code: "LPT", dept: "Teaching / Languages", email: "peterisatau@gmail.com", phone: "1234567", date: "2025-01-01" },
      { name: "Ms T Tumotumo", code: "LTT", dept: "Teaching / Languages", email: "tumisangtumotumo@gmail.com", phone: "12345678", date: "2025-01-01" },
      { name: "Ms M Dove-Muller", code: "LMDM", dept: "Teaching / Languages", email: "mdove@lkc.ac.bw", phone: "123456", date: "2025-01-01" },
      { name: "Mr J Wilson", code: "LJW", dept: "Teaching / Languages", email: "mrwilsonlkc@gmail.com", phone: "12345", date: "2025-01-01" },
      { name: "Ms Alex", code: "LLA", dept: "Teaching / Languages", email: "", phone: "1234321", date: "2025-01-01" },
      { name: "Ms V. Murugesan", code: "MVM", dept: "Teaching / Maths", email: "viji76senthil@gmail.com", phone: "12345", date: "2025-01-01" },
      { name: "Mr K Othomile", code: "MKO", dept: "Teaching / Maths", email: "", phone: "123432", date: "2025-01-01" },
      { name: "Mrs C Dewah", code: "MCD", dept: "Teaching / Maths", email: "charitydewah@yahoo.co.uk", phone: "123421", date: "2025-01-01" },
      { name: "Ms E Sorofa", code: "MES", dept: "Teaching / Maths", email: "sorofaes@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Mr K Adu", code: "MKA", dept: "Teaching / Maths", email: "advancedlevel@lkc.ac.bw", phone: "123456", date: "2025-01-01" },
      { name: "Mr M Chandomba", code: "MMC", dept: "Teaching / Maths", email: "chandomba@gmail.com", phone: "1234567", date: "2025-01-01" },
      { name: "Mr R Nyika", code: "MRN", dept: "Teaching / Maths", email: "robert.nyika@yahoo.com", phone: "1234564", date: "2025-01-01" },
      { name: "Mr R Dhaliwal", code: "PRD", dept: "Teaching / PE", email: "dhaliwalraj59@yahoo.com", phone: "12345", date: "2025-01-01" },
      { name: "Mr M Ndebele", code: "PMN", dept: "Teaching / PE", email: "mfolosi@gmail.com", phone: "12345432", date: "2025-01-01" },
      { name: "Mr Samuel Ndebele", code: "SSN", dept: "Teaching / Sciences", email: "samuelndebele2424@gmail.com", phone: "1234532", date: "2025-01-01" },
      { name: "Mr Daniel Kadembo", code: "SDK", dept: "Teaching / Sciences", email: "dk70elwin@gmail.com", phone: "123454321", date: "2025-01-01" },
      { name: "Ms Khumoetsile Gorata Morapedi", code: "SKGM", dept: "Teaching / Sciences", email: "khumoetsilemorap@gmail.com", phone: "1232123", date: "2025-01-01" },
      { name: "Ms Nomathamsanqa Ncube", code: "SNN", dept: "Teaching / Sciences", email: "uminathiubenathi@gmail.com", phone: "234321", date: "2025-01-01" },
      { name: "Mr K Murombedzi", code: "SKM", dept: "Teaching / Sciences", email: "kudavjm@gmail.com", phone: "1234321", date: "2025-01-01" },
      { name: "Mr T. L. Mboto", code: "STLM", dept: "Teaching / Sciences", email: "takumboto@gmail.com", phone: "12345432", date: "2025-01-01" },
      { name: "Mr C W Ndlovu", code: "SCWN", dept: "Teaching / Sciences", email: "calvinwhiski2101@gmail.com", phone: "123432", date: "2025-01-01" },
      { name: "Ms A Mandiudza", code: "SAM", dept: "Teaching / Sciences", email: "abyzeph@gmal.com", phone: "1234321234", date: "2025-01-01" },
      { name: "Mr T Maeresera", code: "STM", dept: "Teaching / Sciences", email: "tinierimaeresera@yahoo.co.uk", phone: "1234321234", date: "2025-01-01" },
      { name: "Ms L Munyeki", code: "BLM", dept: "Teaching / Business", email: "", phone: "12345", date: "2026-01-13" },
      { name: "Mr Jones", code: "CAJ", dept: "Teaching / Creatives", email: "", phone: "1223", date: "2026-01-13" },
      { name: "Mr A Mathodi", code: "CAM", dept: "Teaching / Creatives", email: "", phone: "36790", date: "2025-08-13" },
      { name: "Mr K Bokamoso", code: "HKB", dept: "Teaching / Humanities", email: "", phone: "69900", date: "2026-01-13" },
      { name: "Ms P Gaobope", code: "IPG", dept: "Teaching / IT", email: "", phone: "45678", date: "2026-01-13" },
      { name: "Mrs A Benjamin", code: "LAB", dept: "Teaching / Languages", email: "", phone: "567679", date: "2026-01-13" },
      { name: "Ms K Modimoofile", code: "MKM", dept: "Teaching / Maths", email: "", phone: "54354876", date: "2026-01-13" },
      { name: "Mrs Barrot", code: "MBB", dept: "Teaching / Maths", email: "", phone: "9797987", date: "2026-01-13" },
      { name: "Mr P Ketlametswe", code: "SPK", dept: "Teaching / Sciences", email: "", phone: "766689", date: "2026-01-13" },
      { name: "Ms K Kgosikwena", code: "SKK", dept: "Teaching / Sciences", email: "", phone: "4654875487", date: "2026-01-13" },
    ];

    let teacherCount = 0;
    const teacherIdMap: Record<string, string> = {}; // code -> teacher table id

    for (const t of teachersData) {
      // Generate email for auth if not provided
      const firstName = t.name.replace(/^(Mr|Ms|Mrs|Dr)\s+/i, "").split(" ")[0].toLowerCase();
      const authEmail = t.email || `${firstName}.${t.code.toLowerCase()}@teacher.lkc.ac.bw`;
      
      const userId = await createUser(authEmail, "password", t.name, "teacher");
      
      if (userId) {
        const { data: teacher } = await supabase.from("teachers").upsert({
          user_id: userId,
          name: t.name,
          code: t.code,
          department: t.dept,
          email: authEmail,
          phone: t.phone,
          joining_date: t.date,
          state: "active",
        }, { onConflict: "user_id" }).select("id").single();
        
        if (teacher) {
          teacherIdMap[t.code] = teacher.id;
          teacherCount++;
        }
      }
    }
    addLog(`Created ${teacherCount} teachers`);

    // ==================== STEP 4: SUBJECT-TEACHER MAPPINGS ====================
    addLog("Creating subject-teacher mappings...");
    const subjectTeacherMap: Record<string, string[]> = {
      "CS1": [],
      "MT1": ["MKA"],
      "BS3": ["BCM", "BDM", "BITT"],
      "BS1": ["BCM", "BPS", "BMK", "BDM", "BGG", "BLM", "BTM", "BTNM"],
      "BS2": ["BPS", "BMK", "BTNM"],
      "BS4": ["BMK", "BTM", "BTNM"],
      "CR1": ["CHS", "CAJ"],
      "CR2": ["CAM", "CMG"],
      "HM1": ["HFM", "HAD", "HKB", "HEM", "HZM"],
      "HM2": ["HJM", "LJW", "HPM", "LPT", "LTRC", "HZM"],
      "HM3": ["HFM", "HAD", "HPM"],
      "HM4": ["HPM", "HEM"],
      "HM5": ["HPM"],
      "CS2": ["IKTM", "IFM", "ITWS", "ITNC"],
      "LG5": ["LNT", "LOB"],
      "LG3": ["LJW", "LTRC", "LMDM", "LNT", "LPNN"],
      "LG2": ["LOB"],
      "LG1": ["LJW", "LTRC", "LNT", "LOB", "LPNN", "LTT"],
      "LG4": ["LPT"],
      "MT2": ["MCD", "MVM"],
      "MT3": ["MRN"],
      "PE1": ["PMN", "PRD"],
      "SC2": ["SCWN", "SDK", "SSN"],
      "SC1": ["SCWN", "SPK", "SSN", "STLM", "SKK", "SKGM"],
      "SC3": ["SDK", "SKM", "SKGM"],
      "SC4": ["STM", "STLM", "SAM", "SNN"],
      "SC5": ["STM", "STLM"],
    };

    // Get subject IDs
    const { data: allSubjects } = await supabase.from("subjects").select("id, code");
    const subjectIdMap: Record<string, string> = {};
    allSubjects?.forEach((s: any) => { subjectIdMap[s.code] = s.id; });

    for (const [subCode, teacherCodes] of Object.entries(subjectTeacherMap)) {
      const subId = subjectIdMap[subCode];
      if (!subId) continue;
      for (const tCode of teacherCodes) {
        const tId = teacherIdMap[tCode];
        if (!tId) continue;
        await supabase.from("subject_teachers").upsert(
          { subject_id: subId, teacher_id: tId },
          { onConflict: "subject_id,teacher_id" }
        );
      }
    }
    addLog("Subject-teacher mappings created");

    // ==================== STEP 5: STUDENTS (batch) ====================
    addLog("Creating students... (this takes a while)");
    
    // We'll create student records WITHOUT auth accounts first (too many to create auth for all)
    // Auth accounts will be created on-demand or we create them in batches
    const studentsRaw = STUDENTS_DATA; // defined below
    let studentCount = 0;

    for (const s of studentsRaw) {
      const firstName = s.full_name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
      const authEmail = s.email && s.email.includes("@") ? s.email : `${firstName}.${s.enrollment}@student.lkc.ac.bw`;
      
      // Create auth user
      const userId = await createUser(authEmail, "password", s.full_name, "student");
      
      if (userId) {
        await supabase.from("students").upsert({
          user_id: userId,
          enrollment_number: s.enrollment,
          full_name: s.full_name,
          gender: s.gender || null,
          date_of_birth: s.dob || null,
          nationality: s.nationality || null,
          form: s.form,
          state: "active",
          admission_date: s.admission_date || null,
          academic_year: "2026",
          email: authEmail,
        }, { onConflict: "user_id" });
        studentCount++;
      }
      
      // Log progress every 50 students
      if (studentCount % 50 === 0) addLog(`  ...${studentCount} students processed`);
    }
    addLog(`Created ${studentCount} students total`);

    // ==================== STEP 6: PARENTS ====================
    addLog("Creating parents from Form 1 data...");
    let parentCount = 0;
    
    // Get all students to link parents
    const { data: allStudents } = await supabase.from("students").select("id, full_name");
    const studentNameMap: Record<string, string> = {};
    allStudents?.forEach((s: any) => { studentNameMap[s.full_name] = s.id; });

    for (const p of PARENTS_DATA) {
      if (!p.name || p.name === "Parent1" || p.name === "Parent 2" || p.name === "Parent3") continue;
      const firstName = p.name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
      const authEmail = p.email && p.email.includes("@") ? p.email : `${firstName}.parent@parent.lkc.ac.bw`;

      const userId = await createUser(authEmail, "password", p.name, "parent");
      if (userId) {
        const { data: parent } = await supabase.from("parents").upsert({
          user_id: userId,
          name: p.name,
          relation: p.relation || null,
          phone: p.phone || null,
          email: authEmail,
        }, { onConflict: "user_id" }).select("id").single();

        // Link to student
        if (parent && p.student_name) {
          const studentId = studentNameMap[p.student_name];
          if (studentId) {
            await supabase.from("parent_students").upsert(
              { parent_id: parent.id, student_id: studentId },
              { onConflict: "parent_id,student_id" }
            );
          }
        }
        parentCount++;
      }
    }
    addLog(`Created ${parentCount} parents`);

    // ==================== DONE ====================
    addLog("✅ Seeding complete!");

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ==================== STUDENT DATA ====================
const STUDENTS_DATA = [
  // Form 1 students
  {enrollment:"260001",full_name:"Anashe Geneva Njenga",gender:"Female",dob:"2013-04-10",nationality:"Kenyan",form:"Form 1",admission_date:"2026-01-21",email:"AGN@gmail.com"},
  {enrollment:"260002",full_name:"Mofenyi Wayne Marape",gender:"Male",dob:"2012-11-23",nationality:"Botswana",form:"Form 1",admission_date:"2026-01-16",email:"MWM@gmail.com"},
  {enrollment:"260003",full_name:"Yosi Senwelo Molapisi",gender:"Female",dob:"2013-05-28",nationality:"Motswana",form:"Form 1",admission_date:"2026-01-14",email:"YSM@gmail.com"},
  {enrollment:"260004",full_name:"Astile Seitshiro",gender:"Male",dob:"2013-06-06",nationality:"Motswana",form:"Form 1",admission_date:"2026-01-08",email:"AS@gmail.com"},
  {enrollment:"260005",full_name:"Lailah Tlhompho Keorang",gender:"Female",dob:"2013-05-18",nationality:"Motswana",form:"Form 1",admission_date:"2025-11-26",email:"LTK@gmail.com"},
  {enrollment:"260006",full_name:"Abotlhe Legofi Morris",gender:"Male",dob:"2012-12-22",nationality:"Motswana",form:"Form 1",admission_date:"2025-12-18",email:"ALM@gmail.com"},
  {enrollment:"260007",full_name:"Letlhoa Tsimanyane",gender:"Female",dob:"2013-01-19",nationality:"Motswana",form:"Form 1",admission_date:"2025-05-02",email:"LT@gmail.com"},
  {enrollment:"260008",full_name:"Anele Trish Mmeseletsi",gender:"Female",dob:"2013-04-28",nationality:"Motswana",form:"Form 1",admission_date:"2025-08-20",email:"ATM@gmail.com"},
  {enrollment:"260009",full_name:"Botlhe Phoebe Ntefo",gender:"Female",dob:"2012-10-22",nationality:"Motswana",form:"Form 1",admission_date:"2025-12-12",email:"BPN@gmail.com"},
  {enrollment:"260010",full_name:"Latisha Ndibo Dima",gender:"Female",dob:"2012-10-24",nationality:"Motswana",form:"Form 1",admission_date:"2025-12-29",email:"lnd@gmail.com"},
  // Form 2 (sample)
  {enrollment:"250001",full_name:"Adrianna Thomas",gender:"Female",dob:"2013-02-24",nationality:"Indian",form:"Form 2",admission_date:"2025-01-14",email:"test@gmail.com"},
  {enrollment:"250002",full_name:"Ajmal Mohamed Arieff",gender:"Male",dob:"2011-12-24",nationality:"Motswana",form:"Form 2",admission_date:"2025-01-14",email:""},
  {enrollment:"250003",full_name:"Amantsi Bushe Pelaelo",gender:"Male",dob:"2012-02-23",nationality:"Motswana",form:"Form 2",admission_date:"2025-01-14",email:""},
  {enrollment:"250004",full_name:"Amolemo Lil Angel Pule",gender:"Female",dob:"2012-09-16",nationality:"Motswana",form:"Form 2",admission_date:"2025-01-14",email:""},
  {enrollment:"250005",full_name:"Ditso Oreratile Wayne Digobe",gender:"Male",dob:"2012-09-26",nationality:"Motswana",form:"Form 2",admission_date:"2025-01-14",email:""},
  // Form 3 (sample)
  {enrollment:"250451",full_name:"Abotle Sarah Ngakaagae",gender:"Female",dob:"2011-04-25",nationality:"Motswana",form:"Form 3",admission_date:null,email:""},
  {enrollment:"250452",full_name:"Ateng Rorang Raditloko",gender:"Male",dob:"2012-05-07",nationality:"Motswana",form:"Form 3",admission_date:null,email:""},
  {enrollment:"250453",full_name:"Bob Jnr Siakalangu",gender:"Male",dob:"2011-09-10",nationality:"Zimbabwean",form:"Form 3",admission_date:null,email:""},
  // Form 4 (sample)
  {enrollment:"250045",full_name:"Amutjilani Botlhale Mokgethi",gender:"Female",dob:"2009-10-25",nationality:"Motswana",form:"Form 4",admission_date:"2023-01-24",email:"am@lkc.ac.bw"},
  {enrollment:"250046",full_name:"Atang Zwao Maganu",gender:"Male",dob:"2009-01-01",nationality:"Motswana",form:"Form 4",admission_date:"2023-01-24",email:"azm@lkc.ac.bw"},
  {enrollment:"250047",full_name:"Gaofetoge Molefe",gender:"Male",dob:"2010-08-11",nationality:"Motswana",form:"Form 4",admission_date:"2023-01-24",email:"gm@lkc.ac.bw"},
  // Form 6 (sample)
  {enrollment:"250121",full_name:"Abaleng Chantal Tsetse",gender:"Female",dob:"2010-04-17",nationality:"Motswana",form:"Form 6",admission_date:"2024-01-16",email:""},
  {enrollment:"250122",full_name:"Ana Khalipa Rocha Carmona",gender:"Female",dob:"2009-05-04",nationality:"Motswana",form:"Form 6",admission_date:"2024-01-16",email:""},
  // Form 7 (sample)
  {enrollment:"250026",full_name:"Chikanda Mbuya Wapa",gender:"Male",dob:"2006-12-06",nationality:"Motswana",form:"Form 7",admission_date:"2023-01-10",email:""},
  {enrollment:"250027",full_name:"Daniel Thobo Liam",gender:"Male",dob:"2007-06-24",nationality:"Motswana",form:"Form 7",admission_date:"2021-09-15",email:""},
];

// ==================== PARENT DATA ====================
const PARENTS_DATA = [
  {name:"Antony Njenga",relation:"Father",phone:"14709194093",email:"njengaantony@gmail.com",student_name:"Anashe Geneva Njenga"},
  {name:"Marape Marape",relation:"Father",phone:"76641545",email:"m.marape@gmail.com",student_name:"Mofenyi Wayne Marape"},
  {name:"Kabo Molapisi",relation:"Father",phone:"72726655",email:"kbmolapisi80@gmail.com",student_name:"Yosi Senwelo Molapisi"},
  {name:"Kamogelo Seitshiro",relation:"Father",phone:"72678890",email:"bseitshiro1977@gmail.com",student_name:"Astile Seitshiro"},
  {name:"Letsomane Keorang",relation:"Father",phone:"71726848",email:"letskeorang79@gmail.com",student_name:"Lailah Tlhompho Keorang"},
  {name:"Keletso Morris",relation:"Mother",phone:"73041639",email:"kmatengemorris@gmail.com",student_name:"Abotlhe Legofi Morris"},
  {name:"Tapologo Tsimanyane",relation:"",phone:"71665929",email:"ttsimanyane@gmail.com",student_name:"Letlhoa Tsimanyane"},
  {name:"Modirinyana Mmeseletsi",relation:"Father",phone:"75691790",email:"modmmes978@gmail.com",student_name:"Anele Trish Mmeseletsi"},
  {name:"Ookeditse Ntefo",relation:"Mother",phone:"73215636",email:"",student_name:"Botlhe Phoebe Ntefo"},
  {name:"Chedza Sethunya Dima",relation:"",phone:"",email:"",student_name:"Latisha Ndibo Dima"},
];
