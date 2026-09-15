/* =========================================================
   1. CORE DATA — DepEd-aligned mock data
   ========================================================= */

const GRADE_ORDER = ["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];

document.documentElement.classList.add("auth-checking");

// DepEd Key Stage groupings: JHS (Grades 7–10) falls under Key Stage 3 of the
// MATATAG Curriculum; SHS (11–12) continues under the 2016 SHS Curriculum.
function keyStageOf(grade){
  if(["Grade 7","Grade 8","Grade 9","Grade 10"].includes(grade)) return "Key Stage 3";
  return "Senior High School";
}

function tierOf(grade){
  if(["Grade 7","Grade 8","Grade 9","Grade 10"].includes(grade)) return "JHS";
  return "SHS";
}
function subTierOf(grade){ return tierOf(grade); }

// Default learning areas per grade level (DepEd term: "Learning Area", not
// "subject"). This is fallback/reference data only — used when a School
// Year + Term + Grade Level has no Subject records yet (so the timetable
// preview is never empty) and to populate the subject-duration autocomplete
// on the Scheduling Rules page. The Subjects page (+ Add Subject) is the
// school's actual, editable academic reference. Grades 7–10 reflect the
// MATATAG Curriculum (DepEd Order No. 010, s. 2024), fully phased in as of
// SY 2026–2027. Grades 11–12 continue under the 2016 SHS Curriculum pending
// a separate MATATAG issuance for Senior High School.
const CURRICULUM = {
  "Grade 7": ["Filipino","English","Mathematics","Science","Araling Panlipunan","MAPEH","Values Education","Technology and Livelihood Education (TLE)"],
  "Grade 8": ["Filipino","English","Mathematics","Science","Araling Panlipunan","MAPEH","Values Education","Technology and Livelihood Education (TLE)"],
  "Grade 9": ["Filipino","English","Mathematics","Science","Araling Panlipunan","MAPEH","Values Education","Technology and Livelihood Education (TLE)"],
  "Grade 10": ["Filipino","English","Mathematics","Science","Araling Panlipunan","MAPEH","Values Education","Technology and Livelihood Education (TLE)"],
  "Grade 11": ["Oral Communication","Reading and Writing","21st Century Literature from the Phil. and the World","General Mathematics","Earth and Life Science","Personal Development","Physical Education and Health","Empowerment Technologies"],
  "Grade 12": ["Statistics and Probability","Physical Science","Understanding Culture, Society and Politics","Practical Research 1","Practical Research 2","Physical Education and Health","Filipino sa Piling Larang"]
};

// Specialized/elective subjects per SHS strand — reference data for the
// same fallback/autocomplete purposes as CURRICULUM above.
const STRAND_SUBJECTS = {
  // Technical-Professional (TVL) elective menu.
  "TechPro": [
    "Computer Systems Servicing (NC II)","Housekeeping (NC II)"
  ],
  // General Academic-Track (ACADS/GAS-style) elective menu.
  "ACADS": [
    "Organization and Management","Applied Economics",
    "Entrepreneurship","Work Immersion"
  ],
  // Combined offering for sections that draw electives from both menus.
  "Both": [
    "Computer Systems Servicing (NC II)","Housekeeping (NC II)",
    "Organization and Management","Applied Economics",
    "Entrepreneurship","Work Immersion"
  ],
  // Stand-alone elective subjects not tied to any track. Add/rename/remove
  // "Elective"-type subjects for Grade 11/12 directly on the Subjects page.
  "Electives": [
    "General Elective"
  ]
};

// Sections — no sample/demo records. The Admin adds real Sections on the
// Sections page; SECTIONS_ALL below starts empty and stays that way until
// the Admin (or a legitimate CSV import) creates one.
const SECTIONS = [];

// The selectable Track/Strand options for a Sr. High section. Kept separate
// from STRAND_SUBJECTS so curriculum-only entries (like "Electives", a
// subject bank not tied to any section) don't show up as a track choice.
const TRACK_LIST = ["TechPro", "ACADS", "Both"];

/* =========================================================
   1E. SECTION/SUBJECT PROGRAM CLASSIFICATION + SHS AM/PM SHIFTING
   - Every Section has a Section Type: "Regular" or "Special Program".
   - Every Subject has a Program: "Regular" or "Special Program".
   - Grade 11/12 Sections additionally carry a Class Shift: "AM", "PM",
     or "None". Grade 11/12 Teachers carry a per-grade Class Shift the
     same way t.gradeLoads tracks per-grade teaching loads.
   These are intentionally separate from the existing Subject "type"
   (Core/Specialized/Elective — SUBJECT_TYPES below) so nothing already
   relying on that field is touched.
   ========================================================= */
const SECTION_TYPES = ["Regular", "Special Program"];
const SUBJECT_PROGRAMS = ["Regular", "Special Program"];
// Shown in a period slot when a grade/section has no actual Subject records
// configured yet for the current School Year/Term — NEVER a real subject
// name, and never fed into teacher/schedule generation (see
// collectScheduleJobs), so it can't be confused with, or silently replace,
// an Admin-configured Subject.
const NO_SUBJECT_PLACEHOLDER = "No Subject Configured";
// Special Program Subject list — shown as a dropdown on a Teacher's
// per-grade Special Program Load (see openTeacherForm). Starts with the
// three DepEd-common defaults but is fully Admin-editable (add/rename/
// delete) via the Teacher form; persisted like any other real data (see
// buildSnapshot/applySnapshot), never hard-coded into generation.
let SPECIAL_PROGRAM_SUBJECTS = ["ICT", "RFS", "Research"];
// The "Special Program / TLE / Research" shared-scheduling group: subjects
// that are allowed to intentionally occupy the exact same time slot within
// the SAME Special Program section (e.g. a combined TLE+Research period)
// without being treated as a section/teacher double-booking. TLE is always
// included even though it isn't itself a Special Program Subject dropdown
// entry, since it's routinely combined with Research/ICT in one Special
// Program period. This never relaxes conflicts across different sections,
// rooms, or otherwise-incompatible subjects — see checkScheduleConflicts.
function isSharedProgramGroupSubject(name){
  if(!name) return false;
  const n = name.trim().toLowerCase();
  if(n==="tle") return true;
  return SPECIAL_PROGRAM_SUBJECTS.some(s=>s.toLowerCase()===n);
}
const CLASS_SHIFTS = ["None", "AM", "PM"];
function isSHSGrade(grade){ return grade==="Grade 11" || grade==="Grade 12"; }
// A Grade 11/12 teacher's Class Shift assignment for a specific grade —
// mirrors teacherGradeCap()'s use of t.gradeLoads. Defaults to "None"
// (no shift restriction) for teachers/grades with nothing set.
function teacherShiftFor(t, grade){ return (t && t.gradeShifts && t.gradeShifts[grade]) || "None"; }
// Is a teacher's Class Shift for this grade compatible with a section's
// Class Shift? "None" on either side means no restriction — a teacher
// with no shift preference can take any section, and a section with no
// shift requirement can be taught by anyone. AM only matches AM/None;
// PM only matches PM/None.
function shiftsCompatible(teacherShift, sectionShift){
  if(!sectionShift || sectionShift==="None") return true;
  if(!teacherShift || teacherShift==="None") return true;
  return teacherShift === sectionShift;
}

// index of section within its grade (for round-robin teacher picking)
(function assignIdx(){
  const seen = {};
  SECTIONS.forEach(s=>{ seen[s.grade] = (seen[s.grade]||0); s.idxInGrade = seen[s.grade]; seen[s.grade]++; });
})();

// Teachers — none pre-loaded. Admins add faculty from the Teachers page
// ("+ Add Teacher"), tagging each one's level(s), specialization(s), and
// any specific Sr. High specialized subjects they can teach.
const TEACHERS = [];
// Learning-Area / Specialization master list an Admin can tag a teacher
// with, and (optionally) explicitly assign a Subject to. Matches the
// categories produced by computeArea() below by default, so a teacher
// tagged with an area is automatically eligible for every subject that
// maps to it. Admin-manageable (add/rename/archive/delete) on the
// Specializations & Learning Areas page — see LEARNING_AREA_* functions.
// Kept as `let` (not `const`) specifically so the Admin can edit it; it's
// persisted in snapshotData/applySnapshot like any other saved setting.
let AREA_LIST = ["Filipino","English","Math","Science","AP","Values","MAPEH","TLE","ICT","Research","Language","General"];
// Archived areas are hidden from every picker (teacher specialization
// checkboxes, the Subject's explicit Learning Area override) but never
// deleted outright — any teacher or subject still tagged with one keeps
// working exactly as before; only new assignments are blocked.
let ARCHIVED_AREAS = [];
const teacherById = id => TEACHERS.find(t=>t.id===id);

// Pristine (empty) copies of the built-in starting state, kept only so
// "Erase All Data" can reliably reset back to a genuinely clean slate —
// never sample/demo records, since none exist in this app by design.
const SEED_TEACHERS = JSON.parse(JSON.stringify(TEACHERS));
const SEED_SECTIONS = SECTIONS.map(s=>({id:s.id, grade:s.grade, name:s.name, strand:s.strand}));
let teacherCounter = 1;
let sectionCounter = 1;

// Rooms — independent of the scheduling engine; a simple facilities list
// available from its own management page and the Quick Actions shortcut.
const ROOMS = [];
const SEED_ROOMS = JSON.parse(JSON.stringify(ROOMS));
let roomCounter = 1;

// "Viewing As" has been removed. Role access is now determined strictly by
// the signed-in account: this system currently has a single account role,
// Super Admin, with exclusive access to every system-level management
// feature below — School Year, Terms, Subjects, Grade Levels, Teachers,
// Buildings/Rooms, Sections, Scheduling Rules, AI Schedule Generation,
// System Settings, and Reports. There is no runtime role switcher.
const CURRENT_ROLE = "super_admin";
function canAccessPage(page){ return true; }

/* =========================================================
   MULTI-ADMIN DATA ISOLATION
   ---------------------------------------------------------
   The school (School Years, Terms, Subjects, Rooms, Grade
   Configuration, bell schedule, etc.) is SHARED — every signed-in
   administrator sees the same reference data.

   Teachers and Sections (and, by extension, the schedules built
   from them) are OWNED per administrator: each admin only sees and
   manages the faculty/sections they personally created. TEACHERS
   and SECTIONS (used everywhere else in this file) are kept as a
   *filtered view* of the true, full datasets — TEACHERS_ALL and
   SECTIONS_ALL — recomputed whenever data loads or the signed-in
   admin changes. Every existing function that reads/writes
   TEACHERS/SECTIONS keeps working unmodified, because it's always
   looking at "my own records" already.

   NOTE: this is client-side isolation only (no server to enforce
   it) — it stops one admin's UI from ever listing or letting them
   edit another admin's records on a shared device, but a
   technically sophisticated user with direct access to this
   browser's storage could bypass it. Real, tamper-proof separation
   would need a backend with server-side access rules.
   ========================================================= */
let TEACHERS_ALL = TEACHERS.slice();   // every admin's teacher records — the real source of truth
let SECTIONS_ALL = SECTIONS.slice();   // every admin's section records — the real source of truth (starts empty; nothing is seeded)

function currentAdminId(){
  return (typeof AUTH_SESSION!=="undefined" && AUTH_SESSION && AUTH_SESSION.id) || null;
}
function currentAdminName(){
  return (typeof AUTH_SESSION!=="undefined" && AUTH_SESSION && (AUTH_SESSION.name||AUTH_SESSION.email)) || "Admin";
}
// A record with no owner yet is pre-existing/legacy data — visible until
// claimed (see claimLegacyOwnership()). Once every record has an owner,
// this simply means "did I create this?".
function isOwnedRecord(rec){
  const me = currentAdminId();
  return !rec.createdBy || rec.createdBy === me;
}
// Rebuilds the TEACHERS/SECTIONS working arrays from the full datasets,
// keeping only the current admin's own (+ any not-yet-claimed legacy)
// records. Call this after login/logout and after any change to the
// *_ALL arrays. Existing array identity is preserved (length=0 + push)
// since some code may hold onto the TEACHERS/SECTIONS reference.
function refreshOwnedViews(){
  TEACHERS.length = 0; TEACHERS.push(...TEACHERS_ALL.filter(isOwnedRecord));
  SECTIONS.length = 0; SECTIONS.push(...SECTIONS_ALL.filter(isOwnedRecord));
  recomputeSectionIdx();
}
// One-time claim: pre-existing records created before this admin-ownership
// system existed have no createdBy. The first
// admin who signs in after this claims them as their own, exactly like
// migrating a single-admin school into the multi-admin system. Any admin
// who signs up afterward starts with their own empty roster, as expected.
function claimLegacyOwnership(){
  const me = currentAdminId();
  if(!me) return false;
  let changed = false;
  TEACHERS_ALL.forEach(t=>{ if(!t.createdBy){ t.createdBy = me; changed = true; } });
  SECTIONS_ALL.forEach(s=>{ if(!s.createdBy){ s.createdBy = me; changed = true; } });
  return changed;
}
// Defense-in-depth ownership guard for edit/delete actions. In normal use
// this can never trip — the record wouldn't be visible/selectable at all
// if it weren't already the current admin's — but it protects against
// stale references or tampered data-* attributes.
function assertOwned(rec, verb){
  if(rec && rec.createdBy && rec.createdBy !== currentAdminId()){
    showToast(`You can only ${verb||"manage"} records you created.`, true);
    return false;
  }
  return true;
}

/* =========================================================
   1C. SCHOOL YEAR, TERM & SUBJECT MANAGEMENT (Super Admin only)
   Subjects are always tied to School Year + Term + Grade Level, per the
   required hierarchy: School Year → Term → Grade Level → Subjects →
   Teacher Allocation → Section Allocation → Schedule.
   ========================================================= */
const SCHOOL_YEARS = [
  { id:"SY1", label:"2025–2026", status:"archived" },
  { id:"SY2", label:"2026–2027", status:"active" },
  { id:"SY3", label:"2027–2028", status:"upcoming" }
];
let schoolYearCounter = 4;
function activeSchoolYear(){ return SCHOOL_YEARS.find(y=>y.status==="active") || SCHOOL_YEARS[0]; }
function schoolYearById(id){ return SCHOOL_YEARS.find(y=>y.id===id); }
let CURRENT_SCHOOL_YEAR_ID = activeSchoolYear().id; // School Year currently selected for management & generation

let TERMS = [
  { id:"TM1", name:"1st Term" },
  { id:"TM2", name:"2nd Term" },
  { id:"TM3", name:"3rd Term" }
];
let termIdCounter = 4;
let TERM_OPTIONS = TERMS.map(t=>t.name); // kept in sync via syncTermOptions()
function syncTermOptions(){ TERM_OPTIONS = TERMS.map(t=>t.name); }
function termById(id){ return TERMS.find(t=>t.id===id); }
function termIdByName(name){ const t = TERMS.find(t=>t.name===name); return t ? t.id : (TERMS[0] && TERMS[0].id); }
let CURRENT_TERM_ID = TERMS[0].id;

const SUBJECT_TYPES = ["Core","Specialized","Elective"];
// fridayOnly: when true, this subject is only offered/scheduled on Friday
// (e.g. clubs, values formation) and is excluded from the Mon–Thu rotation.
// Defaults to false/undefined, meaning the subject is offered every active
// school day (Mon–Thu, plus Friday when the Admin has enabled it).
const SUBJECTS = []; // {id, code, name, schoolYearId, termId, grade, strand, type, units, hoursPerWeek, status, fridayOnly}
let subjectIdCounter = 1;

function makeSubjectCode(name, grade){
  const gnum = grade.replace("Grade ","");
  const base = name.replace(/\(.*?\)/g,"").trim();
  const stop = ["and","of","the","for","sa","in","na"];
  const words = base.split(/\s+/).filter(w=>w && !stop.includes(w.toLowerCase()));
  let abbr = words.length<=1 ? base.slice(0,4).toUpperCase() : words.map(w=>w[0]).join("").toUpperCase().slice(0,4);
  let code = abbr+gnum, n=1;
  while(SUBJECTS.some(s=>s.code===code)){ n++; code = abbr+gnum+"-"+n; }
  return code;
}
function subjectDuplicate(schoolYearId, termId, grade, name, strand, excludeId){
  return SUBJECTS.some(s=> s.id!==excludeId && s.schoolYearId===schoolYearId && s.termId===termId && s.grade===grade &&
    s.name.toLowerCase()===name.toLowerCase() && (s.strand||"")===(strand||""));
}

function recomputeSectionIdx(){
  const seen = {};
  SECTIONS.forEach(s=>{
    s.tier = tierOf(s.grade);
    s.subTier = subTierOf(s.grade);
    seen[s.grade] = seen[s.grade]||0;
    s.idxInGrade = seen[s.grade];
    seen[s.grade]++;
  });
}
function computeArea(subject){
  const s = subject.toLowerCase();
  if(s.includes("filipino")||s.includes("wika")||s.includes("piling larang")) return "Filipino";
  if(s.includes("english")||s.includes("reading and writing")||s.includes("reading and literacy")||s.includes("oral communication")||s.includes("literature")) return "English";
  if(s.includes("math")||s.includes("numeracy")||s.includes("statistics")) return "Math";
  if(s.includes("science")) return "Science";
  if(s.includes("araling")||s.includes("makabansa")||s.includes("culture, society")) return "AP";
  if(s.includes("pagpapakatao")||s.includes("gmrc")||s.includes("good manners")||s.includes("values education")||s.includes("personal development")) return "Values";
  if(s.includes("mapeh")||s.includes("physical education")) return "MAPEH";
  if(s.includes("epp")||s.includes("tle")||s.includes("pantahanan")||s.includes("livelihood")) return "TLE";
  if(s.includes("empowerment")) return "ICT";
  if(s.includes("research")) return "Research";
  if(s.includes("language")||s.includes("communication development")) return "Language";
  return AREA_LIST.includes("General") ? "General" : (AREA_LIST[0] || "General");
}
// The Learning Area a subject NAME belongs to. An explicit assignment made
// on the Subjects page (Subject.learningArea) always wins; otherwise it
// falls back to the computeArea() keyword heuristic above. Looked up by
// name only (not scoped to a section) since teacherCanTeach() below only
// ever has a subject name to work with.
function subjectLearningArea(subjectName){
  const rec = SUBJECTS.find(s=> s.name===subjectName && s.learningArea);
  return (rec && rec.learningArea) || computeArea(subjectName);
}

// Can this teacher be assigned to teach this subject, in principle (ignoring
// time conflicts)? A specific "Subjects Can Teach" entry always wins; failing
// that, the teacher qualifies if one of their tagged specializations matches
// the subject's Learning Area (subjectLearningArea() above — an explicit
// per-subject assignment if the Admin made one, else computeArea()'s guess).
function teacherCanTeach(t, subject){
  if(t.subjectsCanTeach && t.subjectsCanTeach.some(x=>x.toLowerCase()===subject.toLowerCase())) return true;
  if(t.specializations && t.specializations.includes(subjectLearningArea(subject))) return true;
  return false;
}

/* =========================================================
   1D. GRADE-LEVEL TEACHING ASSIGNMENT + PER-GRADE TEACHING LOAD
   A teacher is "assigned" to a grade level only when it has a positive
   entry in t.gradeLoads (e.g. {"Grade 9":{regular:2,special:1}}). t.tiers
   is kept in sync as GRADE_ORDER.filter(g => total(gradeLoads[g]) > 0)
   purely so the many existing `t.tiers.includes(grade)` checks elsewhere
   keep working unchanged — gradeLoads is the source of truth.
   A "teaching load" = one distinct (section, subject) combination
   assigned to the teacher within that grade — matching how a school
   counts "2 teaching loads" as 2 class/subject preparations, not the
   number of periods-per-week that combination happens to occupy.
   Regular Class Loads and Special Program Loads are tracked as two
   separate caps per grade (see Section Type / Program), each enforced
   independently: a teacher can be at their Regular cap while still
   having Special Program capacity left, and vice versa. There is no
   "Valid/Invalid Load" classification anywhere — the Admin's numbers are
   simply the caps used by the generator; Total is always just their sum.
   ========================================================= */
// Which cap bucket a section's periods draw from.
function sectionProgramBucket(section){ return (section && section.sectionType==="Special Program") ? "special" : "regular"; }
// Normalizes any shape of t.gradeLoads[grade] (new {regular,special} object,
// or a legacy bare number from before this split existed) into
// {regular,special}. Never throws on missing/malformed data.
// Total loads represented by a raw t.gradeLoads[grade] value, whatever its
// shape — a legacy bare number, or the current {regular,special} object.
// Used during migration, before a full teacher record is necessarily in
// its final shape.
function gradeLoadTotal(gl){
  if(!gl) return 0;
  if(typeof gl==="number") return gl>0?gl:0;
  return (gl.regular>0?gl.regular:0) + (gl.special>0?gl.special:0);
}
function normalizedGradeLoad(t, grade){
  const gl = t && t.gradeLoads && t.gradeLoads[grade];
  if(!gl) return { regular:0, special:0 };
  if(typeof gl === "number") return { regular: gl>0?gl:0, special:0 }; // legacy pre-split value
  return { regular: gl.regular>0?gl.regular:0, special: gl.special>0?gl.special:0 };
}
// program: "regular" | "special" | omitted (=> Total, i.e. regular+special).
function teacherGradeCap(t, grade, program){
  const gl = normalizedGradeLoad(t, grade);
  if(program==="regular") return gl.regular;
  if(program==="special") return gl.special;
  return gl.regular + gl.special;
}
function gradeLoadComboKey(section, subject){ return section.id+"::"+subject; }
// Which Special Program Subject (ICT/RFS/Research/custom) this teacher's
// Special Program Load for this grade covers, if any. Empty string when
// there's no Special Program Load for this grade, or none was chosen yet.
function teacherSpecialProgramSubject(t, grade){
  const gl = t && t.gradeLoads && t.gradeLoads[grade];
  return (gl && typeof gl==="object" && gl.specialSubject) ? gl.specialSubject : "";
}
// Can this teacher take on this (section, subject) job without exceeding
// their Admin-set per-grade, per-program-bucket teaching-load limit?
// `gradeLoadUsed` is a running teacherId -> {grade: {regular:Set, special:Set}}
// tracker built by the caller; when omitted, this only checks that the
// teacher has a cap for this grade+bucket at all ("qualified in principle").
function canTeacherTakeGradeLoad(t, section, subject, gradeLoadUsed){
  const bucket = sectionProgramBucket(section);
  const cap = teacherGradeCap(t, section.grade, bucket);
  if(cap<=0) return false;
  if(!gradeLoadUsed) return true;
  const used = gradeLoadUsed[t.id] && gradeLoadUsed[t.id][section.grade] && gradeLoadUsed[t.id][section.grade][bucket];
  if(!used) return true;
  if(used.has(gradeLoadComboKey(section, subject))) return true; // continuing an existing combo — never blocked
  return used.size < cap;
}
// Derives a teacherId -> {grade: {regular:Set(sectionId::subject), special:Set(...)}}
// usage map from a finished (or in-progress) schedule-assignment map. Used
// by the repair passes so grade-load limits stay correctly enforced even
// as they move assignments around — always recomputed from the actual
// current state rather than incrementally patched, so it can never drift
// out of sync.
function computeGradeLoadUsage(assignmentMap){
  const usage = {};
  Object.entries(assignmentMap).forEach(([key, teacherId])=>{
    if(!teacherId) return;
    const [secId, day, pIdxStr] = key.split("|");
    const sec = SECTIONS.find(s=>s.id===secId);
    if(!sec) return;
    const raw = buildTimelineRaw(sec, day).find(b=>b.type==="period" && b.periodIdx===Number(pIdxStr));
    if(!raw) return;
    const bucket = sectionProgramBucket(sec);
    usage[teacherId] = usage[teacherId] || {};
    usage[teacherId][sec.grade] = usage[teacherId][sec.grade] || { regular:new Set(), special:new Set() };
    usage[teacherId][sec.grade][bucket].add(gradeLoadComboKey(sec, raw.subject));
  });
  return usage;
}

/* =========================================================
   1B. PERSISTENCE — window.storage acts as this app's database.
   Every CRUD action below calls saveData() so edits survive a
   refresh / new session for this browser profile.
   ========================================================= */
const STORAGE_KEY = "edusched:data:v1";
const ACCOUNT_OWNER_KEY = "edusched:account-owner:v1";
let saveTimer = null;

/* ---------- Resilient storage layer ----------
   window.storage (the host-provided persistence bridge) can be missing,
   momentarily unavailable, or return an error such as
   "Unexpected response type" instead of a clean result. Rather than let
   every read/write site handle that individually (and spam the user with
   toasts), everything goes through this Store wrapper, which:
     - feature-detects window.storage before touching it
     - treats ANY failure (missing bridge, thrown error, malformed
       response) as "fall back to localStorage" instead of a hard error
     - normalizes a missing key to null instead of throwing
     - only logs once per key instead of repeating the same warning
   Callers get a plain string (or null) back and never see the bridge's
   error shape, so the app keeps working — and keeps saving — even when
   the storage bridge is flaky or entirely absent (e.g. this file opened
   directly in a browser instead of inside the host that provides it). */
const Store = (function(){
  const warned = new Set();
  function warnOnce(key, msg, err){
    const k = key+"|"+msg;
    if(warned.has(k)) return;
    warned.add(k);
    console.warn(msg, err||"");
  }
  function hasBridge(){
    return typeof window !== "undefined" && !!window.storage &&
      typeof window.storage.get === "function" &&
      typeof window.storage.set === "function";
  }
  function hasLocal(){
    try{
      if(typeof window==="undefined" || !window.localStorage) return false;
      const t="__atlas_probe__"; window.localStorage.setItem(t,"1"); window.localStorage.removeItem(t);
      return true;
    }catch(e){ return false; }
  }
  function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function get(key){
    if(hasBridge()){
      for(let attempt=0; attempt<2; attempt++){
        try{
          const res = await window.storage.get(key, false);
          if(res && typeof res.value === "string") return res.value;
          // Bridge responded but with an unexpected shape (or a "not
          // found" signalled as null) — treat like a miss, don't retry.
          break;
        }catch(e){
          if(attempt===0){ await delay(300); continue; } // transient hiccup — try once more
          warnOnce(key, "window.storage.get('"+key+"') failed — using local fallback:", e);
        }
      }
    }
    if(hasLocal()){
      try{ return window.localStorage.getItem(key); }catch(e){ /* ignore */ }
    }
    return null;
  }
  async function set(key, value){
    let ok = false;
    if(hasBridge()){
      for(let attempt=0; attempt<2; attempt++){
        try{ await window.storage.set(key, value, false); ok = true; break; }
        catch(e){
          if(attempt===0){ await delay(300); continue; }
          warnOnce(key, "window.storage.set('"+key+"') failed — using local fallback:", e);
        }
      }
    }
    // Always mirror to localStorage too (when available), so a save still
    // survives even if the bridge silently failed, and reads stay fast.
    if(hasLocal()){
      try{ window.localStorage.setItem(key, value); ok = true; }catch(e){ /* quota or disabled */ }
    }
    return ok;
  }
  async function del(key){
    let ok = false;
    if(hasBridge()){
      try{ await window.storage.delete(key, false); ok = true; }catch(e){ /* not found is fine */ }
    }
    if(hasLocal()){
      try{ window.localStorage.removeItem(key); ok = true; }catch(e){ /* ignore */ }
    }
    return ok;
  }
  return { get, set, delete: del };
})();

/* =========================================================
   1B-2. OFFLINE-FIRST DATA LAYER + CLOUD SYNC ENGINE (pilot scope)
   -----------------------------------------------------------------
   SCOPE: This layer is wired into three entities — Teachers, Sections,
   and Subjects — as a working pilot of the full offline+sync
   architecture. It sits ALONGSIDE the existing whole-app Store/blob
   persistence above (which still saves/loads everything, including the
   entities not yet migrated: grade config, curriculum, schedule
   assignments, school years, terms, rooms, etc.) — nothing about the
   existing offline behavior for those areas is removed or weakened.
   Migrating every remaining entity to this same pattern is future work
   and is called out explicitly in the project notes; it was not done
   silently or faked here.

   Why Firestore: it exposes a full REST API reachable with plain
   fetch() calls, so this stays a single dependency-free HTML file — no
   SDK bundle that could fail to load the first time this file is
   opened offline. Firestore's REST endpoint evaluates unauthenticated
   requests against Firestore Security Rules, so with permissive rules
   (see the rules snippet shipped alongside this app) no auth token is
   needed for this pilot, matching the multi-admin real-time
   requirement without extra infrastructure. Swap CLOUD_CONFIG.url /
   the fetch calls below if you'd rather target a different backend —
   entityTable()/pushOne()/pullRemote()/pingCloud() plus the
   firestoreEncode/firestoreDecode helpers just below them are the only
   functions that know about Firestore specifically.
   ========================================================= */

// ---- Cloud connection config ------------------------------------------
// Firestore is now ATLAS's mandatory backend (see firebaseConfig in
// index.html), not an optional pilot the admin types a URL/key into — so
// this is a fixed constant rather than something loaded from local
// storage. CLOUD_CONFIG.url is kept as the field name the rest of the
// sync layer (firestoreBase(), renderSyncCenter(), etc.) already reads,
// to minimize churn; it holds the Firebase Project ID, not a URL.
const FIREBASE_PROJECT_ID = "atlas-36aed";
let CLOUD_CONFIG = { url: FIREBASE_PROJECT_ID, anonKey:"", enabled:true };
const CLOUD_CONFIG_KEY = "atlas_cloud_config"; // unused now — kept only so an old saved value never resurfaces and overrides the fixed project above
async function loadCloudConfig(){
  CLOUD_CONFIG = { url: FIREBASE_PROJECT_ID, anonKey:"", enabled:true };
}

let AUTO_SYNC_ENABLED = true;
const AUTO_SYNC_KEY = "atlas_auto_sync_enabled";
async function loadAutoSyncFlag(){
  const v = await Store.get(AUTO_SYNC_KEY);
  AUTO_SYNC_ENABLED = (v===null) ? true : v==="true";
}
async function setAutoSyncFlag(v){ AUTO_SYNC_ENABLED = !!v; await Store.set(AUTO_SYNC_KEY, String(!!v)); }

// ---- IndexedDB wrapper (no external library/CDN dependency) -----------
const IDB_NAME = "atlas_offline_db";
const IDB_VERSION = 1;
const IDB_STORES = ["teachers","sections","subjects","sync_queue","conflicts","meta"];
let _idbPromise = null;
function idbOpen(){
  if(_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve,reject)=>{
    if(!("indexedDB" in window)){ reject(new Error("IndexedDB not supported in this browser")); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      IDB_STORES.forEach(name=>{
        if(!db.objectStoreNames.contains(name)){
          db.createObjectStore(name, { keyPath: name==="meta" ? "key" : "id" });
        }
      });
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
  return _idbPromise;
}
function idbReqToPromise(req){ return new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
async function idbTx(storeName, mode, fn){
  const db = await idbOpen();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try{ result = fn(store); }catch(e){ reject(e); return; }
    tx.oncomplete = ()=>resolve(result);
    tx.onerror = ()=>reject(tx.error);
    tx.onabort = ()=>reject(tx.error);
  });
}
async function idbGetAll(storeName){
  try{ return await idbTx(storeName, "readonly", store=>idbReqToPromise(store.getAll())); }
  catch(e){ console.warn("idbGetAll failed for", storeName, e); return []; }
}
async function idbGet(storeName, key){
  try{ return await idbTx(storeName, "readonly", store=>idbReqToPromise(store.get(key))); }
  catch(e){ return undefined; }
}
async function idbPut(storeName, record){
  try{ await idbTx(storeName, "readwrite", store=>store.put(record)); return true; }
  catch(e){ console.warn("idbPut failed for", storeName, e); return false; }
}
async function idbDelete(storeName, key){
  try{ await idbTx(storeName, "readwrite", store=>store.delete(key)); return true; }
  catch(e){ console.warn("idbDelete failed for", storeName, e); return false; }
}
async function idbClearStore(storeName){
  try{ await idbTx(storeName, "readwrite", store=>store.clear()); return true; }
  catch(e){ console.warn("idbClearStore failed for", storeName, e); return false; }
}

// ---- Stable IDs + device identity --------------------------------------
// UUIDs from here on for these three entities, so the same record is
// recognized whether it was created on this device offline, on another
// device, or written directly in the cloud database. Legacy seed IDs
// (e.g. "C1", "SC1", "SUB1") already in the app keep working as-is —
// they're just strings as far as IndexedDB and Postgres are concerned.
function makeId(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
}
let DEVICE_ID = null;
async function getDeviceId(){
  if(DEVICE_ID) return DEVICE_ID;
  const existing = await idbGet("meta","device_id");
  if(existing && existing.value){ DEVICE_ID = existing.value; return DEVICE_ID; }
  DEVICE_ID = makeId();
  await idbPut("meta", { key:"device_id", value:DEVICE_ID });
  return DEVICE_ID;
}

// ---- Connection state machine ------------------------------------------
// offline  — no internet, or cloud not configured
// online   — internet reachable, not currently syncing
// syncing  — a push/pull cycle is in progress
// error    — last sync attempt failed (queue still holds the changes; retried automatically)
//
// NET_ONLINE tracks the device's actual internet connectivity on its own
// (navigator.onLine, kept fresh by the window "online"/"offline" events
// below). The top-bar indicator is driven by this, independently of
// whether a cloud database happens to be configured — so it always shows
// the true state of the device's connection. CONNECTION_STATE layers the
// cloud-sync status (syncing/error/etc.) on top of that for the Database
// & Sync page.
let NET_ONLINE = navigator.onLine;
let CONNECTION_STATE = "offline";
let LAST_SYNC_AT = null;
let LAST_SYNC_ERROR = null;
let SYNC_ACTIVITY = [];
let PENDING_SYNC = { teachers:new Set(), sections:new Set(), subjects:new Set() };

function setConnectionState(state){
  CONNECTION_STATE = state;
  renderConnectionIndicator();
  if(document.getElementById("page-database")) renderSyncCenter();
}
async function refreshPendingSyncSet(){
  const queue = await idbGetAll("sync_queue");
  const next = { teachers:new Set(), sections:new Set(), subjects:new Set() };
  queue.forEach(op=>{ if(next[op.entity_type]) next[op.entity_type].add(op.entity_id); });
  PENDING_SYNC = next;
}
function syncBadgeHtml(entityType, id){
  return (PENDING_SYNC[entityType] && PENDING_SYNC[entityType].has(id))
    ? ` <span class="tag gold" title="Waiting to synchronize with the cloud">☁ Pending Sync</span>` : "";
}
// Discards every queued-but-not-yet-synced change. This does NOT touch any
// local data — Teachers/Sections/Subjects already saved on this device are
// untouched — it only clears the outbox of changes still waiting to reach
// the cloud database. Anything discarded here will not appear in the cloud
// unless it's edited again (which re-queues it).
async function clearPendingSyncQueue(count){
  if(!count){ showToast("There are no pending changes to clear.", true); return; }
  openConfirm(`Discard ${count} pending change${count===1?'':'s'} waiting to synchronize? Your local data is safe, but these change${count===1?'':'s'} will <b>not</b> be pushed to the cloud unless made again. This cannot be undone.`, async ()=>{
    await idbClearStore("sync_queue");
    await refreshPendingSyncSet();
    renderSyncCenter();
    showToast(`Cleared ${count} pending change${count===1?'':'s'}.`);
  }, "Clear Pending");
}

// Base REST URL for the configured Firestore database, e.g.
// https://firestore.googleapis.com/v1/projects/my-project/databases/(default)/documents
function firestoreBase(){
  return "https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(CLOUD_CONFIG.url)+"/databases/(default)/documents";
}
// Appended to every Firestore REST call when a Web API Key was entered in
// the Sync Center. Optional — see the CLOUD_CONFIG comment above.
function firestoreKeyQS(){
  return CLOUD_CONFIG.anonKey ? ("?key="+encodeURIComponent(CLOUD_CONFIG.anonKey)) : "";
}
// Real per-user Firestore Security Rules (role checks via request.auth)
// need the signed-in admin's Firebase ID token on every call — this is
// what replaces the old "anon key, open rules" pilot setup now that real
// Firebase Authentication exists. Returns {} (unauthenticated request)
// if nobody is signed in yet, e.g. during the very first app boot.
async function firestoreAuthHeader(){
  try{
    const user = firebase.auth().currentUser;
    if(!user) return {};
    const token = await user.getIdToken();
    return { Authorization: "Bearer "+token };
  }catch(e){ console.error("Could not get Firebase ID token:", e); return {}; }
}
async function pingCloud(){
  if(!CLOUD_CONFIG.enabled || !navigator.onLine) return false;
  try{
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 5000);
    const authHeader = await firestoreAuthHeader();
    const res = await fetch(firestoreBase()+"/teachers?pageSize=1"+firestoreKeyQS(), { signal: ctrl.signal, headers: authHeader });
    clearTimeout(t);
    // A 403 here almost always means the Project ID is right but Firestore
    // Security Rules are rejecting unauthenticated access — still counts
    // as "reachable" for connectivity purposes; pushQueue()/pullRemote()
    // will surface the real error text either way.
    return res.status !== 404;
  }catch(e){ return false; }
}

let syncTimer = null;
function scheduleSyncRetry(delayMs){
  if(syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(()=>attemptSync(), delayMs);
}
window.addEventListener("online", ()=>{
  NET_ONLINE = true;
  renderConnectionIndicator();
  attemptSync();
  if(typeof firebase !== "undefined" && firebase.auth().currentUser) scheduleAccountSnapshotSave();
});
window.addEventListener("offline", ()=>{ NET_ONLINE = false; setConnectionState("offline"); });

// ---- Sync queue ----------------------------------------------------------
async function enqueueChange(entityType, entityId, opType, payload){
  const op = {
    id: makeId(), // sync_queue store's own primary key
    operation_id: makeId(),
    entity_type: entityType,
    entity_id: entityId,
    operation_type: opType, // CREATE | UPDATE | DELETE
    payload: payload || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    device_id: await getDeviceId(),
    user_id: (typeof AUTH_SESSION!=="undefined" && AUTH_SESSION && AUTH_SESSION.email) || "unknown",
    sync_status: "pending",
    retry_count: 0,
    last_error: null
  };
  await idbPut("sync_queue", op);
  await refreshPendingSyncSet();
  return op;
}
async function getPendingQueue(){
  const all = await idbGetAll("sync_queue");
  return all.filter(o=>o.sync_status==="pending" || o.sync_status==="failed")
             .sort((a,b)=> a.created_at.localeCompare(b.created_at));
}
function entityTable(entityType){
  // Doubles as the Firestore collection name for each entity.
  return { teachers:"teachers", sections:"sections", subjects:"subjects" }[entityType];
}
// ---- Firestore <-> plain-JS-object conversion ---------------------------
// Firestore's REST API wants every field wrapped in a typed "Value"
// envelope (e.g. {stringValue:"x"}, {integerValue:"5"}), and nests
// objects/arrays the same way. These two helpers are the only place that
// knows about that wire format — everywhere else in the sync layer keeps
// working with plain Teacher/Section/Subject objects exactly as before.
function firestoreEncodeValue(key, v){
  if(v===null || v===undefined) return { nullValue:null };
  if(key==="updated_at") return { timestampValue: v }; // must stay a real timestamp for the updated_at > X pull query below
  if(typeof v==="boolean") return { booleanValue:v };
  if(typeof v==="number") return Number.isInteger(v) ? { integerValue:String(v) } : { doubleValue:v };
  if(Array.isArray(v)) return { arrayValue:{ values: v.map(x=>firestoreEncodeValue(null,x)) } };
  if(typeof v==="object") return { mapValue:{ fields: firestoreEncodeFields(v) } };
  return { stringValue:String(v) };
}
function firestoreEncodeFields(obj){
  const fields = {};
  Object.keys(obj||{}).forEach(k=>{ if(obj[k]!==undefined) fields[k] = firestoreEncodeValue(k, obj[k]); });
  return fields;
}
function firestoreDecodeValue(v){
  if(!v) return null;
  if("nullValue" in v) return null;
  if("booleanValue" in v) return v.booleanValue;
  if("integerValue" in v) return Number(v.integerValue);
  if("doubleValue" in v) return v.doubleValue;
  if("timestampValue" in v) return v.timestampValue;
  if("stringValue" in v) return v.stringValue;
  if("arrayValue" in v) return (v.arrayValue.values||[]).map(firestoreDecodeValue);
  if("mapValue" in v) return firestoreDecodeFields(v.mapValue.fields||{});
  return null;
}
function firestoreDecodeFields(fields){
  const obj = {};
  Object.keys(fields||{}).forEach(k=>{ obj[k] = firestoreDecodeValue(fields[k]); });
  return obj;
}
async function pushOne(op){
  const table = entityTable(op.entity_type);
  if(!table) return { ok:false, error:"Unknown entity type: "+op.entity_type };
  const docUrl = firestoreBase()+"/"+table+"/"+encodeURIComponent(op.entity_id)+firestoreKeyQS();
  const authHeader = await firestoreAuthHeader();
  try{
    let res;
    if(op.operation_type==="DELETE"){
      res = await fetch(docUrl, { method:"DELETE", headers: authHeader });
      if(res.status===404) return { ok:true }; // already gone — treat as a successful delete
    } else {
      // PATCH on a document path creates it if missing and otherwise
      // overwrites its fields — Firestore's equivalent of the upsert
      // Supabase gave us via Prefer: resolution=merge-duplicates.
      res = await fetch(docUrl, {
        method:"PATCH",
        headers: Object.assign({ "Content-Type":"application/json" }, authHeader),
        body: JSON.stringify({ fields: firestoreEncodeFields(op.payload) })
      });
    }
    if(!res.ok){ const text = await res.text().catch(()=>""); return { ok:false, error:"HTTP "+res.status+" "+text.slice(0,200) }; }
    return { ok:true };
  }catch(e){ return { ok:false, error: e.message || String(e) }; }
}
async function pushQueue(){
  const pending = await getPendingQueue();
  let anyFailed = false;
  for(const op of pending){
    const result = await pushOne(op);
    if(result.ok){
      await idbDelete("sync_queue", op.id);
      SYNC_ACTIVITY.unshift({ at:new Date(), text:`${op.operation_type} ${op.entity_type.slice(0,-1)} synchronized`, ok:true });
    } else {
      anyFailed = true;
      op.retry_count = (op.retry_count||0)+1;
      op.last_error = result.error;
      op.sync_status = "failed";
      op.updated_at = new Date().toISOString();
      await idbPut("sync_queue", op);
      SYNC_ACTIVITY.unshift({ at:new Date(), text:`Failed to sync ${op.entity_type.slice(0,-1)}: ${result.error}`, ok:false });
    }
  }
  SYNC_ACTIVITY = SYNC_ACTIVITY.slice(0,30);
  await refreshPendingSyncSet();
  return !anyFailed;
}
async function pullRemote(entityType){
  const table = entityTable(entityType);
  const sinceRec = await idbGet("meta","last_pull_"+entityType);
  const sinceVal = sinceRec ? sinceRec.value : "1970-01-01T00:00:00.000000Z";
  // Firestore's REST API has no "?field=gt.value" querystring filter like
  // PostgREST — the equivalent is a structured query POSTed to :runQuery.
  const url = firestoreBase()+":runQuery"+firestoreKeyQS();
  const body = {
    structuredQuery: {
      from: [{ collectionId: table }],
      where: { fieldFilter: {
        field: { fieldPath: "updated_at" },
        op: "GREATER_THAN",
        value: { timestampValue: sinceVal }
      }},
      orderBy: [{ field: { fieldPath: "updated_at" }, direction: "ASCENDING" }]
    }
  };
  try{
    const authHeader = await firestoreAuthHeader();
    const res = await fetch(url, { method:"POST", headers: Object.assign({ "Content-Type":"application/json" }, authHeader), body: JSON.stringify(body) });
    if(!res.ok) return false;
    const results = await res.json();
    // Each entry is a RunQueryResponse; entries with no match (heartbeats)
    // have no "document" key and are skipped.
    const rows = results.filter(r=>r.document).map(r=>{
      const record = firestoreDecodeFields(r.document.fields);
      record.id = r.document.name.split("/").pop(); // document path ends in .../{collection}/{id}
      return record;
    });
    for(const row of rows) await mergeRemoteRecord(entityType, row);
    if(rows.length) await idbPut("meta", { key:"last_pull_"+entityType, value: rows[rows.length-1].updated_at });
    return true;
  }catch(e){ return false; }
}
// A remote row is only a genuine conflict if THIS device also has a
// not-yet-synced local change for the same record — never overwrite a
// pending local edit silently (Requirement: never silently discard
// offline changes / never overwrite cloud data without conflict handling).
async function mergeRemoteRecord(entityType, remoteRecord){
  const queue = await idbGetAll("sync_queue");
  const localPending = queue.find(o=>o.entity_type===entityType && o.entity_id===remoteRecord.id);
  if(localPending){
    await idbPut("conflicts", {
      id: makeId(), entity_type: entityType, entity_id: remoteRecord.id,
      local_payload: localPending.payload, server_payload: remoteRecord,
      local_modified_at: localPending.updated_at, local_modified_by: localPending.user_id,
      server_modified_at: remoteRecord.updated_at, server_modified_by: remoteRecord.updated_by || "cloud",
      status:"unresolved", detected_at: new Date().toISOString()
    });
    return;
  }
  await idbPut(entityType, remoteRecord);
  applyRecordToMemory(entityType, remoteRecord);
}
function applyRecordToMemory(entityType, record){
  const arr = { teachers:TEACHERS, sections:SECTIONS, subjects:SUBJECTS }[entityType];
  if(!arr) return;
  const idx = arr.findIndex(r=>r.id===record.id);
  if(idx>-1) arr[idx] = record; else arr.push(record);
}
async function resolveConflict(conflictId, choice){ // choice: "local" | "server"
  const c = await idbGet("conflicts", conflictId);
  if(!c) return;
  if(choice==="local"){
    await enqueueChange(c.entity_type, c.entity_id, "UPDATE", c.local_payload);
  } else {
    await idbPut(c.entity_type, c.server_payload);
    applyRecordToMemory(c.entity_type, c.server_payload);
    const queue = await idbGetAll("sync_queue");
    const stale = queue.find(o=>o.entity_type===c.entity_type && o.entity_id===c.entity_id);
    if(stale) await idbDelete("sync_queue", stale.id);
  }
  await idbDelete("conflicts", conflictId);
  await refreshPendingSyncSet();
  renderAll();
  if(navigator.onLine) attemptSync();
}

let syncInFlight = false;
async function attemptSync(force){
  if(syncInFlight) return;
  if(!force && !AUTO_SYNC_ENABLED){ return; }
  if(!CLOUD_CONFIG.enabled){ setConnectionState("offline"); return; }
  if(!navigator.onLine){ setConnectionState("offline"); return; }
  syncInFlight = true;
  setConnectionState("syncing");
  const reachable = await pingCloud();
  if(!reachable){
    syncInFlight = false; setConnectionState("offline"); scheduleSyncRetry(15000); return;
  }
  const pushOk = await pushQueue();
  for(const t of ["teachers","sections","subjects"]) await pullRemote(t);
  LAST_SYNC_AT = new Date();
  await idbPut("meta", { key:"last_sync_at", value: LAST_SYNC_AT.toISOString() });
  syncInFlight = false;
  if(pushOk){ LAST_SYNC_ERROR = null; setConnectionState("online"); }
  else { LAST_SYNC_ERROR = "Some changes could not be synchronized. They will be retried automatically."; setConnectionState("error"); scheduleSyncRetry(30000); }
  renderAll();
}

// ---- Persist+queue helper used by Teacher/Section/Subject CRUD --------
// 1) write to IndexedDB immediately (works fully offline)
// 2) enqueue the change for the cloud (survives even if the tab closes)
// 3) fire off a sync attempt if we're online — the caller's UI has
//    already updated optimistically and does not wait on this
async function persistEntityChange(entityType, record, opType){
  if(opType==="DELETE"){
    await idbDelete(entityType, record.id);
  } else {
    record.updated_at = new Date().toISOString();
    await idbPut(entityType, record);
  }
  await enqueueChange(entityType, record.id, opType, opType==="DELETE" ? null : record);
  if(navigator.onLine) attemptSync();
}

// One-time adoption of whatever's already in the in-memory arrays (loaded
// from the existing whole-app blob) into IndexedDB + the sync queue, so
// pre-existing local data is queued for upload the first time a cloud
// connection is configured, instead of silently left behind. Runs once —
// safe to call every launch since it no-ops after "migrated_v1" is set.
async function migrateExistingDataIntoOfflineLayer(){
  const marker = await idbGet("meta","migrated_v1");
  if(marker) return;
  for(const [entityType, arr] of [["teachers",TEACHERS],["sections",SECTIONS],["subjects",SUBJECTS]]){
    for(const record of arr){
      if(!record.updated_at) record.updated_at = new Date().toISOString();
      await idbPut(entityType, record);
      await enqueueChange(entityType, record.id, "CREATE", record);
    }
  }
  await idbPut("meta", { key:"migrated_v1", value:true });
}

function renderConnectionIndicator(){
  const el = document.getElementById("connIndicator");
  if(!el) return;

  // The dot/text always reflect the device's real internet connectivity
  // first. Cloud-sync detail (syncing/error/synced) is layered on top
  // only when there's actually a cloud database configured to sync with.
  let dot, text;
  if(!NET_ONLINE){
    dot = "🔴"; text = "Offline";
  } else if(!CLOUD_CONFIG.enabled){
    dot = "🟢"; text = "Online";
  } else if(CONNECTION_STATE === "syncing"){
    dot = "🟡"; text = "Synchronizing…";
  } else if(CONNECTION_STATE === "error"){
    dot = "🟠"; text = "Online · sync error";
  } else {
    dot = "🟢"; text = "Online · synced";
  }
  el.textContent = dot+" "+text;

  const parts = [NET_ONLINE ? "Device is online" : "Device is offline"];
  parts.push(CLOUD_CONFIG.enabled ? ("Cloud: "+CLOUD_CONFIG.url) : "Cloud database not configured — changes stay on this device");
  parts.push(LAST_SYNC_AT ? "Last sync: "+LAST_SYNC_AT.toLocaleString() : "Not synced yet");
  el.title = parts.join(" · ");
}

function setSaveIndicator(state){
  const dot = document.querySelector("#saveIndicator .sdot");
  const txt = document.getElementById("saveIndicatorText");
  if(!dot||!txt) return;
  if(state==="saving"){ dot.style.background = "#D69E2E"; txt.textContent = "Saving…"; }
  else if(state==="error"){ dot.style.background = "#8C2F39"; txt.textContent = "Save failed — see toast"; }
  else { dot.style.background = "#4FAE72"; txt.textContent = "All changes saved"; }
}

function snapshotData(){
  return {
    teachersAll: TEACHERS_ALL,
    sectionsAll: SECTIONS_ALL.map(s=>({id:s.id, grade:s.grade, name:s.name, strand:s.strand, roomId:s.roomId, sectionType:s.sectionType, classShift:s.classShift, createdBy:s.createdBy})),
    currentTerm: CURRENT_TERM,
    gradeConfig: GRADE_CONFIG,
    adminStart: ADMIN_START,
    shsPmStart: SHS_PM_START,
    areaList: AREA_LIST,
    archivedAreas: ARCHIVED_AREAS,
    schoolName: SCHOOL_NAME,
    schoolLogo: SCHOOL_LOGO,
    teacherCounter, sectionCounter,
    scheduleAssignments: SCHEDULE_ASSIGNMENTS,
    scheduleConflicts: SCHEDULE_CONFLICTS,
    scheduleGeneratedAt: SCHEDULE_GENERATED_AT,
    resolvedConflicts: RESOLVED_CONFLICTS,
    conflictHistory: CONFLICT_HISTORY,
    conflictHistoryIdCounter,
    sectionPeriodOverride: SECTION_PERIOD_OVERRIDE,
    rooms: ROOMS,
    roomCounter,
    schoolYears: SCHOOL_YEARS,
    schoolYearCounter,
    currentSchoolYearId: CURRENT_SCHOOL_YEAR_ID,
    terms: TERMS,
    termIdCounter,
    currentTermId: CURRENT_TERM_ID,
    subjects: SUBJECTS,
    subjectIdCounter,
    fridayEnabled: FRIDAY_ENABLED,
    subjectDurations: SUBJECT_DURATIONS,
    manualOverrides: MANUAL_OVERRIDES,
    manualExtra: MANUAL_EXTRA,
    extraEntryCounter,
    finalScheduleAuditLog: FINAL_SCHEDULE_AUDIT_LOG,
    finalAuditIdCounter,
    finalScheduleFinalizedAt: FINAL_SCHEDULE_FINALIZED_AT,
    finalScheduleFinalizedBy: FINAL_SCHEDULE_FINALIZED_BY,
    specialProgramSubjects: SPECIAL_PROGRAM_SUBJECTS,
    scheduleDataVersion: 2
  };
}

async function saveData(){
  setSaveIndicator("saving");
  try{
    const ok = await Store.set(STORAGE_KEY, JSON.stringify(snapshotData()));
    LAST_SAVED_AT = new Date();
    if(ok){
      setSaveIndicator("saved");
      scheduleAccountSnapshotSave();
    }else{
      // Neither the storage bridge nor localStorage accepted the write —
      // a genuine failure (e.g. storage disabled/full), worth surfacing.
      setSaveIndicator("error");
      showToast("Could not save your changes to storage. They may be lost on refresh.", true);
    }
  }catch(e){
    console.error("Storage save failed:", e);
    setSaveIndicator("error");
    showToast("Could not save your changes to storage. They may be lost on refresh.", true);
  }
}
let LAST_SAVED_AT = null;
function scheduleAccountSnapshotSave(){
  clearTimeout(saveTimer);
  if(typeof firebase === "undefined" || !firebase.auth().currentUser) return;
  saveTimer = setTimeout(async ()=>{
    saveTimer = null;
    await saveAccountSnapshot();
  }, 900);
}

// The browser-local snapshot is useful offline, but it is not portable
// between devices. On logout, mirror the complete account snapshot into the
// signed-in user's Firestore profile; the next login restores it before the
// app initializes.
async function saveAccountSnapshot(){
  clearTimeout(saveTimer);
  saveTimer = null;
  const user = firebase.auth().currentUser;
  if(!user || !CLOUD_CONFIG.enabled || !navigator.onLine) return false;
  try{
    const accountSnapshot = snapshotData();
    accountSnapshot.teachersAll = accountSnapshot.teachersAll.filter(record=>!record.createdBy || record.createdBy===user.uid);
    accountSnapshot.sectionsAll = accountSnapshot.sectionsAll.filter(record=>!record.createdBy || record.createdBy===user.uid);
    const authHeader = await firestoreAuthHeader();
    const query = "?updateMask.fieldPaths=appData&updateMask.fieldPaths=appDataUpdatedAt" +
      (CLOUD_CONFIG.anonKey ? "&key="+encodeURIComponent(CLOUD_CONFIG.anonKey) : "");
    const res = await fetch(firestoreBase()+"/users/"+encodeURIComponent(user.uid)+query, {
      method:"PATCH",
      headers:Object.assign({"Content-Type":"application/json"}, authHeader),
      body:JSON.stringify({ fields:firestoreEncodeFields({
        appData:accountSnapshot,
        appDataUpdatedAt:new Date().toISOString()
      }) })
    });
    if(!res.ok){
      const text = await res.text().catch(()=>'');
      throw new Error("HTTP "+res.status+" "+text.slice(0,180));
    }
    await Store.set(ACCOUNT_OWNER_KEY, user.uid);
    return true;
  }catch(e){
    console.error("Account snapshot save failed:", e);
    return false;
  }
}

// Older saved data tagged teachers with a whole tier ("JHS"/"SHS") instead of
// specific grade levels, and older-still data had no per-grade Teaching Load
// numbers at all (just a grade list). This migration expands legacy tier
// tags into explicit grades, then makes sure every teacher has a proper
// gradeLoads map (grade -> max teaching loads), giving any pre-existing
// grade assignment that has no load number a sensible default (6 — a
// typical full teaching load) so nobody's assignment silently disappears
// or becomes uncapped. t.tiers is then re-derived from gradeLoads so it
// always reflects "grades with a positive teaching-load entry".
function migrateTeacherGradeLoadsIn(list){
  const legacyExpand = { JHS:["Grade 7","Grade 8","Grade 9","Grade 10"], SHS:["Grade 11","Grade 12"] };
  const DEFAULT_LEGACY_LOAD = 6;
  list.forEach(t=>{
    const rawTiers = Array.isArray(t.tiers) ? t.tiers : [];
    const expanded = new Set();
    rawTiers.forEach(tag=>{
      if(legacyExpand[tag]) legacyExpand[tag].forEach(g=>expanded.add(g));
      else if(GRADE_ORDER.includes(tag)) expanded.add(tag);
    });
    if(!t.gradeLoads || typeof t.gradeLoads!=="object"){
      t.gradeLoads = {};
      expanded.forEach(g=>{ t.gradeLoads[g] = { regular: DEFAULT_LEGACY_LOAD, special: 0, specialSubject: "" }; });
    } else {
      Object.keys(t.gradeLoads).forEach(g=>{
        if(!GRADE_ORDER.includes(g) || gradeLoadTotal(t.gradeLoads[g])<=0){ delete t.gradeLoads[g]; return; }
        // A bare number here means this record predates the Regular/Special
        // Program split — treat the whole prior cap as Regular, since that
        // was the only kind of load this app tracked at the time.
        const gl = t.gradeLoads[g];
        const regular = (typeof gl==="number") ? Math.floor(gl) : (gl.regular>0?Math.floor(gl.regular):0);
        const special = (typeof gl==="number") ? 0 : (gl.special>0?Math.floor(gl.special):0);
        // A Special Program Subject only means anything while there's an
        // actual Special Program Load — dropped otherwise so a stale pick
        // doesn't linger invisibly if the load is later zeroed out and
        // re-raised for a different subject.
        const specialSubject = (special>0 && typeof gl==="object" && gl.specialSubject) ? gl.specialSubject : "";
        t.gradeLoads[g] = { regular, special, specialSubject };
      });
      expanded.forEach(g=>{ if(gradeLoadTotal(t.gradeLoads[g])<=0) t.gradeLoads[g] = { regular: DEFAULT_LEGACY_LOAD, special: 0, specialSubject: "" }; });
    }
    t.tiers = GRADE_ORDER.filter(g=> gradeLoadTotal(t.gradeLoads[g])>0);
    if(t.employeeId===undefined) t.employeeId = "";
    if(t.maxTeachingHours===undefined) t.maxTeachingHours = null;
    // Ensure every teacher has a gradeShifts map (Grade 11/12 AM/PM/None
    // assignment) — defaults to "None" (no shift restriction) for any grade
    // that doesn't have one yet, including teachers saved before this
    // feature existed.
    if(!t.gradeShifts || typeof t.gradeShifts!=="object") t.gradeShifts = {};
    GRADE_ORDER.filter(isSHSGrade).forEach(g=>{
      if(!CLASS_SHIFTS.includes(t.gradeShifts[g])) t.gradeShifts[g] = "None";
    });
  });
}

function applySnapshot(data){
  // teachersAll/sectionsAll (with per-record createdBy ownership) are the
  // current format. Older saves only have "teachers"/"sections" (from
  // before multi-admin isolation existed) — load those into the same
  // *_ALL arrays as unowned/legacy records; claimLegacyOwnership() (called
  // right after sign-in) then assigns them to whichever admin logs in
  // first, exactly like migrating a single-admin school forward.
  TEACHERS_ALL = data.teachersAll || data.teachers || [];
  SECTIONS_ALL = (data.sectionsAll || data.sections || []).map(s=>({...s}));
  migrateTeacherGradeLoadsIn(TEACHERS_ALL);
  refreshOwnedViews();
  if(data.currentTerm) CURRENT_TERM = data.currentTerm;
  if(data.adminStart) ADMIN_START = data.adminStart;
  if(data.shsPmStart) SHS_PM_START = data.shsPmStart;
  if(Array.isArray(data.areaList) && data.areaList.length) AREA_LIST = data.areaList;
  if(Array.isArray(data.archivedAreas)) ARCHIVED_AREAS = data.archivedAreas;
  if(data.schoolName) SCHOOL_NAME = data.schoolName;
  if(data.schoolLogo!==undefined) SCHOOL_LOGO = data.schoolLogo || "";
  if(data.gradeConfig){
    const raw = data.gradeConfig;
    raw._legacyStart = data.adminStart || ADMIN_START;
    GRADE_CONFIG = migrateGradeConfig(raw);
  }
  teacherCounter = data.teacherCounter || (TEACHERS.length+1);
  sectionCounter = data.sectionCounter || (SECTIONS.length+1);
  ROOMS.length = 0; ROOMS.push(...(data.rooms||[]));
  roomCounter = data.roomCounter || (ROOMS.length+1);

  FRIDAY_ENABLED = !!data.fridayEnabled;
  SUBJECT_DURATIONS = data.subjectDurations || {};
  MANUAL_OVERRIDES = data.manualOverrides || {};
  MANUAL_EXTRA = data.manualExtra || [];
  extraEntryCounter = data.extraEntryCounter || (MANUAL_EXTRA.length+1);
  FINAL_SCHEDULE_AUDIT_LOG = data.finalScheduleAuditLog || [];
  finalAuditIdCounter = data.finalAuditIdCounter || (FINAL_SCHEDULE_AUDIT_LOG.length+1);
  FINAL_SCHEDULE_FINALIZED_AT = data.finalScheduleFinalizedAt || null;
  FINAL_SCHEDULE_FINALIZED_BY = data.finalScheduleFinalizedBy || null;
  SPECIAL_PROGRAM_SUBJECTS = (Array.isArray(data.specialProgramSubjects) && data.specialProgramSubjects.length)
    ? data.specialProgramSubjects
    : ["ICT", "RFS", "Research"];
  // Edit Mode is a transient, in-session concept only — never resumes across a reload.
  FINAL_EDIT_MODE = false;
  FINAL_EDIT_SNAPSHOT = null;
  FINAL_EDIT_PENDING_AUDIT = [];
  FINAL_EDIT_CONFLICTS = [];

  const legacy = (data.scheduleDataVersion||1) < 2;
  if(legacy){
    // Pre-existing saves stored one schedule per section (no day dimension) —
    // "sectionId|periodIdx" keys and {sectionId:{periodIdx:subject}} overrides.
    // Replicate that single pattern across Mon–Thu so nothing already
    // generated appears to vanish; the Admin can Regenerate afterward to get
    // genuinely independent per-day schedules.
    const oldAssign = data.scheduleAssignments || {};
    const oldOverride = data.sectionPeriodOverride || {};
    SCHEDULE_ASSIGNMENTS = {};
    Object.entries(oldAssign).forEach(([key, teacherId])=>{
      const [secId, pIdx] = key.split("|");
      ["Mon","Tue","Wed","Thu"].forEach(day=>{ SCHEDULE_ASSIGNMENTS[scheduleKey(secId, day, Number(pIdx))] = teacherId; });
    });
    SECTION_PERIOD_OVERRIDE = {};
    Object.entries(oldOverride).forEach(([secId, byPeriod])=>{
      SECTION_PERIOD_OVERRIDE[secId] = SECTION_PERIOD_OVERRIDE[secId] || {};
      ["Mon","Tue","Wed","Thu"].forEach(day=>{ SECTION_PERIOD_OVERRIDE[secId][day] = {...byPeriod}; });
    });
  } else {
    SCHEDULE_ASSIGNMENTS = data.scheduleAssignments || {};
    SECTION_PERIOD_OVERRIDE = data.sectionPeriodOverride || {};
  }
  SCHEDULE_CONFLICTS = data.scheduleConflicts || [];
  SCHEDULE_GENERATED_AT = data.scheduleGeneratedAt || null;
  RESOLVED_CONFLICTS = data.resolvedConflicts || [];
  CONFLICT_HISTORY = data.conflictHistory || [];
  conflictHistoryIdCounter = data.conflictHistoryIdCounter || (CONFLICT_HISTORY.length+1);

  if(data.schoolYears && data.schoolYears.length){
    SCHOOL_YEARS.length = 0; SCHOOL_YEARS.push(...data.schoolYears);
  }
  schoolYearCounter = data.schoolYearCounter || (SCHOOL_YEARS.length+1);
  CURRENT_SCHOOL_YEAR_ID = data.currentSchoolYearId || activeSchoolYear().id;
  if(data.terms && data.terms.length){
    TERMS.length = 0; TERMS.push(...data.terms);
  }
  syncTermOptions();
  termIdCounter = data.termIdCounter || (TERMS.length+1);
  CURRENT_TERM_ID = data.currentTermId || TERMS[0].id;
  SUBJECTS.length = 0; SUBJECTS.push(...(data.subjects||[]));
  subjectIdCounter = data.subjectIdCounter || (SUBJECTS.length+1);
}

async function loadData(){
  try{
    const value = await Store.get(STORAGE_KEY);
    if(value){
      applySnapshot(JSON.parse(value));
      return true;
    }
    // No stored value yet — this is the normal first run, not a failure.
    return false;
  }catch(e){
    // Store.get() itself never throws; this only fires if the saved JSON
    // is corrupted (JSON.parse) or applySnapshot() chokes on bad data.
    console.error("Storage load failed:", e);
    showToast("Saved data looked corrupted — starting from a clean, empty state instead.", true);
  }
  return false;
}

/* ---------- Modal + toast helpers ---------- */
function closeModal(){
  const root = document.getElementById("modalRoot");
  const backdrop = root.firstElementChild;
  if(!backdrop){ root.innerHTML = ""; return; }
  // Play the reverse fade/scale (see .modal-backdrop.closing in style.css)
  // before actually clearing the DOM, so dismissing a modal never feels
  // like an abrupt cut.
  backdrop.classList.add("closing");
  setTimeout(()=>{ if(root.firstElementChild===backdrop) root.innerHTML = ""; }, 150);
}
function showToast(msg, isError){
  const root = document.getElementById("toastRoot");
  const el = document.createElement("div");
  el.className = "toast" + (isError?" error":"");
  el.textContent = (isError ? "⚠️ " : "✅ ") + msg;
  root.appendChild(el);
  setTimeout(()=>{
    el.classList.add("leaving");
    setTimeout(()=>{ el.remove(); }, 180);
  }, 3000);
}
// Wraps an async click handler so the button shows a spinner and can't be
// clicked again mid-flight — prevents duplicate submissions on double
// clicks / slow storage writes. Restores the button's original label
// whether the handler succeeds or throws.
async function withButtonLoading(btn, fn){
  if(!btn || btn.classList.contains("is-loading")) return;
  const prevDisabled = btn.disabled;
  btn.classList.add("is-loading");
  btn.disabled = true;
  try{
    await fn();
  } finally {
    btn.classList.remove("is-loading");
    btn.disabled = prevDisabled;
  }
}
function openConfirm(message, onConfirm, confirmLabel){
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="confirmBackdrop">
      <div class="modal-box narrow">
        <div class="modal-head"><h3>Confirm</h3><button class="modal-close" id="confirmClose">&times;</button></div>
        <div class="modal-body"><p style="font-size:13.5px;color:var(--ink);margin:0;">${message}</p></div>
        <div class="modal-foot">
          <button class="btn ghost" id="confirmCancel">Cancel</button>
          <button class="btn" style="background:var(--maroon);" id="confirmOk">${confirmLabel||"Delete"}</button>
        </div>
      </div>
    </div>`;
  document.getElementById("confirmClose").onclick = closeModal;
  document.getElementById("confirmCancel").onclick = closeModal;
  document.getElementById("confirmBackdrop").addEventListener("click", e=>{ if(e.target.id==="confirmBackdrop") closeModal(); });
  document.getElementById("confirmOk").onclick = (e)=>{ e.currentTarget.disabled = true; closeModal(); onConfirm(); };
}

/* =========================================================
   2. ADMIN-CONFIGURABLE BELL SCHEDULE STATE
   ========================================================= */
let ADMIN_START = "07:30"; // 24h HH:MM, editable by Admin
// Senior High AM/PM double-shift boundary: the clock time (24h HH:MM) a
// Grade 11/12 PM-Class section's bell schedule starts at. AM-Class sections
// keep using their grade's normal startTime above; their periods must
// finish before this boundary or it's flagged as an AM/PM Shift Conflict.
// Admin-editable from Settings → Senior High AM/PM Shift Settings.
let SHS_PM_START = "12:30";
let SCHOOL_NAME = "ATLAS National High School"; // shown on the Final Classroom Schedule view and its printouts, editable by Admin
let SCHOOL_LOGO = ""; // data-URL (base64) of the uploaded school logo, editable by Admin; "" = no logo set

// Every grade level now has THREE staggered break periods per day:
//   - Morning ("Day") Break — 15 minutes by default
//   - Lunch — 60 minutes (1 hour) by default
//   - Afternoon Break — 15 minutes by default
// All of the *At (minutes-after-school-start) and *Len (duration) values
// are fully Admin-editable per grade level from Settings → Per-Grade-Level
// Bell Configuration; these are simply the DepEd-aligned starting defaults.
// Each Grade Level has its own class starting time (fully Admin-editable
// from Settings → Per-Grade-Level Bell Configuration). The samples below
// stagger by 15 minutes per level, matching the school's default pattern,
// but the Admin can set any value per grade.
const DEFAULT_CONFIG = {
  "Grade 7": {startTime:"07:00", periods:9, periodLen:50, amBreakAt:100, amBreakLen:15, lunchAt:265, lunchLen:60, pmBreakAt:475, pmBreakLen:15},
  "Grade 8": {startTime:"07:15", periods:9, periodLen:50, amBreakAt:110, amBreakLen:15, lunchAt:275, lunchLen:60, pmBreakAt:485, pmBreakLen:15},
  "Grade 9": {startTime:"07:30", periods:9, periodLen:50, amBreakAt:120, amBreakLen:15, lunchAt:285, lunchLen:60, pmBreakAt:495, pmBreakLen:15},
  "Grade 10":{startTime:"07:45", periods:9, periodLen:50, amBreakAt:130, amBreakLen:15, lunchAt:295, lunchLen:60, pmBreakAt:505, pmBreakLen:15},
  "Grade 11":{startTime:"08:00", periods:8, periodLen:60, amBreakAt:120, amBreakLen:15, lunchAt:315, lunchLen:60, pmBreakAt:495, pmBreakLen:15},
  "Grade 12":{startTime:"08:15", periods:8, periodLen:60, amBreakAt:130, amBreakLen:15, lunchAt:325, lunchLen:60, pmBreakAt:505, pmBreakLen:15}
};
let GRADE_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

// Upgrades bell-schedule data saved by an older version of ATLAS (which only
// had a single "breakAt/breakLen" morning break, no separate afternoon
// break, and a 45-min default lunch) into the current three-break shape, so
// existing saved schedules keep working after this update instead of
// crashing on missing fields. Any grade already in the new shape passes
// through untouched.
function migrateGradeConfig(raw){
  const out = {};
  GRADE_ORDER.forEach(g=>{
    const c = raw[g] || DEFAULT_CONFIG[g];
    const def = DEFAULT_CONFIG[g];
    out[g] = {
      // Legacy saves had one shared school-wide start time (ADMIN_START) and
      // no per-grade value at all — fall back to that so an existing school's
      // schedule doesn't silently shift on upgrade, but a brand-new grade
      // config with no legacy value at all gets the staggered default.
      startTime: c.startTime!=null ? c.startTime : (raw._legacyStart || def.startTime),
      periods: c.periods!=null ? c.periods : def.periods,
      periodLen: c.periodLen!=null ? c.periodLen : def.periodLen,
      amBreakAt: c.amBreakAt!=null ? c.amBreakAt : (c.breakAt!=null ? c.breakAt : def.amBreakAt),
      amBreakLen: c.amBreakLen!=null ? c.amBreakLen : (c.breakLen!=null ? c.breakLen : def.amBreakLen),
      lunchAt: c.lunchAt!=null ? c.lunchAt : def.lunchAt,
      lunchLen: c.lunchLen!=null ? c.lunchLen : def.lunchLen,
      pmBreakAt: c.pmBreakAt!=null ? c.pmBreakAt : def.pmBreakAt,
      pmBreakLen: c.pmBreakLen!=null ? c.pmBreakLen : def.pmBreakLen
    };
  });
  return out;
}

/* =========================================================
   2A. PER-DAY SCHEDULING + MANUAL OVERRIDE LAYER
   Monday–Thursday are always active teaching days. Friday is
   admin-controlled (FRIDAY_ENABLED) — when off, the auto-generator
   skips it, but the Admin can still manually place entries there.
   SUBJECT_DURATIONS lets the Admin set a specific period length (in
   minutes) per subject; subjects with no override fall back to the
   grade level's default periodLen.
   Manual edits are stored SEPARATELY from the auto-generated grid
   (MANUAL_OVERRIDES / MANUAL_EXTRA) so that regenerating the
   auto-schedule never silently destroys them.
   ========================================================= */
const SCHOOL_DAYS = ["Mon","Tue","Wed","Thu","Fri"];
const DAY_FULL_NAME = { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday", Fri:"Friday" };
let FRIDAY_ENABLED = false; // Admin-controlled; Mon–Thu are always on
function activeDays(){ return FRIDAY_ENABLED ? SCHOOL_DAYS.slice() : SCHOOL_DAYS.slice(0,4); }
function isDayActive(day){ return activeDays().includes(day); }

let SUBJECT_DURATIONS = {}; // subjectName -> minutes (overrides grade default periodLen)
function durationForSubject(subject, gradeCfg){ return SUBJECT_DURATIONS[subject] || gradeCfg.periodLen; }

// key "sectionId|day|periodIdx" -> {subject:string|null, teacherId:string|null}
// A null subject means the Admin manually cleared/deleted that auto-generated slot.
let MANUAL_OVERRIDES = {};
// Freeform manually-added entries, fully independent of the auto period grid.
// {id, sectionId, day, subject, teacherId, start, end}
let MANUAL_EXTRA = [];
let extraEntryCounter = 1;
function scheduleKey(sectionId, day, periodIdx){ return sectionId+"|"+day+"|"+periodIdx; }

let SELECTED_SCHED_DAY = "Mon";

/* =========================================================
   3. TIME HELPERS
   ========================================================= */
function esc(s){ return (s||"").toString().replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"); }
function toMinutes(hhmm){ const [h,m] = hhmm.split(":").map(Number); return h*60+m; }
function fmt(mins){
  mins = ((mins%1440)+1440)%1440;
  let h = Math.floor(mins/60), m = mins%60;
  const ap = h>=12 ? "PM":"AM";
  let h12 = h%12; if(h12===0) h12=12;
  return h12+":"+String(m).padStart(2,"0")+" "+ap;
}
// 24h "HH:MM" — the shape stored in GRADE_CONFIG[g].startTime / ADMIN_START
// and understood by <input type="time">, as opposed to fmt()'s 12h display form.
function fmt24(mins){
  mins = ((mins%1440)+1440)%1440;
  return String(Math.floor(mins/60)).padStart(2,"0")+":"+String(mins%60).padStart(2,"0");
}
// The allowed clock-time window for a Grade 11/12 section's Class Shift.
// "AM" must fit entirely before SHS_PM_START; "PM" must start at/after it.
// "None"/unset returns null — no window restriction at all.
function shsShiftWindow(shift){
  const boundary = toMinutes(SHS_PM_START || "12:30");
  if(shift==="AM") return { start:0, end: boundary };
  if(shift==="PM") return { start: boundary, end: 24*60 };
  return null;
}

/* =========================================================
   4. SCHEDULE + ASSIGNMENT ENGINE
   ========================================================= */
// The subject list a section is taught, strictly scoped to the currently
// selected School Year + Term (see School Year &amp; Terms page). This is what
// ties Teaching Load, Section Allocation, Classroom Scheduling, and the AI
// Schedule Generator to one School Year/Term at a time — subjects from a
// different School Year or Term are never mixed in.
// `day` is optional: pass a SCHOOL_DAYS value ("Mon".."Fri") to scope the
// result to what should actually appear in that day's rotation — Friday-Only
// subjects are excluded on Mon–Thu and included on Fri; a Whole-Year/regular
// subject appears on every day. Omit `day` (e.g. for aggregate views like
// Teaching Load's subject union, or a section's total subject count) to get
// every subject regardless of day scope.
function subjectsForSection(section, day){
  const generatedAll = SUBJECTS.filter(s=>
    s.schoolYearId===CURRENT_SCHOOL_YEAR_ID &&
    s.termId===CURRENT_TERM_ID &&
    s.grade===section.grade &&
    s.status==="Active" &&
    (!s.strand || s.strand===section.strand)
  );
  const generatedScoped = day ? generatedAll.filter(s=> subjectAllowedOnDay(s, day)) : generatedAll;
  return generatedScoped.map(s=>s.name);
  // Nothing hard-coded here: if no Subject record exists yet for this exact
  // School Year/Term/Grade(/Strand), this simply returns an empty list.
  // buildTimelineRaw fills any resulting empty period slots with the
  // NO_SUBJECT_PLACEHOLDER instead of a made-up subject name, and
  // collectScheduleJobs never generates a teacher assignment for those
  // slots — so nothing is ever auto-invented the way the old DepEd-default
  // fallback used to. The moment the Admin adds a real Subject record here,
  // it appears automatically.
}
// Normalizes a Subject's Schedule Days setting to one of three values:
// "mon-thu" (never scheduled on Friday, even if Friday is an active school
// day), "mon-fri" (the default — every active school day, including Friday
// when enabled), or "friday-only" (Friday exclusively). Reads the legacy
// boolean `fridayOnly` field for any record saved before this option
// existed, so nothing already in the database silently changes behavior.
function subjectScheduleDays(s){
  if(s.scheduleDays && ["mon-thu","mon-fri","friday-only"].includes(s.scheduleDays)) return s.scheduleDays;
  return s.fridayOnly ? "friday-only" : "mon-fri";
}
function subjectAllowedOnDay(s, day){
  const sd = subjectScheduleDays(s);
  if(day==="Fri") return sd!=="mon-thu";
  return sd!=="friday-only";
}
function scheduleDaysLabel(sd){
  return sd==="mon-thu" ? '<span class="tag">Monday–Thursday</span>'
    : sd==="friday-only" ? '<span class="tag gold">Friday Only</span>'
    : '<span class="hint">Monday–Friday</span>';
}

// The Program ("Regular" / "Special Program") of a given subject NAME, as
// scoped to this section's grade/strand/School-Year/Term — looked up from
// the actual Subject record the Admin created, if one exists. Returns null
// when there's no matching Subject record (e.g. the NO_SUBJECT_PLACEHOLDER,
// or legacy data) — meaning "unknown, don't enforce a Program match" rather
// than a mismatch.
function subjectProgramFor(subjectName, section){
  const rec = SUBJECTS.find(s=>
    s.schoolYearId===CURRENT_SCHOOL_YEAR_ID && s.termId===CURRENT_TERM_ID &&
    s.grade===section.grade && (!s.strand || s.strand===section.strand) &&
    s.name===subjectName && s.status==="Active"
  );
  return rec ? (rec.program || "Regular") : null;
}
// Does this subject's Program match the section's Section Type? Subjects
// with no explicit Program on record (subjectProgramFor === null) are
// always considered compatible — there's nothing to enforce against.
function programsCompatible(subjectName, section){
  const prog = subjectProgramFor(subjectName, section);
  if(prog==null) return true;
  return prog === (section.sectionType || "Regular");
}

// Builds the full day timeline for a section WITHOUT assigning teachers yet:
// array of blocks {type, start, end, subject?}. Purely a function of the
// grade's bell-schedule config, admin start time, and the section's subject
// list — deterministic, so it's safe to call any time.
function buildTimelineRaw(section, day){
  day = day || "Mon";
  const cfg = GRADE_CONFIG[section.grade];
  const subs = subjectsForSection(section, day);
  const seq = [];
  for(let i=0;i<cfg.periods;i++) seq.push(subs.length ? subs[i % subs.length] : NO_SUBJECT_PLACEHOLDER);

  // Grade 11/12 PM-Class sections run the same period structure/durations
  // as their grade's normal bell config, just starting from the school's
  // SHS PM-shift boundary instead of that grade's normal (AM) start time.
  // AM-Class and None sections are unaffected.
  const effectiveStart = (isSHSGrade(section.grade) && section.classShift==="PM")
    ? (SHS_PM_START || cfg.startTime || ADMIN_START)
    : (cfg.startTime || ADMIN_START);
  const startMin = toMinutes(effectiveStart);
  let cur = startMin, placed = 0, amBreakDone=false, lunchDone=false, pmBreakDone=false, pIdx=0;
  const timeline = [];
  while(placed < cfg.periods){
    const elapsed = cur - startMin;
    if(!amBreakDone && elapsed >= cfg.amBreakAt){
      timeline.push({type:"break", subtype:"am", start:cur, end:cur+cfg.amBreakLen});
      cur += cfg.amBreakLen; amBreakDone = true; continue;
    }
    if(!lunchDone && elapsed >= cfg.lunchAt){
      timeline.push({type:"lunch", start:cur, end:cur+cfg.lunchLen});
      cur += cfg.lunchLen; lunchDone = true; continue;
    }
    if(!pmBreakDone && elapsed >= cfg.pmBreakAt){
      timeline.push({type:"break", subtype:"pm", start:cur, end:cur+cfg.pmBreakLen});
      cur += cfg.pmBreakLen; pmBreakDone = true; continue;
    }
    const dayOverride = SECTION_PERIOD_OVERRIDE[section.id] && SECTION_PERIOD_OVERRIDE[section.id][day];
    const subject = (dayOverride && dayOverride[pIdx]!==undefined) ? dayOverride[pIdx] : seq[pIdx];
    const dur = durationForSubject(subject, cfg);
    timeline.push({type:"period", start:cur, end:cur+dur, subject, periodIdx:pIdx, day});
    cur += dur; placed++; pIdx++;
  }
  // Any break/lunch whose threshold was never reached during the period loop
  // (e.g. an Admin-set time beyond the last period) is still appended at the
  // end of the day, in am-break → lunch → pm-break order, so it's never lost.
  if(!amBreakDone){ timeline.push({type:"break", subtype:"am", start:cur, end:cur+cfg.amBreakLen}); cur += cfg.amBreakLen; }
  if(!lunchDone){ timeline.push({type:"lunch", start:cur, end:cur+cfg.lunchLen}); cur += cfg.lunchLen; }
  if(!pmBreakDone){ timeline.push({type:"break", subtype:"pm", start:cur, end:cur+cfg.pmBreakLen}); cur += cfg.pmBreakLen; }
  return timeline;
}

// Builds the full day timeline for a section WITH teachers filled in from the
// most recently generated SCHEDULE_ASSIGNMENTS map. Periods that have not
// been assigned yet (e.g. a brand-new section before the schedule has been
// regenerated) come back with teacherId:null and render as "Unassigned".
function buildTimeline(section, day){
  day = day || "Mon";
  const timeline = buildTimelineRaw(section, day);
  timeline.forEach(b=>{
    if(b.type==="period"){
      b.teacherId = SCHEDULE_ASSIGNMENTS[scheduleKey(section.id, day, b.periodIdx)] || null;
      b.source = "auto";
      const mo = MANUAL_OVERRIDES[scheduleKey(section.id, day, b.periodIdx)];
      if(mo){
        b.source = "manual";
        b.subject = mo.subject; // may be null => manually cleared/deleted
        b.teacherId = mo.teacherId;
      }
    }
  });
  // Drop slots the Admin manually cleared, then splice in freeform manual entries.
  let out = timeline.filter(b=> !(b.type==="period" && b.source==="manual" && !b.subject));
  const extras = MANUAL_EXTRA.filter(e=> e.sectionId===section.id && e.day===day)
    .map(e=> ({type:"period", start:e.start, end:e.end, subject:e.subject, teacherId:e.teacherId, periodIdx:null, day, source:"manual", extraId:e.id}));
  out = out.concat(extras).sort((a,b)=> a.start-b.start);
  return out;
}

/* =========================================================
   4A. AI-ASSIST — CONFLICT-FREE SCHEDULE & TEACHING-LOAD GENERATOR
   Runs a greedy, load-balancing constraint solver over every section's
   periods: for each class period it finds every teacher who (a) is tagged
   to teach that subject/level and (b) has no other section already booked
   at that exact clock time, then hands the period to whichever qualifying
   teacher currently has the lightest load. Anything it can't place (no
   qualified teacher, or all qualified teachers already busy) is reported
   back as a conflict instead of being silently double-booked.
   ========================================================= */
let SCHEDULE_ASSIGNMENTS = {};   // "sectionId|periodIdx" -> teacherId
let SCHEDULE_CONFLICTS = [];     // [{sectionLabel, subject, start, end, reason}]
let SCHEDULE_GENERATED_AT = null;
let CURRENT_TERM = "1st Term";   // which term the current schedule was generated for
// Section-level period->subject overrides written by the time-slot-swap
// Auto-Fix strategy (and, in principle, by a future manual "move subject"
// action). buildTimelineRaw() consults this before falling back to the
// default rotation, so a swap persists across re-renders and saves.
let SECTION_PERIOD_OVERRIDE = {}; // sectionId -> { periodIdx: subjectName }

function intervalsOverlap(aStart,aEnd,bStart,bEnd){ return aStart < bEnd && bStart < aEnd; }
let conflictIdCounter = 1;
function makeConflictId(){ return "CF"+(conflictIdCounter++); }
let LAST_AUTOFIX_SNAPSHOT = null; // {assignments, conflicts} captured right before the most recent Auto-Fix run, for Undo

/* =========================================================
   SCHEDULE CONFLICT MANAGEMENT — separate module
   Reads/validates Class Schedule data (SCHEDULE_CONFLICTS, SECTIONS,
   TEACHERS, ROOMS) and can request schedule changes (via Auto-Fix or
   manual resolution), but its own state — resolved history and the
   audit trail — is kept independent of the Class Schedule page so a
   change here can never break Class Schedule's own CRUD/rendering.
   ========================================================= */
let RESOLVED_CONFLICTS = [];   // conflicts that were Auto-Fixed / Manually Resolved / Ignored
let CONFLICT_HISTORY = [];     // append-only audit trail: {id, detectedAt, sectionLabel, subject, day, previous, resolutionMethod, action, finalStatus}
let conflictHistoryIdCounter = 1;
let activeConflictTab = "all";
let SELECTED_CONFLICT_IDS = new Set(); // ids currently checked in the Schedule Conflicts list (All/Unresolved/Resolved)

function conflictRoomLabel(c){
  const section = SECTIONS.find(s=>s.id===c.section);
  if(!section || !section.roomId) return "—";
  const room = ROOMS.find(r=>r.id===section.roomId);
  return room ? room.name : "—";
}
function conflictTypeLabel(c){
  return c.type==="MISSING_QUALIFIED_TEACHER" ? "No Qualified Teacher"
    : c.type==="TEACHER_UNAVAILABLE" ? "Teacher Unavailable"
    : c.type==="TEACHING_LOAD_EXCEEDED" ? "Teaching-Load Limit Reached"
    : c.type==="PROGRAM_CONFLICT" ? "Program Conflict"
    : c.type==="TEACHER_SHIFT_CONFLICT" ? "Teacher Shift Conflict"
    : c.type==="AMPM_SHIFT_CONFLICT" ? "AM/PM Shift Conflict"
    : c.type==="ROOM_CONFLICT" ? "Room Conflict"
    : (c.type || "Scheduling Conflict");
}
const CONFLICT_HIGH_SEVERITY_TYPES = new Set([
  "MISSING_QUALIFIED_TEACHER","TEACHING_LOAD_EXCEEDED","PROGRAM_CONFLICT",
  "TEACHER_SHIFT_CONFLICT","AMPM_SHIFT_CONFLICT","ROOM_CONFLICT"
]);
function logConflictHistory(entry){
  CONFLICT_HISTORY.unshift({ id:"CH"+(conflictHistoryIdCounter++), detectedAt: entry.detectedAt || new Date().toISOString(), ...entry });
}
// Called whenever a fresh conflict set is produced (schedule generated /
// regenerated). Logs a "Detected" history row for each newly-open conflict
// and clears the previous run's resolved list — a new generation replaces
// the prior schedule's conflict set entirely.
function logConflictsDetected(conflicts){
  RESOLVED_CONFLICTS = [];
  conflicts.forEach(c=>{
    logConflictHistory({
      detectedAt: new Date().toISOString(),
      sectionLabel: c.sectionLabel, subject: c.subject, day: c.day,
      previous: "—", resolutionMethod: "—", action: "Detected", finalStatus: "Unresolved"
    });
  });
}
// Moves a conflict out of the unresolved list into Resolved with the given
// status/method, recording an audit trail entry.
function resolveConflictInto(conflict, status, method, actionDesc){
  SCHEDULE_CONFLICTS = SCHEDULE_CONFLICTS.filter(x=>x.id!==conflict.id);
  const resolved = { ...conflict, status };
  RESOLVED_CONFLICTS.unshift(resolved);
  logConflictHistory({
    sectionLabel: conflict.sectionLabel, subject: conflict.subject, day: conflict.day,
    previous: conflict.message || "—", resolutionMethod: method, action: actionDesc || method, finalStatus: status
  });
  return resolved;
}
function ignoreConflict(conflictId){
  const c = SCHEDULE_CONFLICTS.find(x=>x.id===conflictId);
  if(!c) return;
  openConfirm(`Mark this conflict as Ignored? It will be removed from Unresolved Conflicts and kept in the resolution history — the underlying period will remain unassigned.`, async ()=>{
    resolveConflictInto(c, "Ignored", "Ignored by Admin", "Marked Ignored");
    await saveData();
    renderAll();
    showToast("Conflict marked as Ignored.");
  }, "Mark Ignored");
}

// Every (section, period) that needs a teacher, for the CURRENT_TERM's
// subject list. Kept separate from the assignment loop below so the Auto-Fix
// solver can re-run the assignment over the same jobs in a different order.
function collectScheduleJobs(opts){
  opts = opts || {};
  const days = opts.days || activeDays(); // Mon–Thu always; Fri only if the Admin enabled it (or overridden per-run)
  const sections = opts.sections || SECTIONS;
  const jobs = [];
  sections.forEach(section=>{
    days.forEach(day=>{
      const raw = buildTimelineRaw(section, day);
      raw.filter(b=>b.type==="period" && b.subject!==NO_SUBJECT_PLACEHOLDER).forEach(b=> jobs.push({ section, block:b }));
    });
  });
  return jobs;
}

// Who, in principle, could teach this job (ignoring the running load count
// used only to break ties)? When `gradeLoadUsed` is supplied, a teacher who
// has already reached their Admin-set per-grade teaching-load limit for
// section.grade is excluded — this is a hard scheduling constraint, not a
// tie-breaker, per the Grade-Level Teaching Assignment feature.
function candidatesForJob(section, block, loadCount, gradeLoadUsed){
  // A subject whose Program doesn't match this section's Section Type can
  // never be validly staffed here — no teacher reassignment fixes that, so
  // this is reported up front as a Program Conflict (see
  // classifyAndDescribeConflict) rather than a staffing gap.
  if(!programsCompatible(block.subject, section)) return [];
  const shiftRestricted = isSHSGrade(section.grade) && section.classShift && section.classShift!=="None";
  const candidates = TEACHERS.filter(t=>
    t.tiers.includes(section.grade) &&
    teacherCanTeach(t, block.subject) &&
    canTeacherTakeGradeLoad(t, section, block.subject, gradeLoadUsed) &&
    (!shiftRestricted || shiftsCompatible(teacherShiftFor(t, section.grade), section.classShift))
  ).map(t=>t.id);
  candidates.sort((x,y)=> (loadCount[x]||0)-(loadCount[y]||0)); // least-loaded first
  return candidates;
}

// Greedily assigns every job in the given order. Order matters: a period
// processed earlier gets first pick of its qualified, free teachers, so
// re-running this over a different job order (see autoFixConflicts) can
// resolve conflicts a naive left-to-right pass could not.
// Who is occupying `cand` at this time, and in which section/subject —
// used to build a specific, actionable conflict message instead of a
// generic "someone's busy" note.
function whoIsBusyAt(busy, jobsByTeacherSlot, cand, day, start, end){
  const slot = jobsByTeacherSlot[cand] || [];
  const hit = slot.find(j=>j.day===day && intervalsOverlap(j.start,j.end,start,end));
  return hit || null;
}

function classifyAndDescribeConflict(section, block, candidates, jobsByTeacherSlot, gradeLoadUsed){
  const sectionLabel = section.grade+" - "+section.name;
  const dayName = DAY_FULL_NAME[block.day] || block.day;
  const id = makeConflictId();
  const shiftRestricted = isSHSGrade(section.grade) && section.classShift && section.classShift!=="None";

  // Program Conflict — the subject's Program (Regular / Special Program)
  // doesn't match this section's Section Type. No teacher reassignment or
  // time-slot move can fix a subject/section program mismatch.
  if(!programsCompatible(block.subject, section)){
    const subjProgram = subjectProgramFor(block.subject, section) || "Regular";
    const secProgram = section.sectionType || "Regular";
    return {
      id, type:"PROGRAM_CONFLICT", severity:"high",
      sectionLabel, section: section.id, subject: block.subject, day: block.day,
      start: block.start, end: block.end,
      reason: `${block.subject} is a ${subjProgram} subject but ${sectionLabel} is a ${secProgram} section`,
      message: `${block.subject} is tagged as a ${subjProgram} subject, which doesn't match ${sectionLabel}'s Section Type (${secProgram}).`,
      possibleSolutions: [
        `Change ${block.subject}'s Program (Subjects page) to ${secProgram}`,
        `Change ${sectionLabel}'s Section Type (Sections page) to ${subjProgram}`,
        `Replace ${block.subject} with a ${secProgram} subject for this section`
      ],
      affectedScheduleIds: [scheduleKey(section.id, block.day, block.periodIdx)],
      status: "OPEN"
    };
  }

  if(candidates.length===0){
    // Distinguish "nobody is qualified at all" vs "qualified, but every
    // one's AM/PM assignment conflicts with this section's shift" vs
    // "qualified (and shift-OK) but every one has already hit the
    // Admin-set teaching-load limit" — each needs a different fix.
    const qualifiedIgnoringCapAndShift = TEACHERS.filter(t=> t.tiers.includes(section.grade) && teacherCanTeach(t, block.subject));
    if(qualifiedIgnoringCapAndShift.length>0){
      const shiftOk = t => !shiftRestricted || shiftsCompatible(teacherShiftFor(t, section.grade), section.classShift);
      const passingShift = qualifiedIgnoringCapAndShift.filter(shiftOk);
      if(shiftRestricted && passingShift.length===0){
        const shiftDetails = qualifiedIgnoringCapAndShift.slice(0,3).map(t=>`${t.name} is set to ${teacherShiftFor(t, section.grade)} Class for ${section.grade}`);
        return {
          id, type:"TEACHER_SHIFT_CONFLICT", severity:"high",
          sectionLabel, section: section.id, subject: block.subject, day: block.day,
          start: block.start, end: block.end,
          reason: `Every qualified teacher's ${section.grade} Class Shift conflicts with ${sectionLabel}'s ${section.classShift} Class`,
          message: `${sectionLabel} is a ${section.classShift} Class, but every teacher qualified for ${block.subject} is assigned to the opposite shift for ${section.grade} (${dayName}).`,
          possibleSolutions: [
            ...shiftDetails.map(d=>`Update Class Shift: ${d}`),
            `Set a qualified teacher's ${section.grade} Class Shift to ${section.classShift} or None in Teacher Management`,
            `Change ${sectionLabel}'s Class Shift if it was set in error`
          ],
          affectedScheduleIds: [scheduleKey(section.id, block.day, block.periodIdx)],
          status: "OPEN"
        };
      }
      const capPool = passingShift.length>0 ? passingShift : qualifiedIgnoringCapAndShift;
      const capOk = t => canTeacherTakeGradeLoad(t, section, block.subject, gradeLoadUsed);
      const passingCap = capPool.filter(capOk);
      if(passingCap.length===0){
        const bucket = sectionProgramBucket(section);
        const bucketLabel = bucket==="special" ? "Special Program" : "Regular Class";
        const capDetails = capPool.slice(0,3).map(t=>{
          const cap = teacherGradeCap(t, section.grade, bucket);
          const used = (gradeLoadUsed && gradeLoadUsed[t.id] && gradeLoadUsed[t.id][section.grade] && gradeLoadUsed[t.id][section.grade][bucket]) ? gradeLoadUsed[t.id][section.grade][bucket].size : 0;
          return `${t.name} is already at ${used}/${cap} ${bucketLabel} teaching loads for ${section.grade}`;
        });
        return {
          id, type:"TEACHING_LOAD_EXCEEDED", severity:"high",
          sectionLabel, section: section.id, subject: block.subject, day: block.day,
          start: block.start, end: block.end,
          reason: `Every teacher qualified for ${block.subject} has reached the Admin-set ${bucketLabel} teaching-load limit for ${section.grade}`,
          message: `${capPool.length} qualified teacher${capPool.length===1?" has":"s have"} already reached the maximum ${bucketLabel} teaching load Admin set for ${section.grade} (${dayName}).`,
          possibleSolutions: [
            ...capDetails.map(d=>`Raise the limit: ${d}`),
            `Increase the ${section.grade} ${bucketLabel} teaching-load limit for a qualified teacher in Teacher Management`,
            `Assign another teacher to teach ${section.grade} in Teacher Management`
          ],
          affectedScheduleIds: [scheduleKey(section.id, block.day, block.periodIdx)],
          status: "OPEN"
        };
      }
    }
    return {
      id, type:"MISSING_QUALIFIED_TEACHER", severity:"high",
      sectionLabel, section: section.id, subject: block.subject, day: block.day,
      start: block.start, end: block.end,
      reason: "No teacher is tagged with a matching specialization or subject",
      message: `No qualified teacher is tagged to teach ${block.subject} for ${section.tier==="SHS"?"this strand":section.grade} (${dayName}).`,
      possibleSolutions: [
        `Tag an existing teacher's specialization to include ${subjectLearningArea(block.subject)}`,
        `Add a new teacher qualified to teach ${block.subject}`,
        `Assign the class period to a teacher with an approved equivalent specialization`
      ],
      affectedScheduleIds: [scheduleKey(section.id, block.day, block.periodIdx)],
      status: "OPEN"
    };
  }
  // Qualified teachers exist but all are busy elsewhere at this exact time.
  const busyDetails = candidates.slice(0,3).map(cid=>{
    const t = teacherById(cid);
    const hit = whoIsBusyAt(null, jobsByTeacherSlot, cid, block.day, block.start, block.end);
    if(hit) return `${t.name} is teaching ${hit.subject} for ${hit.sectionLabel} on ${dayName} at this time`;
    return `${t.name} is unavailable at this time`;
  });
  return {
    id, type:"TEACHER_UNAVAILABLE", severity:"medium",
    sectionLabel, section: section.id, subject: block.subject, day: block.day,
    start: block.start, end: block.end,
    reason: "Every qualified teacher is already teaching another section at this time",
    message: `${candidates.length} qualified teacher${candidates.length===1?" is":"s are"} tagged for ${block.subject}, but all ${candidates.length===1?"is":"are"} already booked ${dayName} ${fmt(block.start)}–${fmt(block.end)}.`,
    possibleSolutions: [
      ...busyDetails.map(d=>`Free up: ${d}`),
      ...candidates.slice(0,3).map(cid=>`Reassign ${teacherById(cid).name} here and move their other class`),
      `Move ${block.subject} to a different period for ${sectionLabel}`
    ],
    affectedScheduleIds: [scheduleKey(section.id, block.day, block.periodIdx)],
    status: "OPEN"
  };
}

// Room Conflicts — detected independently of the teacher-assignment engine
// (per "Keep Conflict Management Isolated"): a room is double-booked when
// two DIFFERENT sections that share the same Room/Building have overlapping
// period times on the same day. This is exactly what AM/PM shifting is
// meant to let schools avoid (an AM section and a PM section can safely
// share one room), so it also serves as a check that shifting was set up
// correctly. Never attempted by Auto-Fix (the real fix is an Admin
// reassigning a room or a shift) — always reported, never silently
// resolved. IDs are deterministic (not makeConflictId()) so the same
// underlying clash keeps the same conflict identity across regenerations,
// instead of being misread as "fixed" just because Auto-Fix ran.
function detectRoomConflicts(){
  const conflicts = [];
  const days = activeDays();
  const byRoom = {};
  SECTIONS.forEach(section=>{
    if(!section.roomId) return;
    days.forEach(day=>{
      buildTimelineRaw(section, day).filter(b=>b.type==="period").forEach(b=>{
        (byRoom[section.roomId] = byRoom[section.roomId]||[]).push({ section, day, start:b.start, end:b.end, subject:b.subject, periodIdx:b.periodIdx });
      });
    });
  });
  Object.entries(byRoom).forEach(([roomId, entries])=>{
    for(let i=0;i<entries.length;i++){
      for(let j=i+1;j<entries.length;j++){
        const a = entries[i], b = entries[j];
        if(a.section.id===b.section.id || a.day!==b.day) continue;
        if(!intervalsOverlap(a.start,a.end,b.start,b.end)) continue;
        const room = ROOMS.find(r=>r.id===roomId);
        const dayName = DAY_FULL_NAME[a.day] || a.day;
        const [firstSec, secondSec] = a.section.id < b.section.id ? [a,b] : [b,a];
        conflicts.push({
          id: "RMCF_"+roomId+"_"+a.day+"_"+firstSec.section.id+"_"+secondSec.section.id+"_"+firstSec.start,
          type:"ROOM_CONFLICT", severity:"high",
          sectionLabel: firstSec.section.grade+" - "+firstSec.section.name,
          section: firstSec.section.id, subject: firstSec.subject, day: a.day, start: firstSec.start, end: firstSec.end,
          reason: `${room?room.name:"This room"} is booked by two sections at the same time`,
          message: `${room?room.name:"This room"} is shared by ${firstSec.section.grade} - ${firstSec.section.name} and ${secondSec.section.grade} - ${secondSec.section.name}, both meeting ${dayName} ${fmt(a.start)}–${fmt(a.end)}.`,
          possibleSolutions: [
            `Assign ${secondSec.section.grade} - ${secondSec.section.name} to a different room`,
            `Set one section's Class Shift (AM/PM) so the two no longer overlap`,
            `Adjust one section's bell schedule so the two no longer overlap`
          ],
          affectedScheduleIds: [scheduleKey(firstSec.section.id, a.day, firstSec.periodIdx), scheduleKey(secondSec.section.id, a.day, secondSec.periodIdx)],
          status: "OPEN"
        });
      }
    }
  });
  return conflicts;
}

// AM/PM Shift Misconfiguration — a genuine, section-level structural problem:
// a Grade 11/12 section's Class Shift contradicts its own grade's bell
// configuration (e.g. an "AM Class" section whose grade-level start time is
// already at/after the school's PM-shift boundary). Checked once per
// section (not once per period — a per-period check would spuriously fire
// on every period once a normal full-day bell schedule runs past noon,
// which the default DepEd-aligned bell configuration always does). Never
// attempted by Auto-Fix; the real fix is an Admin adjusting the grade's
// bell configuration, the Section's Class Shift, or the school-wide PM
// boundary in Settings. Deterministic ID so repeated runs recognize the
// same still-open misconfiguration instead of reporting it as new/fixed.
function detectShiftMisconfigurations(){
  const conflicts = [];
  SECTIONS.forEach(section=>{
    if(!isSHSGrade(section.grade) || !section.classShift || section.classShift==="None") return;
    if(section.classShift!=="AM") return; // PM sections always start exactly at the boundary by construction — never misconfigured
    const cfg = GRADE_CONFIG[section.grade];
    const boundary = toMinutes(SHS_PM_START || "12:30");
    const gradeStart = toMinutes(cfg.startTime || ADMIN_START);
    if(gradeStart < boundary) return; // starts in the morning — compatible
    const sectionLabel = section.grade+" - "+section.name;
    conflicts.push({
      id: "AMPMCF_"+section.id,
      type:"AMPM_SHIFT_CONFLICT", severity:"high",
      sectionLabel, section: section.id, subject:null, day:null, start:null, end:null,
      reason: `${section.grade}'s configured Class Start Time (${fmt(gradeStart)}) is at or after the school's PM Shift boundary (${fmt(boundary)})`,
      message: `${sectionLabel} is an AM Class, but ${section.grade}'s Class Start Time (${fmt(gradeStart)}, set in Per-Grade-Level Bell Configuration) is at or after the school's PM Shift boundary (${fmt(boundary)}, set in Schedule Settings) — an AM Class can never actually meet in the morning under this configuration.`,
      possibleSolutions: [
        `Move ${section.grade}'s Class Start Time earlier in Per-Grade-Level Bell Configuration`,
        `Move the Senior High PM Shift boundary later in Settings → Schedule Settings`,
        `Change ${sectionLabel}'s Class Shift to PM or None if it was set in error`
      ],
      affectedScheduleIds: [],
      status: "OPEN"
    });
  });
  return conflicts;
}

function runScheduleAssignment(jobs){
  const busy = {};             // teacherId -> [{day,start,end}, ...]
  const jobsByTeacherSlot = {}; // teacherId -> [{day,start,end,subject,sectionLabel}]
  const loadCount = {};        // teacherId -> periods assigned so far (for load balancing)
  const gradeLoadUsed = {};    // teacherId -> {grade: Set(sectionId::subject)} — hard per-grade cap tracker
  TEACHERS.forEach(t=>{ busy[t.id]=[]; jobsByTeacherSlot[t.id]=[]; loadCount[t.id]=0; gradeLoadUsed[t.id]={}; });

  const assignmentMap = {};
  const conflictJobs = []; // {section, block, candidates}

  jobs.forEach(({section, block})=>{
    const candidates = candidatesForJob(section, block, loadCount, gradeLoadUsed);
    let chosen = null;
    for(const cand of candidates){
      const clashes = busy[cand].some(j=>j.day===block.day && intervalsOverlap(j.start,j.end,block.start,block.end));
      if(!clashes){ chosen = cand; break; }
    }
    if(chosen){
      busy[chosen].push({day:block.day, start:block.start, end:block.end});
      jobsByTeacherSlot[chosen].push({day:block.day, start:block.start,end:block.end,subject:block.subject,sectionLabel:section.grade+" - "+section.name});
      loadCount[chosen]++;
      const bucket = sectionProgramBucket(section);
      gradeLoadUsed[chosen][section.grade] = gradeLoadUsed[chosen][section.grade] || { regular:new Set(), special:new Set() };
      gradeLoadUsed[chosen][section.grade][bucket].add(gradeLoadComboKey(section, block.subject));
      assignmentMap[scheduleKey(section.id, block.day, block.periodIdx)] = chosen;
    } else {
      conflictJobs.push({section, block, candidates});
    }
  });

  const conflicts = conflictJobs.map(({section, block, candidates})=>
    classifyAndDescribeConflict(section, block, candidates, jobsByTeacherSlot, gradeLoadUsed)
  );

  return { assignmentMap, conflicts, loadCount, busy, jobsByTeacherSlot, gradeLoadUsed };
}

// term: optional — "1st Term" | "2nd Term" | "3rd Term". When provided, this
// becomes the schedule's CURRENT_TERM and every section's subject list is
// filtered accordingly (Whole-Year subjects are always included).
// generateSchedule(opts) — opts is optional and backward compatible:
//   generateSchedule() or generateSchedule("Term 2")  → old behavior, full
//     regenerate of every grade using the saved Friday setting.
//   generateSchedule({ term, grades, dayMode }) → scoped regenerate:
//     - grades: array of Grade Level names to (re)generate, e.g.
//       ["Grade 7","Grade 8"]. Omit/empty = all grades. Every OTHER
//       grade's saved schedule (including any manual edits) is left
//       completely untouched — only the targeted grades' jobs are
//       recomputed and merged back in.
//     - dayMode: "mon-thu" | "mon-fri" — a ONE-TIME override for this
//       generation run only. It does not change the saved Friday Schedule
//       setting in Admin Settings; omit it to use that saved setting.
function generateSchedule(opts){
  opts = (typeof opts === "string") ? { term: opts } : (opts || {});
  if(opts.term){ CURRENT_TERM = opts.term; CURRENT_TERM_ID = termIdByName(opts.term); }

  const gradeFilter = (opts.grades && opts.grades.length) ? new Set(opts.grades) : null; // null = all grades
  // "mon-fri" only ever takes effect when Friday Schedule is actually enabled
  // admin-wide — this is a hard guarantee, not just a UI-level restriction,
  // so Friday can never end up in the generated schedule while it's off.
  const days = opts.dayMode==="mon-fri" ? (FRIDAY_ENABLED ? SCHOOL_DAYS.slice() : SCHOOL_DAYS.slice(0,4))
             : opts.dayMode==="mon-thu" ? SCHOOL_DAYS.slice(0,4)
             : activeDays(); // no override supplied — use the saved Admin Settings default

  const targetSections = gradeFilter ? SECTIONS.filter(s=>gradeFilter.has(s.grade)) : SECTIONS;
  const targetSectionIds = new Set(targetSections.map(s=>s.id));

  if(gradeFilter){
    Object.keys(SECTION_PERIOD_OVERRIDE).forEach(sid=>{ if(targetSectionIds.has(sid)) delete SECTION_PERIOD_OVERRIDE[sid]; });
  } else {
    SECTION_PERIOD_OVERRIDE = {}; // full regenerate starts from the default rotation again
  }

  const result = solveJobsBestEffort(collectScheduleJobs({ days, sections: targetSections }));

  if(gradeFilter){
    // Scoped run: replace only the targeted sections' assignments/conflicts,
    // keep everything else exactly as it was.
    Object.keys(SCHEDULE_ASSIGNMENTS).forEach(k=>{ if(targetSectionIds.has(k.split("|")[0])) delete SCHEDULE_ASSIGNMENTS[k]; });
    Object.assign(SCHEDULE_ASSIGNMENTS, result.assignmentMap);
    SCHEDULE_CONFLICTS = SCHEDULE_CONFLICTS.filter(c=>!targetSectionIds.has(c.section)).concat(result.conflicts);
  } else {
    SCHEDULE_ASSIGNMENTS = result.assignmentMap;
    SCHEDULE_CONFLICTS = result.conflicts;
  }
  // Room Conflicts and AM/PM Shift Misconfigurations are school-wide checks
  // (a room clash can involve a section outside the regenerated grades), so
  // they're always fully recomputed regardless of scope.
  SCHEDULE_CONFLICTS = SCHEDULE_CONFLICTS.filter(c=>c.type!=="ROOM_CONFLICT" && c.type!=="AMPM_SHIFT_CONFLICT")
    .concat(detectRoomConflicts(), detectShiftMisconfigurations());
  SCHEDULE_GENERATED_AT = new Date().toISOString();
  logConflictsDetected(SCHEDULE_CONFLICTS);
  return result;
}

function shuffledCopy(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}

// ---- Targeted repair pass (Strategy: teacher displacement chain) ----------
// The global re-orderings above resolve conflicts that are purely an
// artifact of processing order. What's often left is a genuine resource
// clash: every qualified teacher for a slot is booked elsewhere at that
// exact time. For each of those, try a single-level displacement: pick a
// qualified teacher T who is busy elsewhere at this time; see if T's
// clashing assignment can be handed to a *different* qualified, free
// teacher instead. If so, T is freed for the conflict slot and the
// displaced assignment is safely re-homed — a genuine multi-step repair,
// not a retry. Every candidate move is validated before being applied.
function targetedDisplacementRepair(result, maxMoves){
  const { assignmentMap, busy, jobsByTeacherSlot } = result;
  let conflicts = result.conflicts.slice();
  const changes = []; // {key, subject, sectionLabel, fromTeacher, toTeacher, kind}
  let moves = 0;
  // Recomputed fresh from assignmentMap after every move (rather than
  // patched incrementally) so the per-grade teaching-load cap can never
  // drift out of sync with what actually got assigned.
  let gradeLoadUsed = computeGradeLoadUsage(assignmentMap);

  const stillOpen = [];
  for(const c of conflicts){
    // Structural conflicts (subject/section Program mismatch, or a bell
    // schedule that doesn't fit its AM/PM window) can never be solved by
    // reassigning a teacher — leave them as-is for Unsolved Conflicts.
    if(c.type==="PROGRAM_CONFLICT" || c.type==="AMPM_SHIFT_CONFLICT"){ stillOpen.push(c); continue; }
    if(moves >= maxMoves){ stillOpen.push(c); continue; }
    const section = SECTIONS.find(s=>s.id===c.section);
    const [ , , pIdxStr] = c.affectedScheduleIds[0].split("|");
    const block = { subject:c.subject, start:c.start, end:c.end, periodIdx: Number(pIdxStr), day:c.day };
    const candidates = candidatesForJob(section, block, {}, gradeLoadUsed);
    let resolved = false;

    if(candidates.length>0){
      for(const candId of candidates){
        // find what candId is doing at this exact time (their clash), same day
        const clashIdx = jobsByTeacherSlot[candId].findIndex(j=>j.day===block.day && intervalsOverlap(j.start,j.end,block.start,block.end));
        if(clashIdx===-1) continue; // shouldn't happen, but be safe
        const clashJob = jobsByTeacherSlot[candId][clashIdx];
        // find the schedule key for that clashing assignment so we can move it
        const clashKey = Object.keys(assignmentMap).find(k=>{
          if(assignmentMap[k]!==candId) return false;
          const [secId, kDay, pIdx] = k.split("|");
          if(kDay!==block.day) return false;
          const sec = SECTIONS.find(s=>s.id===secId);
          const raw = buildTimelineRaw(sec, kDay).find(b=>b.type==="period" && b.periodIdx===Number(pIdx));
          return raw && intervalsOverlap(raw.start, raw.end, clashJob.start, clashJob.end);
        });
        if(!clashKey) continue;
        const [clashSecId, clashDay, clashPIdx] = clashKey.split("|");
        const clashSection = SECTIONS.find(s=>s.id===clashSecId);
        const clashBlock = buildTimelineRaw(clashSection, clashDay).find(b=>b.type==="period" && b.periodIdx===Number(clashPIdx));

        // who else (besides candId) can qualifiedly cover clashBlock, and is free at its time?
        const altCandidates = candidatesForJob(clashSection, clashBlock, {}, gradeLoadUsed).filter(id=>id!==candId);
        const alt = altCandidates.find(id=> !busy[id].some(j=>j.day===clashDay && intervalsOverlap(j.start,j.end,clashBlock.start,clashBlock.end)));
        if(!alt) continue;

        // Validated — commit the displacement: candId takes the conflict slot,
        // alt takes over candId's old assignment.
        assignmentMap[clashKey] = alt;
        busy[alt].push({day:clashDay, start:clashBlock.start, end:clashBlock.end});
        jobsByTeacherSlot[alt].push({day:clashDay, start:clashBlock.start,end:clashBlock.end,subject:clashBlock.subject,sectionLabel:clashSection.grade+" - "+clashSection.name});
        jobsByTeacherSlot[candId] = jobsByTeacherSlot[candId].filter(j=>j!==clashJob);
        busy[candId] = busy[candId].filter(j=> !(j.day===clashDay && j.start===clashJob.start && j.end===clashJob.end));

        assignmentMap[c.affectedScheduleIds[0]] = candId;
        busy[candId].push({day:block.day, start:block.start, end:block.end});
        jobsByTeacherSlot[candId].push({day:block.day, start:block.start,end:block.end,subject:block.subject,sectionLabel:c.sectionLabel});

        changes.push({ key:c.affectedScheduleIds[0], subject:c.subject, sectionLabel:c.sectionLabel, fromTeacher:null, toTeacher:candId, kind:"assigned" });
        changes.push({ key:clashKey, subject:clashBlock.subject, sectionLabel:clashSection.grade+" - "+clashSection.name, fromTeacher:candId, toTeacher:alt, kind:"reassigned" });

        gradeLoadUsed = computeGradeLoadUsage(assignmentMap);
        resolved = true; moves++;
        break;
      }
    }
    if(!resolved) stillOpen.push(c);
  }

  // Re-describe whichever conflicts are still open with fresh candidate info
  // (some may now have different busy-teacher context after the moves above).
  const finalConflicts = stillOpen.map(c=>{
    const section = SECTIONS.find(s=>s.id===c.section);
    const [ , , pIdxStr2] = c.affectedScheduleIds[0].split("|");
    const block = { subject:c.subject, start:c.start, end:c.end, periodIdx: Number(pIdxStr2), day:c.day };
    const candidates = candidatesForJob(section, block, {}, gradeLoadUsed);
    const fresh = classifyAndDescribeConflict(section, block, candidates, jobsByTeacherSlot, gradeLoadUsed);
    fresh.status = candidates.length===0 ? "UNRESOLVED" : "UNRESOLVED";
    return fresh;
  });

  return { assignmentMap, conflicts: finalConflicts, changes, gradeLoadUsed };
}

// ---- Targeted repair pass (Strategy: time-slot / subject swap) -----------
// Some conflicts are structural: e.g. two sections that share the exact same
// bell schedule both need a subject that only one specialist teaches, at the
// exact same clock time. No teacher reassignment can fix that — the only
// real fix is moving the subject to a different period. This strategy looks,
// within the SAME section, for another period teaching a different subject
// and checks whether swapping the two subjects (and, if needed, their
// teachers) resolves the conflict without creating a new one. Writes to
// SECTION_PERIOD_OVERRIDE so the swap persists in the rendered timetable.
function timeSlotSwapRepair(result, maxMoves){
  const { assignmentMap, busy, jobsByTeacherSlot } = result;
  const stillOpen = [];
  const changes = [];
  let moves = 0;
  // Both periods being swapped stay within the SAME section (and therefore
  // the same grade), so a swap only ever changes WHICH teacher teaches that
  // grade's periods, never how many grades a teacher is spread across —
  // recomputed after each swap purely to stay consistent with the other
  // repair pass.
  let gradeLoadUsed = computeGradeLoadUsage(assignmentMap);

  for(const c of result.conflicts){
    // Same structural-conflict guard as targetedDisplacementRepair above —
    // a Program mismatch or AM/PM window overflow can't be fixed by moving
    // subjects between periods either.
    if(c.type==="PROGRAM_CONFLICT" || c.type==="AMPM_SHIFT_CONFLICT"){ stillOpen.push(c); continue; }
    if(moves >= maxMoves){ stillOpen.push(c); continue; }
    const section = SECTIONS.find(s=>s.id===c.section);
    const day = c.day;
    const P = Number(c.affectedScheduleIds[0].split("|")[2]);
    const block = { subject:c.subject, start:c.start, end:c.end, periodIdx:P, day };
    const subjCandidates = candidatesForJob(section, block, {}, gradeLoadUsed);
    let swapped = false;

    if(subjCandidates.length>0){
      const periods = buildTimelineRaw(section, day).filter(b=>b.type==="period" && b.periodIdx!==P);
      for(const otherBlock of periods){
        if(otherBlock.subject===c.subject) continue;
        // Is a SUBJ-qualified teacher free at the other period's time (same day)?
        const subjTeacher = subjCandidates.find(id=> !busy[id].some(j=>j.day===day && intervalsOverlap(j.start,j.end,otherBlock.start,otherBlock.end)));
        if(!subjTeacher) continue;

        const p2Key = scheduleKey(section.id, day, otherBlock.periodIdx);
        const currentP2Teacher = assignmentMap[p2Key] || null;
        let otherTeacher = null;
        if(currentP2Teacher){
          const clashesAtP = busy[currentP2Teacher].some(j=> j.day===day && !(j.start===otherBlock.start&&j.end===otherBlock.end) && intervalsOverlap(j.start,j.end,block.start,block.end));
          if(!clashesAtP) otherTeacher = currentP2Teacher;
        }
        if(!otherTeacher){
          const otherCandidates = candidatesForJob(section, otherBlock, {}, gradeLoadUsed).filter(id=>id!==currentP2Teacher);
          otherTeacher = otherCandidates.find(id=> !busy[id].some(j=>j.day===day && intervalsOverlap(j.start,j.end,block.start,block.end))) || null;
        }
        if(!otherTeacher) continue;

        // Validated — commit the swap.
        SECTION_PERIOD_OVERRIDE[section.id] = SECTION_PERIOD_OVERRIDE[section.id] || {};
        SECTION_PERIOD_OVERRIDE[section.id][day] = SECTION_PERIOD_OVERRIDE[section.id][day] || {};
        SECTION_PERIOD_OVERRIDE[section.id][day][P] = otherBlock.subject;
        SECTION_PERIOD_OVERRIDE[section.id][day][otherBlock.periodIdx] = c.subject;

        if(currentP2Teacher){
          jobsByTeacherSlot[currentP2Teacher] = jobsByTeacherSlot[currentP2Teacher].filter(j=>!(j.day===day && j.start===otherBlock.start && j.end===otherBlock.end));
          busy[currentP2Teacher] = busy[currentP2Teacher].filter(j=>!(j.day===day && j.start===otherBlock.start && j.end===otherBlock.end));
        }
        busy[otherTeacher].push({day, start:block.start, end:block.end});
        jobsByTeacherSlot[otherTeacher].push({day, start:block.start,end:block.end,subject:otherBlock.subject,sectionLabel:c.sectionLabel});
        busy[subjTeacher].push({day, start:otherBlock.start, end:otherBlock.end});
        jobsByTeacherSlot[subjTeacher].push({day, start:otherBlock.start,end:otherBlock.end,subject:c.subject,sectionLabel:c.sectionLabel});

        assignmentMap[scheduleKey(section.id, day, P)] = otherTeacher;
        assignmentMap[p2Key] = subjTeacher;

        changes.push({ key:scheduleKey(section.id, day, P), subject:otherBlock.subject, sectionLabel:c.sectionLabel, fromTeacher:null, toTeacher:otherTeacher, kind:"time-slot swap" });
        changes.push({ key:p2Key, subject:c.subject, sectionLabel:c.sectionLabel, fromTeacher:currentP2Teacher, toTeacher:subjTeacher, kind:"time-slot swap" });

        gradeLoadUsed = computeGradeLoadUsage(assignmentMap);
        swapped = true; moves++;
        break;
      }
    }
    if(!swapped) stillOpen.push(c);
  }

  const finalConflicts = stillOpen.map(c=>{
    const section = SECTIONS.find(s=>s.id===c.section);
    const day = c.day;
    const P = Number(c.affectedScheduleIds[0].split("|")[2]);
    const block = { subject:c.subject, start:c.start, end:c.end, periodIdx:P, day };
    const candidates = candidatesForJob(section, block, {}, gradeLoadUsed);
    const fresh = classifyAndDescribeConflict(section, block, candidates, jobsByTeacherSlot, gradeLoadUsed);
    fresh.status = "UNRESOLVED";
    return fresh;
  });

  return { assignmentMap, conflicts: finalConflicts, changes, gradeLoadUsed };
}

// Auto-fix Conflicts: three layers, applied in order —
//  1) Re-orderings: the plain left-to-right greedy pass is order-sensitive,
//     so some unresolved periods are just an artifact of processing order.
//     Retry with most-constrained-first, most-specialized-tier-first, and
//     randomized restarts; keep whichever ordering produced fewest conflicts.
//  2) Targeted displacement repair: for slots where every qualified teacher
//     is genuinely double-booked, try re-homing the blocking teacher's other
//     assignment to a different qualified, free teacher — a real multi-step
//     repair, not a retry.
//  3) Whatever remains is a genuine staffing gap and is reported as such,
//     never silently hidden or claimed "fixed".
// Tries several assignment orderings plus two escalating repair passes to
// minimize conflicts for a given set of scheduling jobs. Pure with respect
// to global schedule state — it only reads section/teacher/subject data and
// returns {assignmentMap, conflicts, changes:[]} for the caller to apply;
// it never touches SCHEDULE_ASSIGNMENTS/SCHEDULE_CONFLICTS itself. Used by
// both generateSchedule() (so a fresh generate already tries hard to come
// back conflict-free) and autoFixConflicts() (to repair a schedule that's
// already saved with conflicts in it).
function solveJobsBestEffort(jobs){
  let best = runScheduleAssignment(jobs);

  function tryOrder(js){
    const result = runScheduleAssignment(js);
    if(result.conflicts.length < best.conflicts.length) best = result;
  }

  const constrained = jobs.slice().sort((a,b)=>
    candidatesForJob(a.section,a.block,{}).length - candidatesForJob(b.section,b.block,{}).length
  );
  tryOrder(constrained);

  const tierPriority = { SHS:0, JHS:1 };
  const byTier = jobs.slice().sort((a,b)=> tierPriority[a.section.tier]-tierPriority[b.section.tier]);
  tryOrder(byTier);

  for(let i=0; i<25 && best.conflicts.length>0; i++){
    tryOrder(shuffledCopy(jobs));
  }

  // Layer 2: targeted teacher-displacement repair on whatever's left.
  let repaired = { assignmentMap: best.assignmentMap, conflicts: best.conflicts, changes: [] };
  if(best.conflicts.length>0){
    repaired = targetedDisplacementRepair(best, 40);
  }
  // Layer 3: time-slot / subject swap for structural clashes displacement
  // alone can't solve (e.g. only one qualified teacher, needed by two
  // sections at the identical clock time).
  if(repaired.conflicts.length>0){
    const swapResult = timeSlotSwapRepair(
      { assignmentMap: repaired.assignmentMap, conflicts: repaired.conflicts, busy: best.busy, jobsByTeacherSlot: best.jobsByTeacherSlot },
      40
    );
    repaired = { assignmentMap: swapResult.assignmentMap, conflicts: swapResult.conflicts, changes: repaired.changes.concat(swapResult.changes) };
  }
  return repaired;
}

function autoFixConflicts(){
  const before = SCHEDULE_CONFLICTS.length;
  if(before===0) return { before:0, after:0, changed:false, changes:[], detected:0, fixed:0, remaining:0, remainingConflicts:[] };

  const originalAssignments = JSON.parse(JSON.stringify(SCHEDULE_ASSIGNMENTS));
  const baseJobs = collectScheduleJobs();
  const repaired = solveJobsBestEffort(baseJobs);

  // Diff final assignment map against the pre-autofix state for the
  // "Changes Made" panel (covers changes from every layer above).
  const changeMap = {};
  Object.keys(repaired.assignmentMap).forEach(key=>{
    const oldT = originalAssignments[key] || null;
    const newT = repaired.assignmentMap[key];
    if(oldT !== newT){
      const [secId,kDay,pIdx] = key.split("|");
      const sec = SECTIONS.find(s=>s.id===secId);
      const raw = buildTimelineRaw(sec, kDay).find(b=>b.type==="period" && b.periodIdx===Number(pIdx));
      changeMap[key] = {
        key, sectionLabel: sec.grade+" - "+sec.name, subject: raw ? raw.subject : "",
        start: raw?raw.start:null, end: raw?raw.end:null,
        fromTeacher: oldT, toTeacher: newT
      };
    }
  });
  const changes = Object.values(changeMap);

  // Room Conflicts and AM/PM Shift Misconfigurations are detected
  // independently (see detectRoomConflicts / detectShiftMisconfigurations)
  // and never touched by the repair passes above — recompute them fresh so
  // any that genuinely still exist stay reported (their ids are
  // deterministic, so an unresolved clash is never mistaken for "fixed").
  const roomConflicts = detectRoomConflicts();
  const shiftMisconfigs = detectShiftMisconfigurations();
  const finalConflicts = repaired.conflicts.concat(roomConflicts, shiftMisconfigs);

  const detected = before;
  const remaining = finalConflicts.length;
  const fixed = detected - remaining;
  const changed = changes.length>0;

  LAST_AUTOFIX_SNAPSHOT = { assignments: originalAssignments, conflicts: JSON.parse(JSON.stringify(SCHEDULE_CONFLICTS)) };

  // Log to Conflict History / Resolved Conflicts: any conflict present
  // before this run but no longer present after is considered Auto-Fixed.
  const remainingIds = new Set(finalConflicts.map(c=>c.id));
  SCHEDULE_CONFLICTS.forEach(prevConflict=>{
    if(!remainingIds.has(prevConflict.id)){
      resolveConflictInto(prevConflict, "Auto-Fixed", "Auto-Fix", "Automatically reassigned/rescheduled");
    }
  });

  SCHEDULE_ASSIGNMENTS = repaired.assignmentMap;
  SCHEDULE_CONFLICTS = finalConflicts;
  SCHEDULE_GENERATED_AT = new Date().toISOString();
  return { before, after: remaining, changed, changes, detected, fixed, remaining, remainingConflicts: finalConflicts };
}

function openTermPicker(onConfirm){
  const sy = schoolYearById(CURRENT_SCHOOL_YEAR_ID);
  const defaultDayMode = FRIDAY_ENABLED ? "mon-fri" : "mon-thu";

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="termBackdrop">
      <div class="modal-box gen-modal">
        <div class="modal-head">
          <div>
            <h3>Generate Schedule</h3>
            <div class="hint" style="margin-top:2px;">School Year <b>${esc(sy?sy.label:"—")}</b> &middot; builds the daily timetable from Sections, Subjects, and Teacher Load Allocation.</div>
          </div>
          <button class="modal-close" id="termClose">&times;</button>
        </div>
        <div class="modal-body">

          <details class="gen-section" open>
            <summary>Term Selection</summary>
            <div class="gen-section-body">
              <div class="hint">Generating uses the working School Year currently selected on the <b>School Year &amp; Terms</b> page: <b>${esc(sy?sy.label:"—")}</b>.</div>
              <label class="field">Which term should be generated?
                <select id="termSelect">
                  ${TERM_OPTIONS.map(t=>`<option value="${t}" ${t===CURRENT_TERM?'selected':''}>${t}</option>`).join("")}
                </select>
              </label>
              <div class="hint">Subjects tagged to a specific term (see the Subjects page) are only scheduled when that term is generated. Subjects left as "Whole Year" are always included.</div>
            </div>
          </details>

          <details class="gen-section" open>
            <summary>Schedule Days for This Generation</summary>
            <div class="gen-section-body">
              <div id="genDayMode" style="display:flex; flex-direction:column; gap:8px;">
                <label class="gen-day-card">
                  <input type="radio" name="genDayMode" value="mon-thu" ${defaultDayMode==="mon-thu"?'checked':''}>
                  <span><span class="gen-day-title">Monday to Thursday</span><span class="gen-day-desc">Generate classes for Monday through Thursday.</span></span>
                </label>
                ${FRIDAY_ENABLED ? `<label class="gen-day-card">
                  <input type="radio" name="genDayMode" value="mon-fri" checked>
                  <span><span class="gen-day-title">Monday to Friday</span><span class="gen-day-desc">Generate classes for Monday through Friday.</span></span>
                </label>` : `<div class="gen-day-disabled-note">Friday Schedule is currently <b>disabled</b> in Admin Settings &rarr; Schedule Settings, so "Monday to Friday" isn't available here. Enable it there first if you need Friday classes generated.</div>`}
              </div>
              <div class="hint">This only applies to this generation run — it does not change the Friday Schedule setting saved in Admin Settings.</div>
            </div>
          </details>

          <details class="gen-section gen-span-2" open>
            <summary>Grade Levels <span class="gen-section-sub">Generate Schedule For</span></summary>
            <div class="gen-section-body">
              <div class="gen-grade-grid" id="genGradeChecks">
                <label class="gen-grade-chip all-chip"><input type="checkbox" class="genGradeChk" value="__all__" checked> All Grade Levels</label>
                ${GRADE_ORDER.map(g=>`<label class="gen-grade-chip"><input type="checkbox" class="genGradeChk" value="${g}" checked> ${g}</label>`).join("")}
              </div>
              <div class="hint">Uncheck "All Grade Levels" to select specific grades. Every grade left unchecked keeps its current saved schedule exactly as-is — only the grades you select here are (re)generated.</div>
            </div>
          </details>

        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="termCancel">Cancel</button>
          <button class="btn gold" id="termGo">Generate Schedule</button>
        </div>
      </div>
    </div>`;
  let generating = false;
  const tryClose = ()=>{ if(!generating) closeModal(); };
  document.getElementById("termClose").onclick = tryClose;
  document.getElementById("termCancel").onclick = tryClose;
  document.getElementById("termBackdrop").addEventListener("click", e=>{ if(e.target.id==="termBackdrop") tryClose(); });
  const allChk = document.querySelector('#genGradeChecks .genGradeChk[value="__all__"]');
  const gradeChks = Array.from(document.querySelectorAll('#genGradeChecks .genGradeChk')).filter(c=>c.value!=="__all__");
  allChk.addEventListener("change", ()=>{ gradeChks.forEach(c=>{ c.checked = allChk.checked; }); });
  gradeChks.forEach(c=> c.addEventListener("change", ()=>{
    allChk.checked = gradeChks.every(x=>x.checked);
  }));
  document.getElementById("termGo").onclick = async ()=>{
    if(generating) return; // belt-and-suspenders against duplicate clicks
    const term = document.getElementById("termSelect").value;
    const checkedGrades = gradeChks.filter(c=>c.checked).map(c=>c.value);
    if(checkedGrades.length===0){ showToast("Select at least one Grade Level to generate.", true); return; }
    const grades = allChk.checked ? null : checkedGrades; // null = all grades (no scoping)
    const dayMode = document.querySelector('input[name="genDayMode"]:checked').value;
    generating = true;
    const goBtn = document.getElementById("termGo");
    document.getElementById("termCancel").disabled = true;
    document.getElementById("termClose").disabled = true;
    try{
      await withButtonLoading(goBtn, ()=> onConfirm({ term, grades, dayMode }));
    } finally {
      generating = false;
      closeModal();
    }
  };
}

function runGenerateSchedule(){
  openConfirm("Regenerating the schedule may replace existing auto-generated assignments for the grade levels and days you select next. Your manually-added or manually-edited entries are protected and will not be overwritten. Do you want to continue?", ()=>{
    openTermPicker(async ({ term, grades, dayMode })=>{
      const { assignmentMap, conflicts } = generateSchedule({ term, grades, dayMode });
      LAST_CHANGES = [];
      LAST_AUTOFIX_SNAPSHOT = null;
      const resultWrap = document.getElementById("autoFixResultWrap");
      if(resultWrap){ resultWrap.style.display = "none"; resultWrap.innerHTML = ""; }
      await saveData();
      renderAll();
      const total = Object.keys(assignmentMap).length;
      const scopeLabel = grades ? `${grades.length===1?grades[0]:grades.length+" selected grade levels"}` : "all grade levels";
      const msg = conflicts.length
        ? `${term} schedule regenerated for ${scopeLabel}: ${total} periods assigned, ${conflicts.length} unresolved conflict${conflicts.length===1?'':'s'} — see Class Schedule for details.`
        : `${term} schedule regenerated for ${scopeLabel}: all ${total} class periods assigned with zero conflicts.`;
      showToast(msg, conflicts.length>0);
    });
  }, "Regenerate");
}

const AUTOFIX_STEPS = [
  "Analyzing conflicts…",
  "Loading teacher qualifications and availability…",
  "Checking teacher availability…",
  "Testing alternative time slots…",
  "Balancing teaching loads…",
  "Validating solution…"
];
function delay(ms){ return new Promise(res=>setTimeout(res, ms)); }
let LAST_CHANGES = [];

// Runs Auto-Fix without freezing the UI: each "step" is painted, then we
// yield back to the browser (setTimeout) before the next, so the page stays
// responsive throughout — the actual solve happens synchronously in one of
// those yields since it's fast, but the interface never blocks mid-step.
async function runAutoFixConflicts(){
  if(SCHEDULE_CONFLICTS.length===0){ showToast("No conflicts to fix — the schedule is already conflict-free."); return; }

  const wrap = document.getElementById("autoFixProgressWrap");
  const text = document.getElementById("autoFixProgressText");
  const resultWrap = document.getElementById("autoFixResultWrap");
  const btn = document.getElementById("autoFixBtnSchedule");
  const btnT = document.getElementById("autoFixBtnTeachers");
  [btn, btnT].forEach(b=>{ if(b){ b.disabled = true; b.style.opacity = .6; } });
  if(resultWrap){ resultWrap.style.display = "none"; resultWrap.innerHTML = ""; }
  if(wrap) wrap.style.display = "block";

  let result;
  for(let i=0;i<AUTOFIX_STEPS.length;i++){
    if(text) text.textContent = AUTOFIX_STEPS[i];
    await delay(220);
    if(i===AUTOFIX_STEPS.length-2) result = autoFixConflicts(); // solve just before "Validating solution…"
  }

  if(wrap) wrap.style.display = "none";
  [btn, btnT].forEach(b=>{ if(b){ b.disabled = false; b.style.opacity = 1; } });

  const { before, after, changes, detected, fixed, remaining } = result;
  LAST_CHANGES = changes;
  await saveData();
  renderAll();

  if(resultWrap){
    resultWrap.style.display = "block";
    resultWrap.innerHTML = `
      <div style="font-family:Georgia,serif; font-size:15px; color:var(--navy-deep); font-weight:700; margin-bottom:8px;">Auto-Fix Complete</div>
      <div style="display:flex; gap:22px; flex-wrap:wrap; font-size:13.5px;">
        <div>✓ Conflicts detected: <b>${detected}</b></div>
        <div style="color:var(--green);">✓ Conflicts fixed: <b>${fixed}</b></div>
        <div style="color:${remaining>0?'var(--maroon)':'var(--green)'};">${remaining>0?'⚠':'✓'} Conflicts remaining: <b>${remaining}</b></div>
        <div>↻ Schedule records changed: <b>${changes.length}</b></div>
      </div>`;
  }

  renderChangesPanel();

  if(after===0){
    showToast(`Auto-fix resolved all ${before} conflict${before===1?'':'s'} — the schedule is now conflict-free.`);
  } else if(after<before){
    showToast(`Auto-fix reduced conflicts from ${before} to ${after}. Remaining conflicts are explained below.`, true);
  } else {
    showToast(`NO VALID AUTOMATIC SOLUTION FOUND for ${after} conflict${after===1?'':'s'} — see the reasons and manual options below.`, true);
  }
}

function renderChangesPanel(){
  const panel = document.getElementById("changesPanel");
  const hint = document.getElementById("changesHint");
  const body = document.getElementById("changesBody");
  const undoBtn = document.getElementById("undoAutoFixBtn");
  if(!panel) return;
  if(!LAST_CHANGES || LAST_CHANGES.length===0){ panel.style.display = "none"; return; }
  panel.style.display = "block";
  hint.textContent = `${LAST_CHANGES.length} schedule record${LAST_CHANGES.length===1?'':'s'} changed by the most recent Auto-Fix run.`;
  body.innerHTML = LAST_CHANGES.map(c=>{
    const oldT = c.fromTeacher ? teacherById(c.fromTeacher) : null;
    const newT = c.toTeacher ? teacherById(c.toTeacher) : null;
    const change = oldT
      ? `${oldT.name} → ${newT ? newT.name : "Unassigned"}`
      : `Newly assigned: ${newT ? newT.name : "Unassigned"}`;
    return `<tr><td>${c.sectionLabel}</td><td>${c.subject}</td><td>${c.start!=null?fmt(c.start)+" – "+fmt(c.end):""}</td><td>${change}</td></tr>`;
  }).join("");
  if(undoBtn){
    undoBtn.style.display = LAST_AUTOFIX_SNAPSHOT ? "inline-block" : "none";
    undoBtn.onclick = async ()=>{
      if(!LAST_AUTOFIX_SNAPSHOT) return;
      openConfirm("Undo the most recent Auto-Fix run and restore the schedule to how it was before? This does not affect any manual edits made since then.", async ()=>{
        SCHEDULE_ASSIGNMENTS = LAST_AUTOFIX_SNAPSHOT.assignments;
        SCHEDULE_CONFLICTS = LAST_AUTOFIX_SNAPSHOT.conflicts;
        LAST_AUTOFIX_SNAPSHOT = null;
        LAST_CHANGES = [];
        await saveData();
        renderAll();
        showToast("Auto-Fix undone — schedule restored to its previous state.");
      }, "Undo Auto-Fix");
    };
  }
}

// ---- Manual resolution for a conflict Auto-Fix couldn't close -------------
// Structural conflicts (Program mismatch, AM/PM window overflow, Room
// double-booking) have no "pick a different teacher" fix — the real fix is
// an Admin editing the Section/Subject/Room configuration itself. Shown as
// a guidance modal instead of the teacher-assignment picker below.
function openStructuralConflictModal(c){
  const section = SECTIONS.find(s=>s.id===c.section);
  const editAction = c.type==="PROGRAM_CONFLICT" ? { label:"Edit Subject", fn:()=>{ closeModal(); navigateTo("subjects"); } }
    : c.type==="ROOM_CONFLICT" ? { label:"Edit Section", fn:()=>{ closeModal(); if(section) openSectionForm(section.id); } }
    : { label:"Edit Section", fn:()=>{ closeModal(); if(section) openSectionForm(section.id); } };
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="mfBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>${conflictTypeLabel(c)}</h3><button class="modal-close" id="mfClose">&times;</button></div>
        <div class="modal-body">
          <div class="hint">${c.sectionLabel} — ${c.subject||"—"} — ${DAY_FULL_NAME[c.day]||c.day||""} ${c.start!=null?fmt(c.start)+'–'+fmt(c.end):''}</div>
          <div class="err-text" style="color:var(--ink-soft); font-weight:500;">${c.message}</div>
          ${c.possibleSolutions && c.possibleSolutions.length ? `<ul style="margin:10px 0 0; padding-left:18px; color:var(--ink-soft); font-size:13px;">${c.possibleSolutions.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>` : ''}
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="mfCancel">Close</button>
          <button class="btn gold" id="mfEditBtn">${editAction.label}</button>
        </div>
      </div>
    </div>`;
  document.getElementById("mfClose").onclick = closeModal;
  document.getElementById("mfCancel").onclick = closeModal;
  document.getElementById("mfBackdrop").addEventListener("click", e=>{ if(e.target.id==="mfBackdrop") closeModal(); });
  document.getElementById("mfEditBtn").onclick = editAction.fn;
}
function openManualFixModal(conflictId){
  const c = SCHEDULE_CONFLICTS.find(x=>x.id===conflictId);
  if(!c) return;
  if(c.type==="PROGRAM_CONFLICT" || c.type==="AMPM_SHIFT_CONFLICT" || c.type==="ROOM_CONFLICT"){
    openStructuralConflictModal(c);
    return;
  }
  const section = SECTIONS.find(s=>s.id===c.section);
  const allQualified = TEACHERS.filter(t=> t.tiers.includes(section.grade) && teacherCanTeach(t, c.subject));
  const busySet = new Set();
  Object.entries(SCHEDULE_ASSIGNMENTS).forEach(([key,tid])=>{
    const [secId,kDay,pIdx] = key.split("|");
    if(kDay!==c.day) return;
    const sec = SECTIONS.find(s=>s.id===secId);
    if(!sec) return;
    const raw = buildTimelineRaw(sec, kDay).find(b=>b.type==="period" && b.periodIdx===Number(pIdx));
    if(raw && intervalsOverlap(raw.start,raw.end,c.start,c.end)) busySet.add(tid);
  });
  // Per-grade teaching-load cap info for each qualified, non-busy teacher —
  // shown as a warning (not disabled), since Admin Control explicitly
  // allows manual overrides here, with a clear warning before applying.
  const capInfo = {}; // teacherId -> {atCap, used, cap}
  const shiftRestricted = isSHSGrade(section.grade) && section.classShift && section.classShift!=="None";
  allQualified.forEach(t=>{
    const bucket = sectionProgramBucket(section);
    const cap = teacherGradeCap(t, section.grade, bucket);
    const existingForGrade = (buildAllAssignments()[t.id]||[]).filter(a=>a.grade===section.grade && (a.program||"Regular")===(section.sectionType||"Regular"));
    const alreadyThisCombo = existingForGrade.some(a=> a.sectionLabel===(section.grade+" - "+section.name) && a.subject===c.subject);
    const shiftMismatch = shiftRestricted && !shiftsCompatible(teacherShiftFor(t, section.grade), section.classShift);
    capInfo[t.id] = { atCap: !alreadyThisCombo && existingForGrade.length>=cap, used: existingForGrade.length, cap, shiftMismatch };
  });
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="mfBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>Manually Resolve Conflict</h3><button class="modal-close" id="mfClose">&times;</button></div>
        <div class="modal-body">
          <div class="hint">${c.sectionLabel} — ${c.subject} — ${DAY_FULL_NAME[c.day]||c.day} ${fmt(c.start)}–${fmt(c.end)}</div>
          <div class="err-text" style="color:var(--ink-soft); font-weight:500;">${c.message}</div>
          <label class="field">Assign teacher
            <select id="mfTeacher">
              <option value="">— Select a qualified teacher —</option>
              ${allQualified.map(t=>{
                const busy = busySet.has(t.id);
                const info = capInfo[t.id];
                const flag = busy ? ' — busy at this time'
                  : info.shiftMismatch ? ` — ${teacherShiftFor(t, section.grade)} Class shift conflicts with this ${section.classShift} Class section`
                  : (info.atCap ? ` — at teaching-load limit for ${section.grade} (${info.used}/${info.cap})` : '');
                return `<option value="${t.id}" ${busy?'disabled':''} data-atcap="${info.atCap?'1':'0'}" data-shiftmismatch="${info.shiftMismatch?'1':'0'}">${t.name}${flag}</option>`;
              }).join("")}
            </select>
          </label>
          ${allQualified.length===0 ? '<div class="err-text">No teacher in the system is currently tagged qualified for this subject. Add or edit a teacher\'s specialization first.</div>' : ''}
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="mfCancel">Cancel</button>
          <button class="btn gold" id="mfApply">Apply &amp; Validate</button>
        </div>
      </div>
    </div>`;
  document.getElementById("mfClose").onclick = closeModal;
  document.getElementById("mfCancel").onclick = closeModal;
  document.getElementById("mfBackdrop").addEventListener("click", e=>{ if(e.target.id==="mfBackdrop") closeModal(); });
  document.getElementById("mfApply").onclick = async ()=>{
    const tid = document.getElementById("mfTeacher").value;
    if(!tid){ showToast("Select a teacher first.", true); return; }
    if(busySet.has(tid)){ showToast("That teacher is already booked at this time — pick another.", true); return; }
    const doApply = async ()=>{
      const key = c.affectedScheduleIds[0];
      SCHEDULE_ASSIGNMENTS[key] = tid;
      resolveConflictInto(c, "Manually Resolved", "Manual Assignment", `Assigned ${teacherById(tid).name}`);
      LAST_CHANGES = [{ key, subject:c.subject, sectionLabel:c.sectionLabel, start:c.start, end:c.end, fromTeacher:null, toTeacher:tid }, ...LAST_CHANGES];
      closeModal();
      await saveData();
      renderAll();
      renderChangesPanel();
      showToast(`Manually assigned ${teacherById(tid).name} to ${c.subject} for ${c.sectionLabel}.`);
    };
    const info = capInfo[tid];
    if(info && info.shiftMismatch){
      openConfirm(`${teacherById(tid).name}'s Class Shift for ${section.grade} is set to ${teacherShiftFor(teacherById(tid), section.grade)}, which conflicts with ${section.grade} - ${section.name}'s ${section.classShift} Class. Assign anyway?`, doApply, "Assign Anyway");
    } else if(info && info.atCap){
      openConfirm(`${teacherById(tid).name} already has ${info.used}/${info.cap} teaching loads for ${section.grade}. Assigning this class would exceed the Admin-set limit. Assign anyway?`, doApply, "Assign Anyway");
    } else {
      await doApply();
    }
  };
}

function renderConflicts(){
  // NOTE: this only touches Schedule Conflict Management's own UI (the
  // banners it shows on other pages, and its own page). It never writes to
  // Class Schedule's own tables/state — see renderScheduleTable() etc.
  const n = SCHEDULE_CONFLICTS.length;

  const bannerT = document.getElementById("conflictBannerTeachers");
  if(bannerT){
    bannerT.style.display = n>0 ? "flex" : "none";
    bannerT.style.background = n>0 ? "#F9EEEF" : "";
    bannerT.style.borderColor = n>0 ? "#E3C4C7" : "";
    bannerT.style.color = n>0 ? "var(--maroon)" : "";
    bannerT.innerHTML = n>0 ? `<span>${n} period${n===1?'':'s'} could not be auto-assigned a teacher.</span><button class="icon-btn danger" id="autoFixBtnTeachers">🛠 Open Schedule Conflicts</button>` : "";
    const bT = document.getElementById("autoFixBtnTeachers");
    if(bT) bT.onclick = ()=> navigateTo("conflicts");
  }
  const bannerD = document.getElementById("conflictBannerDashboard");
  if(bannerD){
    bannerD.style.display = n>0 ? "inline-block" : "none";
    bannerD.style.background = n>0 ? "#F9EEEF" : "";
    bannerD.style.borderColor = n>0 ? "#E3C4C7" : "";
    bannerD.style.color = n>0 ? "var(--maroon)" : "";
    bannerD.textContent = n>0 ? `${n} scheduling conflict${n===1?'':'s'} need attention — open Schedule Conflicts to review.` : "";
  }
  const bannerS = document.getElementById("conflictBannerScheduleSlim");
  if(bannerS){
    bannerS.style.display = n>0 ? "flex" : "none";
    bannerS.innerHTML = n>0 ? `<span>⚠ ${n} unresolved scheduling conflict${n===1?'':'s'} for this schedule.</span><button class="icon-btn danger" id="goConflictsFromSchedule">Open Schedule Conflicts →</button>` : "";
    const goBtn = document.getElementById("goConflictsFromSchedule");
    if(goBtn) goBtn.onclick = ()=> navigateTo("conflicts");
  }
  const navBadge = document.getElementById("conflictsNavBadge");
  if(navBadge){
    navBadge.style.display = n>0 ? "inline-block" : "none";
    navBadge.textContent = n;
  }

  // Auto-Fix tab's own unresolved-conflicts table (unchanged behavior).
  const panel = document.getElementById("conflictsPanel");
  const body = document.getElementById("conflictsBody");
  if(panel && body){
    body.innerHTML = SCHEDULE_CONFLICTS.map(c=>{
      const typeLabel = conflictTypeLabel(c);
      const typeTag = CONFLICT_HIGH_SEVERITY_TYPES.has(c.type) ? "maroon" : "gold";
      return `<tr>
        <td>${c.sectionLabel}</td>
        <td>${c.subject}</td>
        <td>${fmt(c.start)} – ${fmt(c.end)}</td>
        <td><span class="tag ${typeTag}">${typeLabel}</span></td>
        <td style="max-width:340px;">
          <div>${c.message}</div>
          ${c.possibleSolutions && c.possibleSolutions.length ? `<ul style="margin:6px 0 0; padding-left:18px; color:var(--ink-soft); font-size:12px;">${c.possibleSolutions.slice(0,3).map(s=>`<li>${s}</li>`).join("")}</ul>` : ''}
        </td>
        <td><span class="tag maroon">${c.status||'UNRESOLVED'}</span></td>
        <td style="display:flex; gap:6px;">
          <button class="icon-btn" onclick="openManualFixModal('${c.id}')">Fix Manually</button>
          <button class="icon-btn" onclick="ignoreConflict('${c.id}')">Ignore</button>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" class="empty">No unresolved conflicts.</td></tr>`;
  }
  renderChangesPanel();
  renderConflictManagementPage();
}

/* ---- Schedule Conflict Management page: tabs, All/Unresolved/Resolved
   list, and Conflict History. Kept in its own render function so this
   module's UI logic stays out of Class Schedule's renderers. ---- */
function conflictRowHtml(c, isResolved){
  const typeLabel = conflictTypeLabel(c);
  const typeTag = CONFLICT_HIGH_SEVERITY_TYPES.has(c.type) ? "maroon" : "gold";
  const statusTag = c.status==="Auto-Fixed" || c.status==="Manually Resolved" ? "" : c.status==="Ignored" ? "" : "maroon";
  const suggestion = (c.possibleSolutions && c.possibleSolutions[0]) || "—";
  const actions = isResolved
    ? `<span class="hint">—</span>`
    : `<div style="display:flex; gap:6px;"><button class="icon-btn" onclick="openManualFixModal('${c.id}')">Fix Manually</button><button class="icon-btn" onclick="ignoreConflict('${c.id}')">Ignore</button></div>`;
  return `<tr data-cid="${c.id}">
    <td><input type="checkbox" class="cmgmt-row-check" data-cid="${c.id}" ${SELECTED_CONFLICT_IDS.has(c.id)?'checked':''}></td>
    <td><span class="tag ${typeTag}">${typeLabel}</span></td>
    <td>${DAY_FULL_NAME[c.day]||c.day||"—"}</td>
    <td>${c.start!=null?fmt(c.start)+' – '+fmt(c.end):"—"}</td>
    <td>—</td>
    <td>${c.subject||"—"}</td>
    <td>${c.sectionLabel||"—"}</td>
    <td>${conflictRoomLabel(c)}</td>
    <td style="max-width:280px;">${c.message||"—"}</td>
    <td><span class="tag ${statusTag}">${c.status||'Unresolved'}</span></td>
    <td style="max-width:220px;">${suggestion}</td>
    <td>${actions}</td>
  </tr>`;
}
function renderConflictManagementPage(){
  const tabsWrap = document.getElementById("conflictTabs");
  if(!tabsWrap) return; // page not built yet (shouldn't happen)

  document.getElementById("ctabCountAll").textContent = "(" + (SCHEDULE_CONFLICTS.length + RESOLVED_CONFLICTS.length) + ")";
  document.getElementById("ctabCountUnresolved").textContent = "(" + SCHEDULE_CONFLICTS.length + ")";
  document.getElementById("ctabCountResolved").textContent = "(" + RESOLVED_CONFLICTS.length + ")";
  document.getElementById("ctabCountHistory").textContent = "(" + CONFLICT_HISTORY.length + ")";

  tabsWrap.querySelectorAll("button").forEach(b=> b.classList.toggle("active", b.dataset.ctab===activeConflictTab));

  const listView = document.getElementById("cmgmtListView");
  const autofixView = document.getElementById("cmgmtAutofixView");
  const historyView = document.getElementById("cmgmtHistoryView");

  listView.style.display = (activeConflictTab==="all" || activeConflictTab==="unresolved" || activeConflictTab==="resolved") ? "block" : "none";
  autofixView.style.display = activeConflictTab==="autofix" ? "block" : "none";
  historyView.style.display = activeConflictTab==="history" ? "block" : "none";

  let currentIds = [];
  if(listView.style.display==="block"){
    const titleEl = document.getElementById("cmgmtListTitle");
    const hintEl = document.getElementById("cmgmtListHint");
    let rows = [];
    if(activeConflictTab==="all"){
      titleEl.textContent = "All Conflicts";
      hintEl.textContent = "Every scheduling problem detected for the current schedule, whether still open or already resolved.";
      currentIds = SCHEDULE_CONFLICTS.map(c=>c.id).concat(RESOLVED_CONFLICTS.map(c=>c.id));
      rows = SCHEDULE_CONFLICTS.map(c=>conflictRowHtml(c,false)).concat(RESOLVED_CONFLICTS.map(c=>conflictRowHtml(c,true)));
    } else if(activeConflictTab==="unresolved"){
      titleEl.textContent = "Unresolved Conflicts";
      hintEl.textContent = "Conflicts that could not be automatically resolved and still need attention. This never blocks Class Schedule — you can keep editing schedules normally.";
      currentIds = SCHEDULE_CONFLICTS.map(c=>c.id);
      rows = SCHEDULE_CONFLICTS.map(c=>conflictRowHtml(c,false));
    } else {
      titleEl.textContent = "Resolved Conflicts";
      hintEl.textContent = "Conflicts that were Auto-Fixed, Manually Resolved, or Ignored.";
      currentIds = RESOLVED_CONFLICTS.map(c=>c.id);
      rows = RESOLVED_CONFLICTS.map(c=>conflictRowHtml(c,true));
    }
    // Drop any selected id that's no longer visible in this tab (e.g. it was
    // resolved/deleted elsewhere, or the admin switched tabs) so the counter
    // and Select All checkbox always reflect what's actually on screen.
    const currentIdSet = new Set(currentIds);
    Array.from(SELECTED_CONFLICT_IDS).forEach(id=>{ if(!currentIdSet.has(id)) SELECTED_CONFLICT_IDS.delete(id); });
    document.getElementById("cmgmtListBody").innerHTML = rows.join("") || `<tr><td colspan="12" class="empty">No conflicts to show.</td></tr>`;
    renderConflictSelectionToolbar(currentIds);
  }

  if(historyView.style.display==="block"){
    document.getElementById("cmgmtHistoryBody").innerHTML = CONFLICT_HISTORY.map(h=>`<tr>
      <td>${new Date(h.detectedAt).toLocaleString()}</td>
      <td>${h.sectionLabel||"—"}</td>
      <td>${h.subject||"—"}</td>
      <td style="max-width:260px;">${h.previous||"—"}</td>
      <td>${h.resolutionMethod||"—"}</td>
      <td>${h.action||"—"}</td>
      <td><span class="tag ${h.finalStatus==='Unresolved'?'maroon':''}">${h.finalStatus||"—"}</span></td>
    </tr>`).join("") || `<tr><td colspan="7" class="empty">No conflict history yet.</td></tr>`;
  }
}
document.addEventListener("click", (e)=>{
  const tabBtn = e.target.closest("#conflictTabs button[data-ctab]");
  if(tabBtn){ activeConflictTab = tabBtn.dataset.ctab; renderConflictManagementPage(); }
});
// Reflects the current selection (scoped to whatever's actually visible in
// the active tab) into the counter text, the two bulk-action buttons'
// disabled state, and the header Select All checkbox (including its
// indeterminate state when only some visible rows are checked).
function renderConflictSelectionToolbar(currentIds){
  const countEl = document.getElementById("cmgmtSelectionCount");
  const clearBtn = document.getElementById("cmgmtClearSelectedBtn");
  const deleteBtn = document.getElementById("cmgmtDeleteSelectedBtn");
  const selectAll = document.getElementById("cmgmtSelectAll");
  if(!countEl || !clearBtn || !deleteBtn || !selectAll) return;
  const n = currentIds.filter(id=>SELECTED_CONFLICT_IDS.has(id)).length;
  countEl.textContent = `${n} conflict${n===1?'':'s'} selected`;
  clearBtn.disabled = n===0;
  deleteBtn.disabled = n===0;
  selectAll.checked = currentIds.length>0 && n===currentIds.length;
  selectAll.indeterminate = n>0 && n<currentIds.length;
}
document.addEventListener("change", (e)=>{
  if(e.target && e.target.classList && e.target.classList.contains("cmgmt-row-check")){
    const id = e.target.dataset.cid;
    if(e.target.checked) SELECTED_CONFLICT_IDS.add(id); else SELECTED_CONFLICT_IDS.delete(id);
    const currentIds = Array.from(document.querySelectorAll("#cmgmtListBody .cmgmt-row-check")).map(cb=>cb.dataset.cid);
    renderConflictSelectionToolbar(currentIds);
  }
  if(e.target && e.target.id==="cmgmtSelectAll"){
    const boxes = Array.from(document.querySelectorAll("#cmgmtListBody .cmgmt-row-check"));
    boxes.forEach(cb=>{
      cb.checked = e.target.checked;
      if(e.target.checked) SELECTED_CONFLICT_IDS.add(cb.dataset.cid); else SELECTED_CONFLICT_IDS.delete(cb.dataset.cid);
    });
    renderConflictSelectionToolbar(boxes.map(cb=>cb.dataset.cid));
  }
});
document.addEventListener("click", (e)=>{
  if(e.target && e.target.id==="cmgmtClearSelectedBtn"){
    // Only currently-unresolved conflicts can meaningfully be "cleared" —
    // any already-resolved rows in the selection are left untouched.
    const eligible = Array.from(SELECTED_CONFLICT_IDS).filter(id=> SCHEDULE_CONFLICTS.some(c=>c.id===id));
    if(!eligible.length){ showToast("Select at least one unresolved conflict to clear."); return; }
    openConfirm(`Clear ${eligible.length} selected conflict${eligible.length===1?'':'s'}? Each is marked Ignored and moved to Resolved Conflicts — unrelated conflicts are not affected, and underlying schedule records are kept.`, async ()=>{
      eligible.forEach(id=>{
        const c = SCHEDULE_CONFLICTS.find(x=>x.id===id);
        if(c) resolveConflictInto(c, "Ignored", "Ignored by Admin (bulk)", "Cleared (bulk)");
      });
      SELECTED_CONFLICT_IDS.clear();
      await saveData();
      renderAll();
      showToast(`${eligible.length} conflict${eligible.length===1?'':'s'} cleared.`);
    }, "Clear Selected");
  }
  if(e.target && e.target.id==="cmgmtDeleteSelectedBtn"){
    const ids = Array.from(SELECTED_CONFLICT_IDS);
    if(!ids.length) return;
    openConfirm(`Permanently delete ${ids.length} selected conflict record${ids.length===1?'':'s'}? This cannot be undone.`, async ()=>{
      ids.forEach(id=>{
        let idx = SCHEDULE_CONFLICTS.findIndex(c=>c.id===id);
        let c = idx>-1 ? SCHEDULE_CONFLICTS.splice(idx,1)[0] : null;
        if(!c){
          idx = RESOLVED_CONFLICTS.findIndex(x=>x.id===id);
          if(idx>-1) c = RESOLVED_CONFLICTS.splice(idx,1)[0];
        }
        if(c){
          logConflictHistory({ sectionLabel:c.sectionLabel, subject:c.subject, day:c.day, previous:c.message||"—", resolutionMethod:"Deleted by Admin (bulk)", action:"Deleted (bulk)", finalStatus:"Deleted" });
        }
      });
      SELECTED_CONFLICT_IDS.clear();
      await saveData();
      renderAll();
      showToast(`${ids.length} conflict record${ids.length===1?'':'s'} deleted.`);
    }, "Delete Selected");
  }
});
document.addEventListener("click", (e)=>{
  if(e.target && e.target.id==="clearConflictHistoryBtn"){
    openConfirm("Clear the entire Conflict History audit trail? This does not affect current unresolved or resolved conflicts.", async ()=>{
      CONFLICT_HISTORY = [];
      await saveData();
      renderConflictManagementPage();
      showToast("Conflict history cleared.");
    }, "Clear History");
  }
});

// Aggregate all assignments across the whole school: teacherId -> [{section, grade, subject, periodsPerWeek, hoursPerWeek}]
// Sums the ACTUAL per-day timelines (Mon–Thu always, Fri only when enabled),
// so it correctly reflects days that now differ from one another.
function buildAllAssignments(){
  const map = {}; // teacherId -> array
  const days = activeDays();
  SECTIONS.forEach(section=>{
    const bySubject = {}; // "subject||teacherId" -> {periods, minutes}
    days.forEach(day=>{
      const timeline = buildTimeline(section, day);
      timeline.filter(b=>b.type==="period" && b.teacherId).forEach(b=>{
        const key = b.subject+"||"+b.teacherId;
        if(!bySubject[key]) bySubject[key] = {periods:0, minutes:0};
        bySubject[key].periods += 1;
        bySubject[key].minutes += (b.end-b.start);
      });
    });
    Object.entries(bySubject).forEach(([key,agg])=>{
      const [subject, teacherId] = key.split("||");
      if(!teacherId) return;
      const periodsPerWeek = agg.periods;
      const hoursPerWeek = +(agg.minutes/60).toFixed(1);
      if(!map[teacherId]) map[teacherId]=[];
      map[teacherId].push({ sectionLabel: section.grade+" - "+section.name, sectionId:section.id, grade:section.grade, program: section.sectionType||"Regular", subject, periodsPerWeek, hoursPerWeek });
    });
  });
  return map;
}
// Per Grade Level, splits a teacher's ACTUAL scheduled assignments (from
// buildAllAssignments above) into Regular Program vs Special Program,
// counting distinct sections, distinct subjects, and total hours/week for
// each — this is what actually happened in the generated schedule, not
// just the Admin-set teaching-load cap. Used by the Teacher Profile,
// Teaching Load Allocation, Teacher Details, and Reports views so Regular
// vs Special Program load is visible everywhere, per grade level.
function teacherProgramBreakdown(teacherId){
  const rows = buildAllAssignments()[teacherId] || [];
  const out = {}; // grade -> { Regular:{sections:Set,subjects:Set,hours}, "Special Program":{...} }
  const blank = ()=>({ sections:new Set(), subjects:new Set(), hours:0 });
  rows.forEach(r=>{
    const g = r.grade, prog = (r.program==="Special Program") ? "Special Program" : "Regular";
    if(!out[g]) out[g] = { "Regular": blank(), "Special Program": blank() };
    out[g][prog].sections.add(r.sectionId||r.sectionLabel);
    out[g][prog].subjects.add(r.subject);
    out[g][prog].hours += r.hoursPerWeek;
  });
  return out;
}

/* =========================================================
   4B. CRUD — Teachers, Sections
   ========================================================= */

/* ---- Teachers ---- */
function openTeacherForm(existingId){
  const existing = existingId ? teacherById(existingId) : null;
  if(existing && !assertOwned(existing, "edit")) return;
  const isEdit = !!existing;
  const esc = s => (s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  // Grade-Level Teaching Assignment row builder: one checkbox, a Regular
  // Class Loads number input, a Special Program Loads number input, and a
  // read-only Total (always Regular + Special — never manually entered,
  // so there's no way for it to disagree with its own inputs). A grade
  // only counts as assigned once its checkbox is checked AND its Total is
  // at least 1 (see save handler below) — unchecking, or zeroing both
  // inputs out, removes the assignment entirely. Since this is one fixed
  // row per GRADE_ORDER entry, duplicate grade-level assignments for the
  // same teacher are structurally impossible.
  const spSubjectOptionsHtml = current=>{
    const list = SPECIAL_PROGRAM_SUBJECTS.slice();
    if(current && !list.some(s=>s.toLowerCase()===current.toLowerCase())) list.push(current); // preserve a since-removed custom value already saved on this teacher
    return `<option value="">Select subject…</option>` + list.map(s=>`<option value="${esc(s)}" ${s===current?'selected':''}>${esc(s)}</option>`).join("");
  };
  const gradeLoadRow = g=>{
    const regCap = isEdit ? teacherGradeCap(existing, g, "regular") : 0;
    const specCap = isEdit ? teacherGradeCap(existing, g, "special") : 0;
    const checked = (regCap+specCap)>0;
    const specialSubject = isEdit ? teacherSpecialProgramSubject(existing, g) : "";
    const shs = isSHSGrade(g);
    const shift = isEdit ? teacherShiftFor(existing, g) : "None";
    const shiftHtml = shs ? `<select class="glShift" style="width:120px;" ${checked?'':'disabled'}>
        ${CLASS_SHIFTS.map(cs=>`<option value="${cs}" ${shift===cs?'selected':''}>${cs==="None"?"No Shift":cs+" Class"}</option>`).join("")}
      </select>` : `<span style="width:120px;"></span>`;
    return `<div class="grade-load-row" data-grade="${g}" style="display:flex;flex-direction:column;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:8px;min-width:120px;font-weight:600;font-size:13px;">
          <input type="checkbox" class="glChk" value="${g}" ${checked?'checked':''}> ${g}
        </label>
        <label style="display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--ink-soft);">Regular Class Loads
          <input type="number" class="glRegular" min="0" step="1" placeholder="0" value="${checked?regCap:''}" ${checked?'':'disabled'} style="width:100px;">
        </label>
        <label style="display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--ink-soft);">Special Program Loads
          <input type="number" class="glSpecial" min="0" step="1" placeholder="0" value="${checked?specCap:''}" ${checked?'':'disabled'} style="width:100px;">
        </label>
        <label style="display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--ink-soft);">Total Loads
          <input type="text" class="glTotal" value="${checked?regCap+specCap:0}" disabled style="width:80px;font-weight:700;color:var(--ink);">
        </label>
        ${shiftHtml}
        <span class="hint glStatus" style="min-width:0;font-size:12px;">${checked?(shs?'Class Shift applies too':'Assigned'):'Not Assigned'}</span>
      </div>
      <div class="gl-special-subject-row" style="display:${(checked && specCap>0)?'flex':'none'}; align-items:center; gap:8px; padding-left:8px; border-left:3px solid #E5C97B; margin-left:4px;">
        <label style="display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--ink-soft);">Special Program Subject
          <select class="glSpecialSubject" style="width:170px;">${spSubjectOptionsHtml(specialSubject)}</select>
        </label>
        <button type="button" class="btn ghost glAddSubjectBtn" style="padding:6px 10px; font-size:12px; align-self:flex-end;">+ Add Subject</button>
        <div class="glAddSubjectForm" style="display:none; align-items:center; gap:6px; align-self:flex-end;">
          <input type="text" class="glNewSubjectInput" placeholder="New subject name" style="width:140px;">
          <button type="button" class="btn gold glConfirmAddSubject" style="padding:6px 10px; font-size:12px;">Add</button>
          <button type="button" class="btn ghost glCancelAddSubject" style="padding:6px 10px; font-size:12px;">Cancel</button>
        </div>
        <span class="hint glAddSubjectErr" style="color:var(--maroon,#8C2F39);"></span>
      </div>
    </div>`;
  };
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="teacherBackdrop">
      <div class="modal-box wide">
        <div class="modal-head"><h3>${isEdit?'Edit Teacher':'Add Teacher'}</h3><button class="modal-close" id="tClose">&times;</button></div>
        <div class="modal-body">
          <div class="field-row">
            <label class="field">Full Name
              <input type="text" id="tName" value="${isEdit?esc(existing.name):''}" placeholder="e.g. Juan Dela Cruz">
            </label>
            <label class="field">Role / Position
              <input type="text" id="tRole" value="${isEdit?esc(existing.role):''}" placeholder="e.g. JHS Mathematics Teacher">
            </label>
          </div>
          <div class="field-row">
            <label class="field">Employee / Teacher ID
              <input type="text" id="tEmpId" value="${isEdit?esc(existing.employeeId||''):''}" placeholder="e.g. T-2026-014">
            </label>
            <label class="field">Employment Status
              <select id="tStatus">
                <option ${isEdit&&existing.status==='Full-time'?'selected':''}>Full-time</option>
                <option ${isEdit&&existing.status==='Part-time'?'selected':''}>Part-time</option>
              </select>
            </label>
          </div>
          <div>
            <div style="font-size:12px;color:var(--ink-soft);font-weight:600;margin-bottom:6px;">Grade-Level Teaching Assignment</div>
            <div class="hint" style="margin-bottom:6px; font-size:14px;">Check each grade level this teacher is authorized to teach, then set the maximum Regular Class Loads and Special Program Loads (class/subject assignments) allowed for that grade level — Total is calculated automatically. The teacher will only ever be scheduled for grade levels checked here, and the AI Classroom Schedule Generator will never exceed either number, tracked separately: Special Program assignments only ever draw from the Special Program Loads cap, never Regular. Leave Special Program Loads at 0 if this teacher has none — that's a normal, valid configuration. Uncheck a grade (or clear both numbers) to remove that assignment.</div>
            <div id="tGradeLoads">
              ${GRADE_ORDER.map(gradeLoadRow).join("")}
            </div>
            <details style="margin-top:8px;">
              <summary style="cursor:pointer; font-size:12px; color:var(--ink-soft); font-weight:600;">Manage Special Program Subjects</summary>
              <div id="spSubjectManageList" style="display:flex; flex-direction:column; gap:6px; margin-top:8px; max-width:420px;"></div>
              <div class="hint" style="margin-top:4px;">Renaming updates it everywhere it's already assigned; a subject currently assigned to a teacher's Special Program Load can't be deleted until it's no longer used.</div>
            </details>
          </div>
          <label class="field">Maximum Teaching Hours/Load overall (optional)
            <input type="number" id="tMaxLoad" min="0" step="0.5" value="${isEdit && existing.maxTeachingHours!=null ? existing.maxTeachingHours : ''}" placeholder="e.g. 30 (leave blank if not applicable)">
          </label>
          <div>
            <div style="font-size:12px;color:var(--ink-soft);font-weight:600;margin-bottom:6px;">Specialization (Learning Areas this teacher can teach)</div>
            <div class="checkbox-group" id="tSpecs">
              ${AREA_LIST.concat((isEdit?(existing.specializations||[]):[]).filter(a=>!AREA_LIST.includes(a))).map(a=>`<label>${!AREA_LIST.includes(a)?'<span class="tag grey" style="margin-right:4px;">Archived</span>':''}<input type="checkbox" value="${esc(a)}" ${isEdit&&(existing.specializations||[]).includes(a)?'checked':''}> ${esc(a)}</label>`).join("")}
            </div>
            <div class="hint" style="margin-top:6px;">Used by the auto-generator to match this teacher to any subject in that Learning Area.</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--ink-soft);font-weight:600;margin-bottom:6px;">Specific Subjects Can Teach (optional overrides, e.g. a Sr. High specialized subject)</div>
            <div id="tSubjList" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
              ${(isEdit?(existing.subjectsCanTeach||[]):[]).map((x,i)=>`<span class="subj-pill">${esc(x)}<button type="button" class="chip-x" data-i="${i}" title="Remove">&times;</button></span>`).join("") || `<span class="hint">None added.</span>`}
            </div>
            <div style="display:flex;gap:8px;">
              <input type="text" id="tNewSubj" placeholder="e.g. General Chemistry 1" style="flex:1;">
              <button type="button" class="btn ghost" id="tAddSubjBtn">Add</button>
            </div>
          </div>
          <div class="err-text" id="tErr"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="tCancel">Cancel</button>
          <button class="btn gold" id="tSave">${isEdit?'Save Changes':'Add Teacher'}</button>
        </div>
      </div>
    </div>`;
  let workingSubjects = isEdit ? (existing.subjectsCanTeach||[]).slice() : [];
  function renderSubjList(){
    document.getElementById("tSubjList").innerHTML = workingSubjects.map((x,i)=>`<span class="subj-pill">${esc(x)}<button type="button" class="chip-x" data-i="${i}" title="Remove">&times;</button></span>`).join("") || `<span class="hint">None added.</span>`;
    document.getElementById("tSubjList").querySelectorAll(".chip-x").forEach(b=>{
      b.onclick = ()=>{ workingSubjects.splice(Number(b.dataset.i),1); renderSubjList(); };
    });
  }
  renderSubjList();
  document.getElementById("tAddSubjBtn").onclick = ()=>{
    const inp = document.getElementById("tNewSubj");
    const v = inp.value.trim();
    if(!v) return;
    if(workingSubjects.some(x=>x.toLowerCase()===v.toLowerCase())){ showToast("That subject is already listed.", true); return; }
    workingSubjects.push(v); inp.value = ""; renderSubjList();
  };
  // Rebuilds every grade row's Special Program Subject <select> options from
  // the current SPECIAL_PROGRAM_SUBJECTS list, preserving whatever each row
  // currently has selected (falling back to blank only if that value no
  // longer exists in the list, e.g. it was just deleted).
  function refreshSpecialSubjectDropdowns(){
    document.querySelectorAll("#tGradeLoads .glSpecialSubject").forEach(sel=>{
      sel.innerHTML = spSubjectOptionsHtml(sel.value);
    });
  }
  // The shared "Manage Special Program Subjects" list — rename (cascades
  // into every teacher already using that subject) and delete (blocked
  // while any teacher's Special Program Load still references it).
  function renderSpSubjectManageList(){
    const wrap = document.getElementById("spSubjectManageList");
    if(!wrap) return;
    const usedCount = {};
    TEACHERS_ALL.forEach(t=> GRADE_ORDER.forEach(g=>{
      const gl = t.gradeLoads && t.gradeLoads[g];
      if(gl && gl.special>0 && gl.specialSubject) usedCount[gl.specialSubject] = (usedCount[gl.specialSubject]||0)+1;
    }));
    wrap.innerHTML = SPECIAL_PROGRAM_SUBJECTS.length ? SPECIAL_PROGRAM_SUBJECTS.map((s,i)=>{
      const inUse = usedCount[s]||0;
      return `<div class="sp-manage-row" data-index="${i}" style="display:flex;align-items:center;gap:6px;">
        <input type="text" class="spRenameInput" value="${esc(s)}" style="flex:1;min-width:0;padding:4px 6px;font-size:12px;">
        <span class="hint" style="white-space:nowrap;font-size:11px;">${inUse?inUse+' in use':''}</span>
        <button type="button" class="icon-btn spSaveRename" style="padding:4px 8px;font-size:11px;">Save</button>
        <button type="button" class="icon-btn danger spDeleteSubject" style="padding:4px 8px;font-size:11px;" ${inUse?'disabled title="In use — remove it from every teacher\'s Special Program Load first"':''}>Delete</button>
      </div>`;
    }).join("") : `<div class="hint">No Special Program Subjects yet — add one from any grade row's Special Program Subject dropdown above.</div>`;
    wrap.querySelectorAll(".spSaveRename").forEach(btn=> btn.onclick = async ()=>{
      const idx = Number(btn.closest(".sp-manage-row").dataset.index);
      const newName = btn.closest(".sp-manage-row").querySelector(".spRenameInput").value.trim();
      const oldName = SPECIAL_PROGRAM_SUBJECTS[idx];
      if(!newName || newName===oldName) return;
      if(SPECIAL_PROGRAM_SUBJECTS.some((s,i)=>i!==idx && s.toLowerCase()===newName.toLowerCase())){
        showToast(`"${newName}" already exists in the Special Program Subject list.`, true); return;
      }
      SPECIAL_PROGRAM_SUBJECTS[idx] = newName;
      TEACHERS_ALL.forEach(t=> GRADE_ORDER.forEach(g=>{
        const gl = t.gradeLoads && t.gradeLoads[g];
        if(gl && gl.specialSubject===oldName) gl.specialSubject = newName;
      }));
      await saveData();
      refreshSpecialSubjectDropdowns();
      renderSpSubjectManageList();
      showToast(`Renamed "${oldName}" to "${newName}".`);
    });
    wrap.querySelectorAll(".spDeleteSubject").forEach(btn=> btn.onclick = async ()=>{
      if(btn.disabled) return;
      if(btn.dataset.armed!=="1"){
        btn.dataset.armed = "1"; btn.textContent = "Confirm?";
        setTimeout(()=>{ if(btn.dataset.armed==="1"){ btn.dataset.armed=""; btn.textContent="Delete"; } }, 3000);
        return;
      }
      const idx = Number(btn.closest(".sp-manage-row").dataset.index);
      SPECIAL_PROGRAM_SUBJECTS.splice(idx,1);
      await saveData();
      refreshSpecialSubjectDropdowns();
      renderSpSubjectManageList();
    });
  }
  renderSpSubjectManageList();
  // Wire each Grade-Level Teaching Assignment row: checking a grade enables
  // its two load inputs (defaulting Regular to 1 if both are empty);
  // unchecking disables and clears them so a stale number can never sneak
  // through unassigned. Total is always derived, never typed — it just
  // reflects Regular + Special live as either input changes. The Special
  // Program Subject dropdown shows only while this row's Special Program
  // Loads is greater than 0, per the Admin's live input.
  document.querySelectorAll("#tGradeLoads .grade-load-row").forEach(row=>{
    const chk = row.querySelector(".glChk");
    const regInput = row.querySelector(".glRegular");
    const specInput = row.querySelector(".glSpecial");
    const totalInput = row.querySelector(".glTotal");
    const shiftSelect = row.querySelector(".glShift");
    const status = row.querySelector(".glStatus");
    const specialSubjectRow = row.querySelector(".gl-special-subject-row");
    const shs = isSHSGrade(row.dataset.grade);
    const wholeNonNegative = v => v!=="" && /^\d+$/.test(v.trim());
    const updateTotal = ()=>{
      const r = wholeNonNegative(regInput.value) ? Number(regInput.value) : 0;
      const s = wholeNonNegative(specInput.value) ? Number(specInput.value) : 0;
      totalInput.value = r+s;
      if(specialSubjectRow) specialSubjectRow.style.display = (chk.checked && s>0) ? "flex" : "none";
    };
    const syncRow = ()=>{
      regInput.disabled = !chk.checked;
      specInput.disabled = !chk.checked;
      if(shiftSelect) shiftSelect.disabled = !chk.checked;
      if(chk.checked){
        if(!regInput.value && !specInput.value) regInput.value = "1";
        status.textContent = shs ? "Class Shift applies too" : "Assigned";
      } else {
        regInput.value = ""; specInput.value = "";
        if(shiftSelect) shiftSelect.value = "None";
        status.textContent = "Not Assigned";
      }
      updateTotal();
    };
    chk.addEventListener("change", syncRow);
    regInput.addEventListener("input", updateTotal);
    specInput.addEventListener("input", updateTotal);
    syncRow();

    // Inline "+ Add Subject" quick-add — lets the Admin create a new Special
    // Program Subject without leaving the Teacher form, immediately
    // available in every row's dropdown (and persisted right away so it's
    // available to other teachers/sessions too, per the spec).
    const addBtn = row.querySelector(".glAddSubjectBtn");
    const addForm = row.querySelector(".glAddSubjectForm");
    const newInput = row.querySelector(".glNewSubjectInput");
    const errEl = row.querySelector(".glAddSubjectErr");
    const specialSelect = row.querySelector(".glSpecialSubject");
    if(addBtn){
      addBtn.addEventListener("click", ()=>{
        addBtn.style.display = "none"; addForm.style.display = "flex"; errEl.textContent = ""; newInput.focus();
      });
      row.querySelector(".glCancelAddSubject").addEventListener("click", ()=>{
        addForm.style.display = "none"; addBtn.style.display = "inline-block"; newInput.value = ""; errEl.textContent = "";
      });
      row.querySelector(".glConfirmAddSubject").addEventListener("click", async ()=>{
        const name = newInput.value.trim();
        if(!name){ errEl.textContent = "Enter a subject name."; return; }
        if(SPECIAL_PROGRAM_SUBJECTS.some(s=>s.toLowerCase()===name.toLowerCase())){
          errEl.textContent = `"${name}" already exists.`; return;
        }
        SPECIAL_PROGRAM_SUBJECTS.push(name);
        await saveData();
        errEl.textContent = ""; newInput.value = "";
        addForm.style.display = "none"; addBtn.style.display = "inline-block";
        refreshSpecialSubjectDropdowns();
        renderSpSubjectManageList();
        specialSelect.value = name; // select what the Admin just added
      });
    }
  });
  document.getElementById("tClose").onclick = closeModal;
  document.getElementById("tCancel").onclick = closeModal;
  document.getElementById("teacherBackdrop").addEventListener("click", e=>{ if(e.target.id==="teacherBackdrop") closeModal(); });
  document.getElementById("tSave").onclick = ()=> withButtonLoading(document.getElementById("tSave"), async ()=>{
    const name = document.getElementById("tName").value.trim();
    const role = document.getElementById("tRole").value.trim();
    const employeeId = document.getElementById("tEmpId").value.trim();
    const status = document.getElementById("tStatus").value;
    const specializations = Array.from(document.querySelectorAll("#tSpecs input:checked")).map(i=>i.value);
    const maxLoadRaw = document.getElementById("tMaxLoad").value;
    const maxTeachingHours = maxLoadRaw==="" ? null : Math.max(0, Number(maxLoadRaw)||0);

    // Build the Grade-Level Teaching Assignment + per-grade Regular/Special
    // Program Load map. Basic data-integrity validation only (whole numbers,
    // not negative) — there is no "Valid/Invalid Load" concept here; any
    // non-negative whole-number combination the Admin enters, including
    // Special Program = 0, is accepted and used as-is by the generator.
    const gradeLoads = {};
    const gradeShifts = {};
    let gradeErr = "";
    const wholeNonNegative = v => v!=="" && /^\d+$/.test(String(v).trim());
    document.querySelectorAll("#tGradeLoads .grade-load-row").forEach(row=>{
      const g = row.dataset.grade;
      const chk = row.querySelector(".glChk");
      const regInput = row.querySelector(".glRegular");
      const specInput = row.querySelector(".glSpecial");
      const shiftSelect = row.querySelector(".glShift");
      const specialSubjectSelect = row.querySelector(".glSpecialSubject");
      if(!chk.checked) return;
      if(gradeErr) return;
      const regRaw = regInput.value.trim() || "0";
      const specRaw = specInput.value.trim() || "0";
      if(!wholeNonNegative(regRaw)){ gradeErr = `Regular Class Loads for ${g} must be a whole number, 0 or greater (no negatives or decimals).`; return; }
      if(!wholeNonNegative(specRaw)){ gradeErr = `Special Program Loads for ${g} must be a whole number, 0 or greater (no negatives or decimals).`; return; }
      const regular = Number(regRaw), special = Number(specRaw);
      if(regular+special < 1){ gradeErr = `Enter a Regular Class or Special Program Load of at least 1 for ${g}, or uncheck it.`; return; }
      const specialSubject = (special>0 && specialSubjectSelect) ? specialSubjectSelect.value : "";
      if(special>0 && !specialSubject){ gradeErr = `Select a Special Program Subject for ${g}, or add a new one, since Special Program Loads is greater than 0.`; return; }
      gradeLoads[g] = { regular, special, specialSubject };
      if(shiftSelect) gradeShifts[g] = shiftSelect.value || "None";
    });
    const tiers = GRADE_ORDER.filter(g=>gradeLoadTotal(gradeLoads[g])>0);
    if(!name || !role || tiers.length===0){
      document.getElementById("tErr").textContent = "Please fill in name, role, and assign at least one grade level with a teaching load.";
      return;
    }
    if(gradeErr){
      document.getElementById("tErr").textContent = gradeErr;
      return;
    }
    let teacherRecord;
    if(isEdit){
      existing.name = name; existing.role = role; existing.employeeId = employeeId;
      existing.tiers = tiers; existing.gradeLoads = gradeLoads; existing.gradeShifts = gradeShifts; existing.status = status;
      existing.specializations = specializations; existing.subjectsCanTeach = workingSubjects.slice();
      existing.maxTeachingHours = maxTeachingHours;
      teacherRecord = existing;
    } else {
      const id = makeId(); // stable UUID — safe to create the same teacher offline on two devices without ID collisions
      const t = { id, name, role, employeeId, tiers, gradeLoads, gradeShifts, status, specializations, subjectsCanTeach: workingSubjects.slice(), maxTeachingHours, createdBy: currentAdminId() };
      TEACHERS_ALL.push(t);
      refreshOwnedViews();
      selectedTeacher = id;
      teacherRecord = t;
    }
    closeModal();
    await saveData();
    await persistEntityChange("teachers", teacherRecord, isEdit ? "UPDATE" : "CREATE");
    renderAll();
    showToast(isEdit ? "Teacher updated." : "Teacher added.");
  });
}
function deleteTeacher(id){
  const t = teacherById(id);
  if(!t) return;
  if(!assertOwned(t, "delete")) return;
  openConfirm(`Delete <b>${t.name}</b> from the faculty roster? Their generated schedule assignments will be cleared.`, async ()=>{
    const idx = TEACHERS_ALL.findIndex(x=>x.id===id);
    if(idx>-1) TEACHERS_ALL.splice(idx,1);
    refreshOwnedViews();
    if(selectedTeacher===id) selectedTeacher = null;
    // Actually clear this teacher's generated schedule assignments, as the
    // confirmation dialog promises — otherwise the deleted teacher's periods
    // silently keep counting toward weekly hours while showing "Unassigned".
    Object.keys(SCHEDULE_ASSIGNMENTS).forEach(k=>{
      if(SCHEDULE_ASSIGNMENTS[k]===id) delete SCHEDULE_ASSIGNMENTS[k];
    });
    await saveData();
    await persistEntityChange("teachers", {id}, "DELETE");
    renderAll();
    showToast("Teacher deleted. Regenerate the schedule to reassign their vacated periods.");
  });
}

/* ---- Sections ---- */
function openSectionForm(existingId){
  const existing = existingId ? SECTIONS.find(s=>s.id===existingId) : null;
  if(existing && !assertOwned(existing, "edit")) return;
  const isEdit = !!existing;
  const esc = s => (s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="sectionBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>${isEdit?'Edit Section':'Add Section'}</h3><button class="modal-close" id="sClose">&times;</button></div>
        <div class="modal-body">
          <label class="field">Grade Level
            <select id="sGrade">${GRADE_ORDER.map(g=>`<option ${isEdit&&existing.grade===g?'selected':''}>${g}</option>`).join("")}</select>
          </label>
          <label class="field">Section Name
            <input type="text" id="sName" value="${isEdit?esc(existing.name):''}" placeholder="e.g. Narra">
          </label>
          <label class="field" id="sStrandField" style="display:none;">Track (Sr. High only)
            <select id="sStrand">
              <option value="">— None —</option>
              ${TRACK_LIST.map(s=>`<option ${isEdit&&existing.strand===s?'selected':''}>${s}</option>`).join("")}
            </select>
          </label>
          <label class="field">Section Type
            <select id="sSectionType">${SECTION_TYPES.map(t=>`<option ${(isEdit?existing.sectionType:'Regular')===t?'selected':''}>${t}</option>`).join("")}</select>
            <span class="hint">Special Program sections may only be scheduled Special Program subjects, and vice versa.</span>
          </label>
          <label class="field" id="sShiftField" style="display:none;">Class Shift (Grade 11/12 only)
            <select id="sClassShift">${CLASS_SHIFTS.map(cs=>`<option value="${cs}" ${(isEdit?(existing.classShift||'None'):'None')===cs?'selected':''}>${cs==="None"?"None":cs+" Class"}</option>`).join("")}</select>
            <span class="hint">AM/PM Class shifting keeps this section's schedule inside the school's morning or afternoon window.</span>
          </label>
          <label class="field">Room / Building
            <select id="sRoom">
              <option value="">— Unassigned —</option>
              ${ROOMS.map(r=>`<option value="${r.id}" ${isEdit&&existing.roomId===r.id?'selected':''}>${esc(r.name)}${r.type?' — '+esc(r.type):''}</option>`).join("")}
              <option value="__new__">+ Add New Room…</option>
            </select>
          </label>
          <div id="sRoomNewFields" style="display:none; background:#F7F4E9; border:1px solid var(--line); border-radius:8px; padding:12px; margin-top:-4px;">
            <label class="field">New room name
              <input type="text" id="nrName" placeholder="e.g. Room 204">
            </label>
            <label class="field" style="margin-top:8px;">Type
              <input type="text" id="nrType" placeholder="e.g. Classroom, Science Lab, Gym">
            </label>
            <label class="field" style="margin-top:8px;">Capacity
              <input type="number" min="1" id="nrCapacity">
            </label>
            <div class="err-text" id="nrErr"></div>
            <button type="button" class="btn gold" id="nrSaveBtn" style="margin-top:4px;">Save Room</button>
          </div>
          <div class="err-text" id="sErr"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="sCancel">Cancel</button>
          <button class="btn gold" id="sSave">${isEdit?'Save Changes':'Add Section'}</button>
        </div>
      </div>
    </div>`;
  function syncGradeDependentFields(){
    const g = document.getElementById("sGrade").value;
    const isShs = (g==="Grade 11"||g==="Grade 12");
    document.getElementById("sStrandField").style.display = isShs ? "flex" : "none";
    document.getElementById("sShiftField").style.display = isShs ? "flex" : "none";
  }
  document.getElementById("sGrade").addEventListener("change", syncGradeDependentFields);
  syncGradeDependentFields();
  const roomSelect = document.getElementById("sRoom");
  const newRoomFields = document.getElementById("sRoomNewFields");
  let lastRoomValue = roomSelect.value;
  roomSelect.addEventListener("change", ()=>{
    newRoomFields.style.display = roomSelect.value==="__new__" ? "block" : "none";
    if(roomSelect.value==="__new__") document.getElementById("nrName").focus();
  });
  document.getElementById("nrSaveBtn").onclick = async ()=>{
    const name = document.getElementById("nrName").value.trim();
    const type = document.getElementById("nrType").value.trim();
    const capacity = Number(document.getElementById("nrCapacity").value)||null;
    if(!name){ document.getElementById("nrErr").textContent = "Please enter a room name."; return; }
    if(ROOMS.some(r=>r.name.toLowerCase()===name.toLowerCase())){ document.getElementById("nrErr").textContent = "A room with this name already exists."; return; }
    const room = { id:"RM"+(roomCounter++), name, type, capacity };
    ROOMS.push(room);
    await saveData();
    const opt = document.createElement("option");
    opt.value = room.id;
    opt.textContent = room.name + (room.type ? " — "+room.type : "");
    roomSelect.insertBefore(opt, roomSelect.querySelector('option[value="__new__"]'));
    roomSelect.value = room.id;
    lastRoomValue = room.id;
    newRoomFields.style.display = "none";
    document.getElementById("nrErr").textContent = "";
    showToast("Room added. It's now selected for this section.");
  };
  document.getElementById("sClose").onclick = closeModal;
  document.getElementById("sCancel").onclick = closeModal;
  document.getElementById("sectionBackdrop").addEventListener("click", e=>{ if(e.target.id==="sectionBackdrop") closeModal(); });
  document.getElementById("sSave").onclick = ()=> withButtonLoading(document.getElementById("sSave"), async ()=>{
    const grade = document.getElementById("sGrade").value;
    const name = document.getElementById("sName").value.trim();
    const strandRaw = document.getElementById("sStrand") ? document.getElementById("sStrand").value : "";
    const strand = (grade==="Grade 11"||grade==="Grade 12") && strandRaw ? strandRaw : undefined;
    const isShs = (grade==="Grade 11"||grade==="Grade 12");
    const sectionType = document.getElementById("sSectionType").value || "Regular";
    const classShift = isShs ? (document.getElementById("sClassShift").value || "None") : "None";
    const roomSel = document.getElementById("sRoom").value;
    if(roomSel==="__new__"){ document.getElementById("nrErr").textContent = "Save the new room first, or choose an existing one."; return; }
    const roomId = roomSel || undefined;
    if(!name){ document.getElementById("sErr").textContent = "Please enter a section name."; return; }
    const dup = SECTIONS.some(s=> s.grade===grade && s.name.toLowerCase()===name.toLowerCase() && (!isEdit || s.id!==existing.id));
    if(dup){ document.getElementById("sErr").textContent = "A section with this name already exists in that grade."; return; }
    let sectionRecord;
    if(isEdit){
      existing.grade = grade; existing.name = name;
      if(strand) existing.strand = strand; else delete existing.strand;
      if(roomId) existing.roomId = roomId; else delete existing.roomId;
      existing.sectionType = sectionType; existing.classShift = classShift;
      sectionRecord = existing;
    } else {
      const id = makeId(); // stable UUID — safe to create the same section offline on two devices without ID collisions
      const sec = { id, grade, name, tier:tierOf(grade), subTier:subTierOf(grade), sectionType, classShift, createdBy: currentAdminId() };
      if(strand) sec.strand = strand;
      if(roomId) sec.roomId = roomId;
      SECTIONS_ALL.push(sec);
      refreshOwnedViews();
      sectionRecord = sec;
    }
    recomputeSectionIdx();
    closeModal();
    await saveData();
    await persistEntityChange("sections", sectionRecord, isEdit ? "UPDATE" : "CREATE");
    renderAll();
    showToast(isEdit ? "Section updated." : "Section added.");
  });
}
// Read-only "Manage Details" view for a Section — room, track, and the
// subjects currently scheduled for it, without opening the editable form.
function openSectionViewModal(id){
  const s = SECTIONS.find(x=>x.id===id);
  if(!s) return;
  const room = s.roomId ? ROOMS.find(r=>r.id===s.roomId) : null;
  const subs = subjectsForSection(s);
  const row = (label, value) => `<div class="field-row" style="margin-bottom:8px;"><div style="flex:1;font-size:12px;color:var(--ink-soft);font-weight:700;">${label}</div><div style="flex:2;font-size:13.5px;">${value}</div></div>`;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="sectionViewBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>Section Details</h3><button class="modal-close" id="sectionViewClose">&times;</button></div>
        <div class="modal-body">
          ${row("Grade Level", esc(s.grade))}
          ${row("Section Name", `<b>${esc(s.name)}</b>`)}
          ${row("Track/Strand", s.strand ? `<span class="tag maroon">${esc(s.strand)}</span>` : '<span class="hint">—</span>')}
          ${row("Room / Building", room ? `<b>${esc(room.name)}</b>${room.type?` — ${esc(room.type)}`:""}` : '<span class="hint">Unassigned</span>')}
          ${row("Subjects Assigned", subs.length ? subs.map(sub=>esc(sub.name)).join(", ") : '<span class="hint">None yet</span>')}
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="sectionViewCloseBtn">Close</button>
          <button class="btn gold" id="sectionViewEditBtn">✏️ Edit</button>
        </div>
      </div>
    </div>`;
  document.getElementById("sectionViewClose").onclick = closeModal;
  document.getElementById("sectionViewCloseBtn").onclick = closeModal;
  document.getElementById("sectionViewBackdrop").addEventListener("click", e=>{ if(e.target.id==="sectionViewBackdrop") closeModal(); });
  document.getElementById("sectionViewEditBtn").onclick = ()=>{ closeModal(); openSectionForm(id); };
}
// Read-only "View / Manage Details" modal for a Section.
function openSectionViewModal(id){
  const s = SECTIONS.find(x=>x.id===id);
  if(!s) return;
  const room = s.roomId ? ROOMS.find(r=>r.id===s.roomId) : null;
  const subs = subjectsForSection(s);
  const row = (label, value) => `<div class="field-row" style="margin-bottom:8px;"><div style="flex:1;font-size:12px;color:var(--ink-soft);font-weight:700;">${label}</div><div style="flex:2;font-size:13.5px;">${value}</div></div>`;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="secViewBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>Section Details</h3><button class="modal-close" id="secViewClose">&times;</button></div>
        <div class="modal-body">
          ${row("Grade Level", esc(s.grade))}
          ${row("Section Name", `<b>${esc(s.name)}</b>`)}
          ${row("Track/Strand", s.strand ? `<span class="tag maroon">${esc(s.strand)}</span>` : '<span class="hint">—</span>')}
          ${row("Section Type", `<span class="tag ${s.sectionType==='Special Program'?'maroon':'gold'}">${esc(s.sectionType||'Regular')}</span>`)}
          ${isSHSGrade(s.grade) ? row("Class Shift", s.classShift && s.classShift!=='None' ? `<span class="tag gold">${esc(s.classShift)} Class</span>` : '<span class="hint">None</span>') : ''}
          ${row("Room / Building", room ? `<b>${esc(room.name)}</b>${room.type?' — '+esc(room.type):''}` : '<span class="hint">Unassigned</span>')}
          ${row("Subjects Assigned", subs.length)}
          <div style="font-size:12px;color:var(--ink-soft);font-weight:700;margin:12px 0 6px;">Assigned Subjects</div>
          ${subs.length ? `<ul style="margin:0;padding-left:18px;font-size:13px;">${subs.map(sub=>`<li>${esc(sub.name)} (${esc(sub.code)})</li>`).join("")}</ul>` : `<div class="hint">No subjects assigned for this section yet.</div>`}
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="secViewCloseBtn">Close</button>
          <button class="btn gold" id="secViewEditBtn">✏️ Edit</button>
        </div>
      </div>
    </div>`;
  document.getElementById("secViewClose").onclick = closeModal;
  document.getElementById("secViewCloseBtn").onclick = closeModal;
  document.getElementById("secViewBackdrop").addEventListener("click", e=>{ if(e.target.id==="secViewBackdrop") closeModal(); });
  document.getElementById("secViewEditBtn").onclick = ()=>{ closeModal(); openSectionForm(id); };
}
function deleteSection(id){
  const s = SECTIONS.find(x=>x.id===id);
  if(!s) return;
  if(!assertOwned(s, "delete")) return;
  openConfirm(`Delete <b>${s.grade} - ${s.name}</b>? This removes it from the section list and daily timetable.`, async ()=>{
    const idx = SECTIONS_ALL.findIndex(x=>x.id===id);
    if(idx>-1) SECTIONS_ALL.splice(idx,1);
    refreshOwnedViews();
    await saveData();
    await persistEntityChange("sections", {id}, "DELETE");
    renderAll();
    showToast("Section deleted.");
  });
}

/* =========================================================
   5. NAVIGATION
   ========================================================= */
const PAGE_TITLES = {
  dashboard:["Dashboard","Overview of teaching loads and today's bell schedule"],
  schoolyears:["School Year & Terms","Add, activate, archive, and select the School Year and Term used across the system"],
  teachers:["Teachers & Loads","Faculty roster, specializations, and weekly teaching hours"],
  learningareas:["Specializations & Learning Areas","Manage the master list of teacher specializations and subject learning areas"],
  subjects:["Subjects","Generate and manage subjects — the school's primary academic reference — per School Year, Term, and Grade Level"],
  sections:["Sections","Class sections, advisers, and subject-based coordination"],
  schedule:["Class Schedule","Generated daily timetable per grade level and section"],
  finalschedule:["Final Classroom Schedule","The saved, approved schedule — filterable and ready to print"],
  conflicts:["Schedule Conflicts","Detect, review, auto-fix, and track resolution history for scheduling conflicts — separate from Class Schedule"],
  reports:["Reports","Teaching load, roster, and bell schedule summaries"],
  database:["Database & Sync","Local storage, cloud connection, synchronization status, backup, and restore"],
  settings:["Admin Settings","Configure the school start time and each grade level's bell schedule"]
};
function navigateTo(page, opts){
  document.querySelectorAll(".navlist button").forEach(b=>b.classList.remove("active"));
  const navBtn = document.querySelector('.navlist button[data-page="'+page+'"]');
  if(navBtn) navBtn.classList.add("active");
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById("page-"+page).classList.add("active");
  document.getElementById("pageTitle").textContent = PAGE_TITLES[page][0];
  document.getElementById("pageSub").textContent = PAGE_TITLES[page][1];
  if(page==="subjects") syncSubjectFiltersToCurrent();
  if(page==="learningareas") renderLearningAreasPage();
  if(page==="finalschedule") renderFinalSchedulePage();
  if(page==="conflicts") renderConflictManagementPage();
  if(page==="database") renderSyncCenter();
  if(opts && typeof opts.then==="function") opts.then();
}
// Keeps the Subjects page's School Year/Term filters aligned with whichever
// School Year/Term is currently selected (e.g. after "Select" on the School
// Year & Terms page) whenever the Subjects page is opened.
function syncSubjectFiltersToCurrent(){
  const sySel = document.getElementById("subjFilterSY");
  const termSel = document.getElementById("subjFilterTerm");
  if(!sySel || !termSel) return;
  sySel.innerHTML = SCHOOL_YEARS.map(y=>`<option value="${y.id}" ${y.id===CURRENT_SCHOOL_YEAR_ID?'selected':''}>${esc(y.label)}${y.status==='active'?' (Active)':''}</option>`).join("");
  termSel.innerHTML = TERMS.map(t=>`<option value="${t.id}" ${t.id===CURRENT_TERM_ID?'selected':''}>${esc(t.name)}</option>`).join("");
  syncSubjectStrandFilter();
  renderSubjects();
}
function closeMobileSidebar(){ document.getElementById("appRoot").classList.remove("sidebar-open"); }
document.getElementById("sidebarToggleBtn").addEventListener("click", ()=>{
  const appRoot = document.getElementById("appRoot");
  appRoot.classList.toggle("sidebar-open");
  appRoot.classList.remove("topbar-hidden");
});
document.getElementById("sidebarBackdrop").addEventListener("click", closeMobileSidebar);
document.getElementById("navlist").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  navigateTo(btn.dataset.page);
});

let lastScrollY = window.scrollY;
let topbarShowTimer = null;
window.addEventListener("scroll", ()=>{
  const appRoot = document.getElementById("appRoot");
  const currentScrollY = window.scrollY;
  const scrollingDown = currentScrollY > lastScrollY + 4;
  const scrollingUp = currentScrollY < lastScrollY - 4;
  lastScrollY = currentScrollY;
  if(!appRoot || appRoot.classList.contains("sidebar-open")) return;
  clearTimeout(topbarShowTimer);
  if(scrollingDown && currentScrollY > 24){
    appRoot.classList.add("topbar-hidden");
  } else if(scrollingUp || currentScrollY <= 24){
    appRoot.classList.remove("topbar-hidden");
  }
  topbarShowTimer = setTimeout(()=>appRoot.classList.remove("topbar-hidden"), 180);
}, {passive:true});

const ROLE_LABEL = { super_admin:"Super Admin" };

/* =========================================================
   6. RENDERERS
   ========================================================= */
function renderTopStart(){
  const earliest = Math.min(...GRADE_ORDER.map(g=>toMinutes((GRADE_CONFIG[g]||{}).startTime || ADMIN_START)));
  document.getElementById("topStart").textContent = fmt(earliest);
}
function renderTopTerm(){ const el = document.getElementById("topTerm"); if(el) el.textContent = CURRENT_TERM; }
function renderTopSchoolYear(){ const el = document.getElementById("topSchoolYear"); const sy = schoolYearById(CURRENT_SCHOOL_YEAR_ID); if(el) el.textContent = sy ? sy.label : "—"; }

// Quick Actions shown on the dashboard. `page` is the destination page;
// `open` (optional) is called right after navigating (e.g. to pop a
// "add new" modal). `roles` controls which viewer roles see the button.
const QUICK_ACTIONS = [
  { id:"create_schedule", icon:"➕", label:"Create Schedule", page:"schedule", roles:["super_admin","admin"] },
  { id:"manage_school_year", icon:"🗓️", label:"Manage School Year", page:"schoolyears", roles:["super_admin","admin"] },
  { id:"add_teacher", icon:"👨‍🏫", label:"Add Teacher", page:"teachers", open:()=>openTeacherForm(), roles:["super_admin","admin"] },
  { id:"add_section", icon:"👨‍🎓", label:"Add Section", page:"sections", open:()=>openSectionForm(), roles:["super_admin","admin"] },
  { id:"manage_learning_areas", icon:"🧭", label:"Learning Areas", page:"learningareas", roles:["super_admin","admin"] },
  { id:"manage_subjects", icon:"📚", label:"Manage Subjects", page:"subjects", roles:["super_admin","admin"] },
  { id:"teaching_loads", icon:"📋", label:"Teaching Loads", page:"teachers", roles:["super_admin","admin","teacher"] },
  { id:"bell_schedule", icon:"🕒", label:"Bell Schedule", page:"settings", roles:["super_admin","admin"] },
  { id:"validate_schedule", icon:"✓", label:"Validate Schedule", page:"schedule", open:()=>document.getElementById("validateScheduleBtn")?.click(), roles:["super_admin","admin"] },
  { id:"view_final_schedule", icon:"📅", label:"Final Classroom Schedule", page:"finalschedule", roles:["super_admin","admin","teacher"] },
  { id:"view_reports", icon:"📊", label:"View Reports", page:"reports", roles:["super_admin","admin","teacher"] },
  { id:"admin_settings", icon:"⚙️", label:"Admin Settings", page:"settings", roles:["super_admin","admin"] }
];
function renderQuickActions(){
  const wrap = document.getElementById("quickActions");
  const visible = QUICK_ACTIONS.filter(a=>a.roles.includes(CURRENT_ROLE) && canAccessPage(a.page));
  if(!visible.length){
    wrap.innerHTML = `<div class="qa-empty">No quick actions are available for the ${ROLE_LABEL[CURRENT_ROLE]} role.</div>`;
    return;
  }
  wrap.innerHTML = visible.map(a=>`<button type="button" class="qa-btn" data-action="${a.id}" data-tour="quick-action-${a.id}"><span class="qa-icon">${a.icon}</span><span class="qa-label">${a.label}</span></button>`).join("");
  wrap.querySelectorAll(".qa-btn").forEach(btn=>{
    const action = QUICK_ACTIONS.find(a=>a.id===btn.dataset.action);
    btn.addEventListener("click", ()=> navigateTo(action.page, { then: action.open }));
  });
}

function renderDashboard(){
  const assignments = buildAllAssignments();
  const totalHours = Object.values(assignments).flat().reduce((a,b)=>a+b.hoursPerWeek,0);
  const subjectsOffered = new Set();
  SECTIONS.forEach(s=>subjectsForSection(s).forEach(x=>subjectsOffered.add(x)));

  document.getElementById("statCards").innerHTML = `
    <div class="card stat"><div class="label">Faculty Members</div><div class="value">${TEACHERS.length}</div><div class="sub">Across Grade 7 to Grade 12</div></div>
    <div class="card stat"><div class="label">Active Sections</div><div class="value">${SECTIONS.length}</div><div class="sub">${GRADE_ORDER.length} grade levels (JHS &amp; SHS)</div></div>
    <div class="card stat"><div class="label">Distinct Learning Areas Offered</div><div class="value">${subjectsOffered.size}</div><div class="sub">Aligned with the DepEd MATATAG Curriculum</div></div>
    <div class="card stat"><div class="label">Total Weekly Teaching Hours</div><div class="value">${totalHours.toFixed(0)}</div><div class="sub">Sum of all faculty teaching loads</div></div>
  `;

  renderQuickActions();
}

function renderBellSnapshotInto(elId){
  const bell = document.getElementById(elId);
  if(!bell) return;
  bell.innerHTML = GRADE_ORDER.map(g=>{
    const rep = SECTIONS.find(s=>s.grade===g);
    if(!rep) return `<div class="bell-row"><div class="bell-label">${g}</div><div class="hint">No sections yet for this grade level.</div></div>`;
    const dayStart = toMinutes(GRADE_CONFIG[g].startTime || ADMIN_START);
    const timeline = buildTimeline(rep);
    const dayEnd = timeline[timeline.length-1].end;
    const total = dayEnd-dayStart;
    const segs = timeline.map(b=>{
      const cls = b.type==="break"?"seg-break":b.type==="lunch"?"seg-lunch":"seg-period";
      const w = ((b.end-b.start)/total*100).toFixed(2);
      return `<div class="${cls}" style="width:${w}%"></div>`;
    }).join("");
    const amBreakBlock = timeline.find(b=>b.type==="break" && b.subtype==="am");
    const lunchBlock = timeline.find(b=>b.type==="lunch");
    const pmBreakBlock = timeline.find(b=>b.type==="break" && b.subtype==="pm");
    return `<div class="bell-row">
      <div class="bell-label">${g}</div>
      <div class="bell-track">${segs}</div>
      <div class="bell-times">AM Break ${fmt(amBreakBlock.start)} · Lunch ${fmt(lunchBlock.start)} · PM Break ${fmt(pmBreakBlock.start)}</div>
    </div>`;
  }).join("");
}

function renderReports(){
  const assignments = buildAllAssignments();

  // Load by learning area
  const areaHours = {};
  Object.values(assignments).flat().forEach(a=>{
    const area = subjectLearningArea(a.subject);
    areaHours[area] = (areaHours[area]||0)+a.hoursPerWeek;
  });
  const areaEntries = Object.entries(areaHours);
  const maxA = areaEntries.length ? Math.max(...areaEntries.map(e=>e[1])) : 0;
  document.getElementById("reportLoadByArea").innerHTML = areaEntries.length ? areaEntries.sort((a,b)=>b[1]-a[1]).map(([area,hrs])=>`
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;">
        <span><b>${area}</b></span><span>${hrs.toFixed(1)} hrs/wk</span>
      </div>
      <div style="background:#EFEAD9;border-radius:5px;height:10px;overflow:hidden;">
        <div style="background:var(--navy);height:100%;width:${(hrs/maxA*100).toFixed(1)}%"></div>
      </div>
    </div>`).join("") : `<div class="empty">No teaching load assigned yet.</div>`;

  // Roster composition
  const counts = {}; GRADE_ORDER.forEach(g=>counts[g]=0);
  TEACHERS.forEach(t=>(t.tiers||[]).forEach(g=>counts[g]!==undefined && counts[g]++));
  const ft = TEACHERS.filter(t=>t.status==="Full-time").length;
  document.getElementById("reportRosterComp").innerHTML = `
    <div class="kpi-mini" style="margin-bottom:8px;">Full-time: <b>${ft}</b> &nbsp;|&nbsp; Part-time: <b>${TEACHERS.length-ft}</b></div>
    <table><thead><tr><th>Grade Level</th><th>Teachers Assigned</th></tr></thead><tbody>
      ${GRADE_ORDER.map(g=>`<tr><td>${g}</td><td>${counts[g]}</td></tr>`).join("")}
    </tbody></table>`;

  // Regular vs Special Program assignments (per teacher, per grade)
  const progRows = [];
  TEACHERS.forEach(t=>{
    const bd = teacherProgramBreakdown(t.id);
    GRADE_ORDER.forEach(g=>{
      if(!bd[g]) return;
      const reg = bd[g]["Regular"], spec = bd[g]["Special Program"];
      if(!reg.sections.size && !spec.sections.size) return;
      progRows.push({ teacher:t.name, grade:g, reg, spec });
    });
  });
  document.getElementById("reportProgramBreakdown").innerHTML = progRows.length ? `
    <table><thead><tr><th>Teacher</th><th>Grade Level</th><th>Regular Program</th><th>Special Program</th></tr></thead><tbody>
      ${progRows.map(r=>`<tr>
        <td>${esc(r.teacher)}</td><td>${r.grade}</td>
        <td>${r.reg.sections.size} class${r.reg.sections.size===1?'':'es'} &middot; ${r.reg.subjects.size} subj &middot; ${r.reg.hours.toFixed(1)} hrs/wk</td>
        <td>${r.spec.sections.size} class${r.spec.sections.size===1?'':'es'} &middot; ${r.spec.subjects.size} subj &middot; ${r.spec.hours.toFixed(1)} hrs/wk</td>
      </tr>`).join("")}
    </tbody></table>` : `<div class="empty">No teaching load assigned yet.</div>`;

  renderBellSnapshotInto("reportBellSnapshot");
}

/* =========================================================
   DATABASE PAGE — table counts + JSON export/import backup
   ========================================================= */
const DB_TABLES = [
  { key:"teachers", label:"Teachers", get:()=>TEACHERS.length, desc:"Faculty roster, specializations, and status (your own records only)", clearable:true },
  { key:"sections", label:"Sections", get:()=>SECTIONS.length, desc:"Class sections per grade level and track (your own records only)", clearable:true },
  { key:"rooms", label:"Rooms", get:()=>ROOMS.length, desc:"Classrooms and shared facilities — shared across every admin", clearable:true },
  { key:"schoolYears", label:"School Years", get:()=>SCHOOL_YEARS.length, desc:"School Year records and their status" },
  { key:"terms", label:"Terms", get:()=>TERMS.length, desc:"Terms available across every School Year" },
  { key:"subjects", label:"Subjects", get:()=>SUBJECTS.length, desc:"Subject records added per School Year + Term + Grade Level", clearable:true },
  { key:"scheduleAssignments", label:"Schedule Assignments", get:()=>Object.keys(SCHEDULE_ASSIGNMENTS).filter(k=>SECTIONS.some(s=>s.id===k.split("|")[0])).length, desc:"Generated teacher-to-period assignments (your own sections only)", clearable:true }
];
function renderDatabase(){
  const cards = document.getElementById("dbStatCards");
  if(!cards) return;
  cards.innerHTML = DB_TABLES.slice(0,4).map(t=>`
    <div class="card stat"><div class="label">${t.label}</div><div class="value">${t.get()}</div><div class="sub">${t.desc}</div></div>
  `).join("");
  document.querySelector("#dbTablesTable tbody").innerHTML = DB_TABLES.map(t=>`
    <tr><td><b>${t.label}</b></td><td>${t.get()}</td><td>${t.desc}</td><td>${t.clearable ? `<button class="icon-btn danger" data-clear-table="${t.key}" ${t.get()===0?'disabled':''}>Clear All</button>` : ''}</td></tr>
  `).join("");
  document.querySelectorAll("#dbTablesTable [data-clear-table]").forEach(btn=>{
    btn.onclick = ()=> clearAllOfTable(btn.dataset.clearTable);
  });
  document.getElementById("dbLastSaved").textContent = LAST_SAVED_AT ? "Last saved: "+LAST_SAVED_AT.toLocaleString() : "Not saved yet this session.";
}
// Permanently removes every record from a clearable table — from the
// in-memory arrays, the local IndexedDB/localStorage blob, and (if
// connected) the synced cloud database — via the same persistEntityChange
// pipeline every individual delete already goes through. Teachers, Sections,
// and Schedule Assignments only clear the current admin's own records (see
// the multi-admin data isolation model); Rooms and Subjects are shared
// school-wide resources, so clearing those affects every admin.
async function clearAllOfTable(key){
  if(key==="subjects"){
    const count = SUBJECTS.length;
    if(count===0){ showToast("There are no Subjects to clear.", true); return; }
    openConfirm(`Permanently delete all ${count} Subject record${count===1?'':'s'} — across every School Year, Term, and Grade Level? This cannot be undone.`, async ()=>{
      const ids = SUBJECTS.map(s=>s.id);
      SUBJECTS.length = 0;
      subjectIdCounter = 1;
      await saveData();
      for(const id of ids) await persistEntityChange("subjects", {id}, "DELETE");
      generateSchedule();
      await saveData();
      initSubjectFilters();
      renderAll();
      showToast(`Cleared all ${count} Subject record${count===1?'':'s'}.`);
    }, "Clear All Subjects");
  } else if(key==="teachers"){
    const count = TEACHERS.length;
    if(count===0){ showToast("There are no Teachers to clear.", true); return; }
    openConfirm(`Permanently delete all ${count} Teacher record${count===1?'':'s'} <b>you created</b>? Their generated schedule assignments will be cleared. This cannot be undone.`, async ()=>{
      const ids = TEACHERS.map(t=>t.id);
      ids.forEach(id=>{
        const idx = TEACHERS_ALL.findIndex(x=>x.id===id);
        if(idx>-1) TEACHERS_ALL.splice(idx,1);
        Object.keys(SCHEDULE_ASSIGNMENTS).forEach(k=>{ if(SCHEDULE_ASSIGNMENTS[k]===id) delete SCHEDULE_ASSIGNMENTS[k]; });
      });
      refreshOwnedViews();
      selectedTeacher = null;
      await saveData();
      for(const id of ids) await persistEntityChange("teachers", {id}, "DELETE");
      renderAll();
      showToast(`Cleared all ${count} Teacher record${count===1?'':'s'}.`);
    }, "Clear All Teachers");
  } else if(key==="sections"){
    const count = SECTIONS.length;
    if(count===0){ showToast("There are no Sections to clear.", true); return; }
    openConfirm(`Permanently delete all ${count} Section record${count===1?'':'s'} <b>you created</b>? This removes them from the section list and daily timetable. This cannot be undone.`, async ()=>{
      const ids = SECTIONS.map(s=>s.id);
      ids.forEach(id=>{
        const idx = SECTIONS_ALL.findIndex(x=>x.id===id);
        if(idx>-1) SECTIONS_ALL.splice(idx,1);
      });
      refreshOwnedViews();
      await saveData();
      for(const id of ids) await persistEntityChange("sections", {id}, "DELETE");
      renderAll();
      showToast(`Cleared all ${count} Section record${count===1?'':'s'}.`);
    }, "Clear All Sections");
  } else if(key==="rooms"){
    const count = ROOMS.length;
    if(count===0){ showToast("There are no Rooms to clear.", true); return; }
    openConfirm(`Permanently delete all ${count} Room record${count===1?'':'s'}? Rooms are shared across every administrator — sections currently assigned to a deleted room will show as Unassigned. This cannot be undone.`, async ()=>{
      ROOMS.length = 0;
      roomCounter = 1;
      await saveData();
      renderAll();
      showToast(`Cleared all ${count} Room record${count===1?'':'s'}.`);
    }, "Clear All Rooms");
  } else if(key==="scheduleAssignments"){
    const mySectionIds = new Set(SECTIONS.map(s=>s.id));
    const keys = Object.keys(SCHEDULE_ASSIGNMENTS).filter(k=> mySectionIds.has(k.split("|")[0]));
    const count = keys.length;
    if(count===0){ showToast("There are no Schedule Assignments to clear.", true); return; }
    openConfirm(`Permanently clear all ${count} generated Schedule Assignment${count===1?'':'s'} for your own sections? You can Regenerate the schedule afterward. This cannot be undone.`, async ()=>{
      keys.forEach(k=> delete SCHEDULE_ASSIGNMENTS[k]);
      await saveData();
      renderAll();
      showToast(`Cleared all ${count} Schedule Assignment${count===1?'':'s'}.`);
    }, "Clear All Assignments");
  }
}
document.getElementById("dbExportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(snapshotData(), null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "edusched-database-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast("Database exported.");
});
document.getElementById("dbImportBtn").addEventListener("click", ()=> document.getElementById("dbImportFile").click());
document.getElementById("dbImportFile").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    openConfirm("Import this file and replace all current data? This cannot be undone.", async ()=>{
      try{
        const data = JSON.parse(reader.result);
        applySnapshot(data);
        await saveData();
        renderAll();
        showToast("Database imported successfully.");
      }catch(err){
        console.error("Import failed:", err);
        showToast("Could not import that file — it doesn't look like a valid ATLAS database export.", true);
      }
    }, "Import & Replace");
  };
  reader.readAsText(file);
  e.target.value = "";
});
document.getElementById("settingsGoDbBtn").addEventListener("click", ()=> navigateTo("database"));

/* =========================================================
   SYNC CENTER — cloud connection form, live status cards,
   pending-queue count, recent activity, and conflict resolution
   UI for the offline-first data layer defined earlier (Teachers,
   Sections, Subjects). See the big comment near CLOUD_CONFIG for
   why only these three entities are wired up so far.
   ========================================================= */
let CONFLICTS_CACHE = [];
async function renderSyncCenter(){
  if(!document.getElementById("page-database")) return;

  // Connection + cloud config form (only fill inputs on first render for
  // this session, so we don't clobber text the admin is mid-typing).
  const urlInput = document.getElementById("cloudUrlInput");
  const keyInput = document.getElementById("cloudKeyInput");
  if(urlInput && !urlInput.dataset.touched){
    urlInput.value = CLOUD_CONFIG.url || "";
    keyInput.value = CLOUD_CONFIG.anonKey || "";
    urlInput.addEventListener("input", ()=> urlInput.dataset.touched = "1");
    keyInput.addEventListener("input", ()=> urlInput.dataset.touched = "1");
  }
  const cfgStatus = document.getElementById("cloudCfgStatus");
  if(cfgStatus) cfgStatus.textContent = CLOUD_CONFIG.enabled ? "Connected to "+CLOUD_CONFIG.url : "Not connected — running offline-only.";
  const autoToggle = document.getElementById("autoSyncToggle");
  if(autoToggle) autoToggle.checked = AUTO_SYNC_ENABLED;

  const cards = document.getElementById("syncStatCards");
  if(cards && !cards.dataset.loadedOnce){
    cards.innerHTML = Array.from({length:4}).map(()=>`<div class="card stat"><div class="skeleton-row w-60"></div><div class="skeleton-row w-100" style="height:20px;"></div><div class="skeleton-row w-80"></div></div>`).join("");
  }

  const pendingCount = await idbGetAll("sync_queue").then(q=>q.length).catch(()=>0);
  CONFLICTS_CACHE = await idbGetAll("conflicts").catch(()=>[]);

  if(cards){
    cards.dataset.loadedOnce = "1";
    const stateLabel = { online:"Connected", offline: CLOUD_CONFIG.enabled?"Offline":"Not Configured", syncing:"Synchronizing…", error:"Sync Error" }[CONNECTION_STATE] || "Offline";
    cards.innerHTML = `
      <div class="card stat"><div class="label">Local Database</div><div class="value" style="font-size:20px;">🟢 Connected</div><div class="sub">IndexedDB — always available offline</div></div>
      <div class="card stat"><div class="label">Cloud Database</div><div class="value" style="font-size:20px;">${CLOUD_CONFIG.enabled ? (CONNECTION_STATE==="online"?"🟢 Connected":CONNECTION_STATE==="syncing"?"🟡 Connecting":"🔴 Unreachable") : "⚪ Not Configured"}</div><div class="sub">${CLOUD_CONFIG.enabled ? CLOUD_CONFIG.url : "Add a Firebase project below"}</div></div>
      <div class="card stat"><div class="label">Synchronization</div><div class="value" style="font-size:20px;">${stateLabel}</div><div class="sub">${LAST_SYNC_AT ? "Last sync: "+LAST_SYNC_AT.toLocaleString() : "Not synced yet"}</div></div>
      <div class="card stat"><div class="label">Pending Changes</div><div class="value">${pendingCount}</div><div class="sub">${CONFLICTS_CACHE.length ? CONFLICTS_CACHE.length+" unresolved conflict(s)" : "No conflicts"}</div>${pendingCount>0 ? `<button class="icon-btn danger" style="margin-top:8px;" title="Discard changes waiting to sync" id="clearPendingBtn">🧹 Clear Pending</button>` : ''}</div>
    `;
    const clearBtn = document.getElementById("clearPendingBtn");
    if(clearBtn) clearBtn.onclick = ()=> clearPendingSyncQueue(pendingCount);
  }

  const offlineNotice = document.getElementById("syncOfflineNotice");
  if(offlineNotice){
    if(!navigator.onLine){
      offlineNotice.style.display = "block";
      offlineNotice.innerHTML = `🔴 You are currently offline. Your changes are safely stored on this device.${pendingCount?` <b>${pendingCount}</b> change${pendingCount===1?'':'s'} waiting to synchronize.`:''}`;
    } else if(CONNECTION_STATE==="error"){
      offlineNotice.style.display = "block";
      offlineNotice.innerHTML = `⚠ Some changes could not be synchronized. They will be retried automatically. ${LAST_SYNC_ERROR||""}`;
    } else {
      offlineNotice.style.display = "none";
    }
  }

  const conflictsWrap = document.getElementById("syncConflictsWrap");
  const conflictsList = document.getElementById("syncConflictsList");
  if(conflictsWrap && conflictsList){
    if(CONFLICTS_CACHE.length){
      conflictsWrap.style.display = "block";
      conflictsList.innerHTML = CONFLICTS_CACHE.map(c=>{
        const localName = c.local_payload && (c.local_payload.name || c.local_payload.id);
        const serverName = c.server_payload && (c.server_payload.name || c.server_payload.id);
        return `<div class="panel" style="margin-bottom:10px;">
          <div class="panel-body">
            <div style="margin-bottom:8px;"><b>${esc(c.entity_type.slice(0,1).toUpperCase()+c.entity_type.slice(1,-1))} record conflict</b> — edited on this device while it also changed on the server.</div>
            <div class="field-row">
              <div class="field"><b>Local Version</b><div class="hint">Modified by ${esc(c.local_modified_by||'this device')}<br>${c.local_modified_at?new Date(c.local_modified_at).toLocaleString():''}</div><div>${esc(localName||'')}</div></div>
              <div class="field"><b>Server Version</b><div class="hint">Modified by ${esc(c.server_modified_by||'cloud')}<br>${c.server_modified_at?new Date(c.server_modified_at).toLocaleString():''}</div><div>${esc(serverName||'')}</div></div>
            </div>
            <div class="row-flex" style="gap:8px;margin-top:8px;">
              <button class="btn gold" data-resolve="${c.id}" data-choice="local">Choose Local</button>
              <button class="btn ghost" data-resolve="${c.id}" data-choice="server">Choose Server</button>
            </div>
          </div>
        </div>`;
      }).join("");
      conflictsList.querySelectorAll("[data-resolve]").forEach(b=>{
        b.onclick = ()=> resolveConflict(b.dataset.resolve, b.dataset.choice);
      });
    } else {
      conflictsWrap.style.display = "none";
    }
  }

  const activityList = document.getElementById("syncActivityList");
  if(activityList){
    activityList.innerHTML = SYNC_ACTIVITY.length ? SYNC_ACTIVITY.slice(0,15).map(a=>
      `<div style="padding:4px 0;">${a.ok?'✓':'✗'} ${esc(a.text)} <span class="hint">${a.at.toLocaleTimeString()}</span></div>`
    ).join("") : `<span class="hint">No sync activity yet.</span>`;
  }
}
document.getElementById("syncNowBtn").addEventListener("click", ()=>{
  if(!CLOUD_CONFIG.enabled){ showToast("Connect a cloud database first.", true); return; }
  if(!navigator.onLine){ showToast("You're offline — this will sync automatically once you're back online.", true); return; }
  attemptSync(true);
});
document.getElementById("autoSyncToggle").addEventListener("change", (e)=>{
  setAutoSyncFlag(e.target.checked);
});

/* =========================================================
   BULK SELECTION — shared helper for the Faculty Roster and
   Sections list views.
   ========================================================= */
const TEACHER_SELECTED = new Set();
const SECTION_SELECTED = new Set();
const SUBJECT_SELECTED = new Set();
function wireBulkBar({selectedSet, allIds, barId, countId, selectAllId, deleteBtnId, rowCheckSelector, onDelete}){
  const bar = document.getElementById(barId);
  const count = document.getElementById(countId);
  const selectAll = document.getElementById(selectAllId);
  const deleteBtn = document.getElementById(deleteBtnId);
  if(!bar || !selectAll || !deleteBtn) return;
  // Drop selections for ids no longer on screen (filtered out or deleted).
  [...selectedSet].forEach(id=>{ if(!allIds.includes(id)) selectedSet.delete(id); });
  function refreshBar(){
    const n = selectedSet.size;
    bar.style.display = n>0 ? "flex" : "none";
    if(count) count.textContent = n;
    selectAll.checked = allIds.length>0 && allIds.every(id=>selectedSet.has(id));
    selectAll.indeterminate = n>0 && !selectAll.checked;
  }
  document.querySelectorAll(rowCheckSelector).forEach(cb=>{
    cb.checked = selectedSet.has(cb.dataset.id);
    cb.addEventListener("click", e=> e.stopPropagation());
    cb.addEventListener("change", ()=>{
      if(cb.checked) selectedSet.add(cb.dataset.id); else selectedSet.delete(cb.dataset.id);
      refreshBar();
    });
  });
  selectAll.onchange = ()=>{
    if(selectAll.checked) allIds.forEach(id=>selectedSet.add(id));
    else allIds.forEach(id=>selectedSet.delete(id));
    document.querySelectorAll(rowCheckSelector).forEach(cb=>{ cb.checked = selectedSet.has(cb.dataset.id); });
    refreshBar();
  };
  deleteBtn.onclick = onDelete;
  refreshBar();
}
function bulkDeleteTeachers(){
  const ids = [...TEACHER_SELECTED];
  if(!ids.length) return;
  openConfirm(`Delete ${ids.length} selected teacher${ids.length===1?'':'s'} from the faculty roster? Their generated schedule assignments will be cleared.`, async ()=>{
    ids.forEach(id=>{
      const idx = TEACHERS_ALL.findIndex(x=>x.id===id);
      if(idx>-1) TEACHERS_ALL.splice(idx,1);
      if(selectedTeacher===id) selectedTeacher = null;
      Object.keys(SCHEDULE_ASSIGNMENTS).forEach(k=>{ if(SCHEDULE_ASSIGNMENTS[k]===id) delete SCHEDULE_ASSIGNMENTS[k]; });
    });
    refreshOwnedViews();
    TEACHER_SELECTED.clear();
    await saveData();
    for(const id of ids) await persistEntityChange("teachers", {id}, "DELETE");
    renderAll();
    showToast(ids.length+" teacher(s) deleted. Regenerate the schedule to reassign their vacated periods.");
  }, "Delete Selected");
}
function bulkDeleteSections(){
  const ids = [...SECTION_SELECTED];
  if(!ids.length) return;
  openConfirm(`Delete ${ids.length} selected section${ids.length===1?'':'s'}? This removes them from the section list and daily timetable.`, async ()=>{
    ids.forEach(id=>{
      const idx = SECTIONS_ALL.findIndex(x=>x.id===id);
      if(idx>-1) SECTIONS_ALL.splice(idx,1);
    });
    SECTION_SELECTED.clear();
    refreshOwnedViews();
    await saveData();
    for(const id of ids) await persistEntityChange("sections", {id}, "DELETE");
    renderAll();
    showToast(ids.length+" section(s) deleted.");
  }, "Delete Selected");
}
function bulkDeleteSubjects(){
  const ids = [...SUBJECT_SELECTED];
  if(!ids.length) return;
  openConfirm(`Delete ${ids.length} selected subject${ids.length===1?'':'s'}? This cannot be undone.`, async ()=>{
    ids.forEach(id=>{
      const idx = SUBJECTS.findIndex(x=>x.id===id);
      if(idx>-1) SUBJECTS.splice(idx,1);
    });
    SUBJECT_SELECTED.clear();
    await saveData();
    for(const id of ids) await persistEntityChange("subjects", {id}, "DELETE");
    renderAll();
    showToast(ids.length+" subject(s) deleted.");
  }, "Delete Selected");
}

let selectedTeacher = null;
/* =========================================================
   SPECIALIZATIONS & LEARNING AREAS MANAGEMENT
   A single Admin-managed master list (AREA_LIST/ARCHIVED_AREAS) serves as
   both the Specializations a teacher can be tagged with (Teachers page)
   and the Learning Area a subject can be explicitly assigned to (Subjects
   page) — a teacher qualifies for a subject when a tagged specialization
   matches the subject's Learning Area. See subjectLearningArea() and
   teacherCanTeach() above.
   ========================================================= */
function learningAreaUsage(name){
  const teacherCount = TEACHERS.filter(t=> (t.specializations||[]).includes(name)).length;
  const subjectCount = SUBJECTS.filter(s=> s.learningArea===name).length;
  return { teacherCount, subjectCount };
}
function renderLearningAreasPage(){
  const tbody = document.querySelector("#learningAreasTable tbody");
  if(!tbody) return;
  const all = AREA_LIST.concat(ARCHIVED_AREAS.filter(a=>!AREA_LIST.includes(a)));
  tbody.innerHTML = all.length ? all.map(name=>{
    const archived = ARCHIVED_AREAS.includes(name) && !AREA_LIST.includes(name);
    const { teacherCount, subjectCount } = learningAreaUsage(name);
    return `<tr>
      <td><b>${esc(name)}</b></td>
      <td>${teacherCount}</td>
      <td>${subjectCount}</td>
      <td><span class="tag ${archived?'grey':'green'}">${archived?'Archived':'Active'}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" title="Rename" data-la-edit="${esc(name)}">✏️ Rename</button>
        <button class="icon-btn" title="${archived?'Restore':'Archive'}" data-la-archive="${esc(name)}">${archived?'♻️ Restore':'🗄️ Archive'}</button>
        <button class="icon-btn danger" title="Permanently delete" data-la-delete="${esc(name)}">🗑️ Delete</button>
      </div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">No specializations or learning areas yet. Use "+ Add Specialization / Learning Area" to create one.</td></tr>`;
  tbody.querySelectorAll("[data-la-edit]").forEach(b=> b.onclick = ()=> openLearningAreaForm(b.dataset.laEdit));
  tbody.querySelectorAll("[data-la-archive]").forEach(b=> b.onclick = ()=> toggleLearningAreaArchive(b.dataset.laArchive));
  tbody.querySelectorAll("[data-la-delete]").forEach(b=> b.onclick = ()=> deleteLearningArea(b.dataset.laDelete));
}
function openLearningAreaForm(existingName){
  const isEdit = !!existingName;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="laBackdrop">
      <div class="modal-box narrow">
        <div class="modal-head"><h3>${isEdit?'Rename':'Add'} Specialization / Learning Area</h3><button class="modal-close" id="laClose">&times;</button></div>
        <div class="modal-body">
          <label class="field">Name
            <input type="text" id="laName" value="${isEdit?esc(existingName):''}" placeholder="e.g. Computer Science">
          </label>
          <div class="err-text" id="laErr"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="laCancel">Cancel</button>
          <button class="btn gold" id="laSave">${isEdit?'Save Changes':'Add'}</button>
        </div>
      </div>
    </div>`;
  document.getElementById("laClose").onclick = closeModal;
  document.getElementById("laCancel").onclick = closeModal;
  document.getElementById("laBackdrop").addEventListener("click", e=>{ if(e.target.id==="laBackdrop") closeModal(); });
  document.getElementById("laSave").onclick = ()=> withButtonLoading(document.getElementById("laSave"), async ()=>{
    const name = document.getElementById("laName").value.trim();
    if(!name){ document.getElementById("laErr").textContent = "Please enter a name."; return; }
    const dup = AREA_LIST.concat(ARCHIVED_AREAS).some(a=> a.toLowerCase()===name.toLowerCase() && a!==existingName);
    if(dup){ document.getElementById("laErr").textContent = "That name is already in use."; return; }
    if(isEdit){
      const idx = AREA_LIST.indexOf(existingName);
      if(idx>=0) AREA_LIST[idx] = name;
      const aidx = ARCHIVED_AREAS.indexOf(existingName);
      if(aidx>=0) ARCHIVED_AREAS[aidx] = name;
      // Propagate the rename everywhere it's referenced so nothing breaks.
      TEACHERS.forEach(t=>{ if(t.specializations) t.specializations = t.specializations.map(s=>s===existingName?name:s); });
      SUBJECTS.forEach(s=>{ if(s.learningArea===existingName) s.learningArea = name; });
    } else {
      AREA_LIST.push(name);
    }
    closeModal();
    await saveData();
    renderAll();
    showToast(isEdit ? "Renamed." : "Added.");
  });
}
function toggleLearningAreaArchive(name){
  const archived = ARCHIVED_AREAS.includes(name) && !AREA_LIST.includes(name);
  if(archived){
    ARCHIVED_AREAS = ARCHIVED_AREAS.filter(a=>a!==name);
    if(!AREA_LIST.includes(name)) AREA_LIST.push(name);
  } else {
    if(!ARCHIVED_AREAS.includes(name)) ARCHIVED_AREAS.push(name);
    AREA_LIST = AREA_LIST.filter(a=>a!==name);
  }
  saveData().then(()=>{ renderAll(); showToast(archived ? `${name} restored.` : `${name} archived — hidden from new assignments, existing ones still work.`); });
}
function deleteLearningArea(name){
  const { teacherCount, subjectCount } = learningAreaUsage(name);
  if(teacherCount>0 || subjectCount>0){ openLearningAreaDeleteConflictModal(name, teacherCount, subjectCount); return; }
  openConfirm(`Delete "${esc(name)}"? This cannot be undone.`, async ()=>{
    AREA_LIST = AREA_LIST.filter(a=>a!==name);
    ARCHIVED_AREAS = ARCHIVED_AREAS.filter(a=>a!==name);
    await saveData();
    renderAll();
    showToast(`${name} deleted.`);
  }, "Delete");
}
// Delete is blocked by default when a Specialization/Learning Area is still
// referenced by a Teacher or Subject — the Admin must explicitly choose to
// Cancel, Archive Instead (non-destructive, reversible), or Delete (with an
// optional Reassign-to target so affected records aren't just orphaned).
function openLearningAreaDeleteConflictModal(name, teacherCount, subjectCount){
  const others = AREA_LIST.filter(a=>a!==name);
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="laDelBackdrop">
      <div class="modal-box narrow">
        <div class="modal-head"><h3>"${esc(name)}" is in use</h3><button class="modal-close" id="laDelClose">&times;</button></div>
        <div class="modal-body">
          <div class="err-text" style="color:var(--ink-soft);font-weight:500;">${teacherCount} teacher${teacherCount===1?'':'s'} and ${subjectCount} subject${subjectCount===1?'':'s'} currently use "${esc(name)}". Deleting it removes it from all of them.</div>
          <label class="field" style="margin-top:10px;">Reassign affected records to another Learning Area first (optional)
            <select id="laReassignTo">
              <option value="">— Just remove, don't reassign —</option>
              ${others.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="laDelCancel">Cancel</button>
          <button class="btn ghost" id="laDelArchive">Archive Instead</button>
          <button class="btn danger" id="laDelGo">Delete</button>
        </div>
      </div>
    </div>`;
  document.getElementById("laDelClose").onclick = closeModal;
  document.getElementById("laDelCancel").onclick = closeModal;
  document.getElementById("laDelBackdrop").addEventListener("click", e=>{ if(e.target.id==="laDelBackdrop") closeModal(); });
  document.getElementById("laDelArchive").onclick = ()=>{ closeModal(); toggleLearningAreaArchive(name); };
  document.getElementById("laDelGo").onclick = ()=> withButtonLoading(document.getElementById("laDelGo"), async ()=>{
    const reassignTo = document.getElementById("laReassignTo").value;
    TEACHERS.forEach(t=>{
      if(!t.specializations || !t.specializations.includes(name)) return;
      t.specializations = t.specializations.filter(s=>s!==name);
      if(reassignTo && !t.specializations.includes(reassignTo)) t.specializations.push(reassignTo);
    });
    SUBJECTS.forEach(s=>{ if(s.learningArea===name) s.learningArea = reassignTo || undefined; });
    AREA_LIST = AREA_LIST.filter(a=>a!==name);
    ARCHIVED_AREAS = ARCHIVED_AREAS.filter(a=>a!==name);
    closeModal();
    await saveData();
    renderAll();
    showToast(`${name} deleted${reassignTo ? ` and reassigned to ${reassignTo}` : ''}.`);
  });
}
document.getElementById("addLearningAreaBtn").addEventListener("click", ()=> openLearningAreaForm(null));

function renderTeachers(){
  const search = document.getElementById("teacherSearch").value.toLowerCase();
  const level = document.getElementById("teacherLevelFilter").value;
  const assignments = buildAllAssignments();

  const list = TEACHERS.filter(t=>{
    const matchesSearch = t.name.toLowerCase().includes(search);
    const matchesLevel = level==="all" || t.tiers.includes(level);
    return matchesSearch && matchesLevel;
  });
  document.getElementById("teacherCount").textContent = list.length + " of " + TEACHERS.length + " faculty shown";

  document.getElementById("teacherList").innerHTML = list.map(t=>{
    const load = assignments[t.id]||[];
    const hrs = load.reduce((a,b)=>a+b.hoursPerWeek,0);
    const specs = (t.specializations||[]).concat((t.subjectsCanTeach||[]).length?[`+${(t.subjectsCanTeach||[]).length} subject${(t.subjectsCanTeach||[]).length===1?'':'s'}`]:[]);
    return `<div class="teacher-card ${selectedTeacher===t.id?'active':''}" data-id="${t.id}">
      <input type="checkbox" class="card-check" data-id="${t.id}">
      <div class="name">${t.name}</div>
      <div class="role">${t.role}</div>
      ${specs.length?`<div class="hint" style="margin-top:3px;">${specs.join(" · ")}</div>`:""}
      <div class="load">
        <span class="tag ${t.status==='Full-time'?'green':'grey'}">${t.status}</span>
        <span class="tag blue">${hrs.toFixed(1)} hrs/wk</span>
        <span class="tag gold">${load.length}/${GRADE_ORDER.reduce((s,g)=>s+teacherGradeCap(t,g),0)} loads</span>
        ${syncBadgeHtml("teachers", t.id)}
      </div>
      <div class="row-actions" style="margin-top:8px;">
        <button class="icon-btn" title="View full teaching load" data-t-view="${t.id}">👁️ View</button>
        <button class="icon-btn" title="Edit this teacher" data-t-edit="${t.id}">✏️ Edit</button>
        <button class="icon-btn danger" title="Permanently delete" data-t-delete="${t.id}">🗑️ Delete</button>
      </div>
    </div>`;
  }).join("") || `<div class="empty">No teachers match your filters.</div>`;

  document.querySelectorAll(".teacher-card").forEach(card=>{
    card.addEventListener("click", ()=>{ selectedTeacher = card.dataset.id; renderTeachers(); renderTeacherDetail(); });
  });
  document.querySelectorAll("[data-t-view]").forEach(b=>{
    b.addEventListener("click", e=>{ e.stopPropagation(); selectedTeacher = b.dataset.tView; renderTeachers(); renderTeacherDetail(); const box=document.getElementById("teacherDetail"); if(box) box.scrollIntoView({behavior:"smooth", block:"nearest"}); });
  });
  document.querySelectorAll("[data-t-edit]").forEach(b=>{
    b.addEventListener("click", e=>{ e.stopPropagation(); openTeacherForm(b.dataset.tEdit); });
  });
  document.querySelectorAll("[data-t-delete]").forEach(b=>{
    b.addEventListener("click", e=>{ e.stopPropagation(); deleteTeacher(b.dataset.tDelete); });
  });
  wireBulkBar({
    selectedSet: TEACHER_SELECTED,
    allIds: list.map(t=>t.id),
    barId: "teacherBulkBar", countId: "teacherSelCount", selectAllId: "teacherSelectAll",
    deleteBtnId: "teacherBulkDeleteBtn", rowCheckSelector: ".card-check",
    onDelete: bulkDeleteTeachers
  });
  renderTeacherDetail();
}
function renderTeacherDetail(){
  const box = document.getElementById("teacherDetail");
  const actions = document.getElementById("teacherDetailActions");
  if(!selectedTeacher){
    box.innerHTML = `<div class="empty">Select a teacher from the roster to view their full teaching load.</div>`;
    if(actions) actions.innerHTML = "";
    return;
  }
  const t = teacherById(selectedTeacher);
  if(actions){
    actions.innerHTML = `<button class="icon-btn" title="Edit this teacher" id="editTeacherBtn">✏️ Edit</button><button class="icon-btn danger" title="Permanently delete" id="deleteTeacherBtn">🗑️ Delete</button>`;
    document.getElementById("editTeacherBtn").onclick = ()=>openTeacherForm(selectedTeacher);
    document.getElementById("deleteTeacherBtn").onclick = ()=>deleteTeacher(selectedTeacher);
  }
  const assignments = buildAllAssignments()[selectedTeacher] || [];
  const totalHrs = assignments.reduce((a,b)=>a+b.hoursPerWeek,0);
  const specTags = (t.specializations||[]).map(a=>`<span class="tag blue">${a}</span>`).join(" ");
  const subjTags = (t.subjectsCanTeach||[]).map(a=>`<span class="tag maroon">${a}</span>`).join(" ");

  // Grade-Level Teaching Assignment table — item 7's "Grade Level | Teaching
  // Load | Assigned Subjects/Sections" layout, one row per grade (assigned
  // or not), computed from this teacher's ACTUAL generated/manual schedule
  // (buildAllAssignments), never just the Admin-set cap.
  const usedByGrade = {}; // grade -> [{sectionLabel, subject}]
  assignments.forEach(a=>{ (usedByGrade[a.grade] = usedByGrade[a.grade]||[]).push(a); });
  const totalCap = GRADE_ORDER.reduce((sum,g)=> sum + teacherGradeCap(t,g), 0);
  const totalUsed = GRADE_ORDER.reduce((sum,g)=> sum + (usedByGrade[g]?usedByGrade[g].length:0), 0);
  const gradeRows = GRADE_ORDER.map(g=>{
    const cap = teacherGradeCap(t, g);
    const used = usedByGrade[g] || [];
    if(cap<=0) return `<tr><td>${g}</td><td colspan="2" class="hint">Not Assigned</td></tr>`;
    const subjLabel = used.length
      ? used.map(a=>`${a.subject} – ${a.sectionLabel.replace(g+" - ","")}`).join(", ")
      : `<span class="hint">No classes scheduled yet</span>`;
    const overCap = used.length > cap;
    return `<tr>
      <td><b>${g}</b></td>
      <td>${used.length}/${cap}${overCap?' <span class="tag maroon">Over Limit</span>':''}</td>
      <td>${subjLabel}</td>
    </tr>`;
  }).join("");

  // Regular vs Special Program breakdown, per Grade Level — actual
  // scheduled classes/subjects/hours split by each section's Section Type.
  const progBreakdown = teacherProgramBreakdown(selectedTeacher);
  const progGrades = GRADE_ORDER.filter(g=> progBreakdown[g] && (progBreakdown[g]["Regular"].sections.size || progBreakdown[g]["Special Program"].sections.size));
  const progRows = progGrades.map(g=>{
    const reg = progBreakdown[g]["Regular"], spec = progBreakdown[g]["Special Program"];
    return `<tr>
      <td><b>${g}</b></td>
      <td>${reg.sections.size} class${reg.sections.size===1?'':'es'} &middot; ${reg.subjects.size} subject${reg.subjects.size===1?'':'s'} &middot; ${reg.hours.toFixed(1)} hrs/wk</td>
      <td>${spec.sections.size} class${spec.sections.size===1?'':'es'} &middot; ${spec.subjects.size} subject${spec.subjects.size===1?'':'s'} &middot; ${spec.hours.toFixed(1)} hrs/wk</td>
    </tr>`;
  }).join("");

  // Admin-set Teaching Load Allocation, per assigned Grade Level — the raw
  // caps entered on the Teacher form (Regular Class Loads / Special Program
  // Loads / Total), as opposed to gradeRows above which shows how much of
  // that allocation is actually used by the current schedule.
  const allocGrades = GRADE_ORDER.filter(g=> teacherGradeCap(t, g) > 0);
  const allocRows = allocGrades.map(g=>{
    const reg = teacherGradeCap(t, g, "regular"), spec = teacherGradeCap(t, g, "special");
    const spSubject = spec>0 ? (teacherSpecialProgramSubject(t, g) || `<span class="hint">Not selected</span>`) : `<span class="hint">—</span>`;
    return `<tr><td><b>${g}</b></td><td>${reg}</td><td>${spec}</td><td>${spSubject}</td><td><b>${reg+spec}</b></td></tr>`;
  }).join("");

  box.innerHTML = `
    <h4 style="font-size:16px;">${t.name}</h4>
    <div class="hint" style="margin:4px 0 12px;">
      ${t.role}${t.employeeId?' &middot; ID: '+esc(t.employeeId):''} &middot; <span class="tag ${t.status==='Full-time'?'green':'grey'}">${t.status}</span>
    </div>
    ${(specTags||subjTags) ? `<div style="margin-bottom:12px; display:flex; gap:6px; flex-wrap:wrap;">${specTags}${subjTags}</div>` : ""}

    <div style="font-size:12px;color:var(--ink-soft);font-weight:700;margin:12px 0 6px;">Teaching Load Allocation (Admin-set)</div>
    ${allocRows ? `<table><thead><tr><th>Grade Level</th><th>Regular Class Loads</th><th>Special Program Loads</th><th>Special Program Subject</th><th>Total Loads</th></tr></thead>
    <tbody>${allocRows}</tbody></table>` : `<div class="hint">Not assigned to any grade level yet.</div>`}

    <div style="font-size:12px;color:var(--ink-soft);font-weight:700;margin:16px 0 6px;">Grade-Level Teaching Assignment</div>
    <table><thead><tr><th>Grade Level</th><th>Teaching Load (Used/Max)</th><th>Assigned Subjects/Sections</th></tr></thead>
    <tbody>${gradeRows}</tbody>
    <tfoot><tr><td><b>Total</b></td><td colspan="2"><b>${totalUsed}/${totalCap} teaching loads</b></td></tr></tfoot></table>

    <div style="font-size:12px;color:var(--ink-soft);font-weight:700;margin:16px 0 6px;">Teaching Load by Program</div>
    ${progGrades.length ? `<table><thead><tr><th>Grade Level</th><th>Regular Program</th><th>Special Program</th></tr></thead>
    <tbody>${progRows}</tbody></table>` : `<div class="hint">No classes scheduled yet — this breaks down once the schedule is generated.</div>`}

    <div style="font-size:12px;color:var(--ink-soft);font-weight:700;margin:16px 0 6px;">Teaching Load Summary</div>
    <table><thead><tr><th>Grade Level</th><th>Subject</th><th>Section</th><th>Periods/Wk</th><th>Hours/Wk</th></tr></thead>
    <tbody>${assignments.length ? assignments.map(a=>`
      <tr><td>${a.grade}</td><td>${a.subject}</td><td>${a.sectionLabel.replace(a.grade+" - ","")}</td><td>${a.periodsPerWeek}</td><td>${a.hoursPerWeek}</td></tr>
    `).join("") : `<tr><td colspan="5" class="empty">No teaching load assigned.</td></tr>`}</tbody></table>
    <div style="text-align:right; margin-top:10px; font-weight:700; color:var(--navy-deep);">
      Total Teaching Load: ${totalUsed}/${totalCap} &middot; ${totalHrs.toFixed(1)} hrs/week
      ${t.maxTeachingHours!=null ? ` &middot; Max Teaching Hours/Load: ${t.maxTeachingHours}` : ''}
    </div>
  `;
}

/* =========================================================
   6B. SCHOOL YEARS — Super Admin CRUD
   ========================================================= */
function renderSchoolYears(){
  const tbody = document.querySelector("#schoolYearsTable tbody");
  if(!tbody) return;
  tbody.innerHTML = SCHOOL_YEARS.map(y=>{
    const statusTag = y.status==="active" ? '<span class="tag green">Active</span>'
      : y.status==="archived" ? '<span class="tag grey">Archived</span>'
      : '<span class="tag blue">Upcoming</span>';
    const selected = y.id===CURRENT_SCHOOL_YEAR_ID;
    return `<tr>
      <td><b>${esc(y.label)}</b></td>
      <td>${statusTag}</td>
      <td>${selected ? '<span class="tag gold">Selected</span>' : ''}</td>
      <td class="row-actions">
        ${!selected ? `<button class="icon-btn" title="Work in this School Year" data-sy-select="${y.id}">🎯 Select</button>` : ''}
        ${y.status!=="active" ? `<button class="icon-btn" title="Make this the Active School Year" data-sy-activate="${y.id}">✅ Set Active</button>` : ''}
        <button class="icon-btn" title="View / Edit details" data-sy-edit="${y.id}">✏️ Edit</button>
        ${y.status!=="archived" ? `<button class="icon-btn" title="Archive this School Year" data-sy-archive="${y.id}">🗄️ Archive</button>` : `<button class="icon-btn" title="Restore from archive" data-sy-unarchive="${y.id}">↩️ Unarchive</button>`}
        <button class="icon-btn danger" title="Permanently delete" data-sy-delete="${y.id}">🗑️ Delete</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" class="empty">No School Years yet.</td></tr>`;

  tbody.querySelectorAll("[data-sy-select]").forEach(b=>b.onclick = async ()=>{
    CURRENT_SCHOOL_YEAR_ID = b.dataset.sySelect;
    await saveData();
    renderAll();
    showToast(`Now working in School Year ${schoolYearById(CURRENT_SCHOOL_YEAR_ID).label}.`);
  });
  tbody.querySelectorAll("[data-sy-activate]").forEach(b=>b.onclick = ()=>{
    const y = schoolYearById(b.dataset.syActivate);
    openConfirm(`Set <b>${esc(y.label)}</b> as the Active School Year? The previously active School Year will be marked Upcoming.`, async ()=>{
      SCHOOL_YEARS.forEach(sy=>{ if(sy.status==="active") sy.status="upcoming"; });
      y.status = "active";
      await saveData();
      renderAll();
      showToast(`${y.label} is now the Active School Year.`);
    }, "Set Active");
  });
  tbody.querySelectorAll("[data-sy-archive]").forEach(b=>b.onclick = ()=>{
    const y = schoolYearById(b.dataset.syArchive);
    if(y.status==="active"){ showToast("Set a different School Year as Active before archiving this one.", true); return; }
    openConfirm(`Archive <b>${esc(y.label)}</b>? It stays selectable, but is marked as an old School Year.`, async ()=>{
      y.status = "archived";
      await saveData();
      renderAll();
      showToast(`${y.label} archived.`);
    }, "Archive");
  });
  tbody.querySelectorAll("[data-sy-unarchive]").forEach(b=>b.onclick = async ()=>{
    const y = schoolYearById(b.dataset.syUnarchive);
    y.status = "upcoming";
    await saveData();
    renderAll();
    showToast(`${y.label} unarchived.`);
  });
  tbody.querySelectorAll("[data-sy-edit]").forEach(b=>b.onclick = ()=> openSchoolYearForm(b.dataset.syEdit));
  tbody.querySelectorAll("[data-sy-delete]").forEach(b=>b.onclick = ()=> deleteSchoolYear(b.dataset.syDelete));
}
// Deletes a School Year record. Blocked while it's the Active School Year
// (an Active one must always exist — set another Active first) or while
// it's the last remaining School Year. Any Subjects generated under this
// School Year are deleted along with it, and if it was the currently
// selected working School Year, the selection falls back to whichever
// School Year is Active.
function deleteSchoolYear(id){
  const y = schoolYearById(id);
  if(!y) return;
  if(y.status==="active"){ showToast("Set a different School Year as Active before deleting this one.", true); return; }
  if(SCHOOL_YEARS.length<=1){ showToast("At least one School Year must remain.", true); return; }
  const subjCount = SUBJECTS.filter(s=>s.schoolYearId===id).length;
  const warning = subjCount>0 ? ` This also permanently deletes <b>${subjCount}</b> subject record(s) tied to this School Year.` : "";
  openConfirm(`Delete <b>${esc(y.label)}</b>? This cannot be undone.${warning}`, async ()=>{
    const idx = SCHOOL_YEARS.findIndex(x=>x.id===id);
    if(idx>-1) SCHOOL_YEARS.splice(idx,1);
    const deletedSubjectIds = [];
    for(let i=SUBJECTS.length-1;i>=0;i--){ if(SUBJECTS[i].schoolYearId===id){ deletedSubjectIds.push(SUBJECTS[i].id); SUBJECTS.splice(i,1); } }
    if(CURRENT_SCHOOL_YEAR_ID===id) CURRENT_SCHOOL_YEAR_ID = activeSchoolYear().id;
    await saveData();
    for(const sid of deletedSubjectIds) await persistEntityChange("subjects", {id:sid}, "DELETE");
    renderAll();
    showToast("School Year deleted.");
  }, "Delete");
}
function openSchoolYearForm(existingId){
  const existing = existingId ? schoolYearById(existingId) : null;
  const isEdit = !!existing;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="syBackdrop">
      <div class="modal-box narrow">
        <div class="modal-head"><h3>${isEdit?'Edit School Year':'Add School Year'}</h3><button class="modal-close" id="syClose">&times;</button></div>
        <div class="modal-body">
          <label class="field">School Year Label
            <input type="text" id="syLabel" value="${isEdit?esc(existing.label):''}" placeholder="e.g. 2028–2029">
          </label>
          <div class="err-text" id="syErr"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="syCancel">Cancel</button>
          <button class="btn gold" id="sySave">${isEdit?'Save Changes':'Add School Year'}</button>
        </div>
      </div>
    </div>`;
  document.getElementById("syClose").onclick = closeModal;
  document.getElementById("syCancel").onclick = closeModal;
  document.getElementById("syBackdrop").addEventListener("click", e=>{ if(e.target.id==="syBackdrop") closeModal(); });
  document.getElementById("sySave").onclick = ()=> withButtonLoading(document.getElementById("sySave"), async ()=>{
    const label = document.getElementById("syLabel").value.trim();
    if(!label){ document.getElementById("syErr").textContent = "Please enter a School Year label."; return; }
    const dup = SCHOOL_YEARS.some(y=> y.label.toLowerCase()===label.toLowerCase() && (!isEdit || y.id!==existing.id));
    if(dup){ document.getElementById("syErr").textContent = "That School Year already exists."; return; }
    if(isEdit){ existing.label = label; }
    else{ SCHOOL_YEARS.push({ id:"SY"+(schoolYearCounter++), label, status:"upcoming" }); }
    await saveData();
    closeModal();
    renderAll();
    showToast(isEdit ? "School Year updated." : "School Year added.");
  });
}
document.getElementById("addSchoolYearBtn").addEventListener("click", ()=> openSchoolYearForm());

/* =========================================================
   6C. TERMS — Super Admin CRUD
   ========================================================= */
function renderTerms(){
  const tbody = document.querySelector("#termsTable tbody");
  if(!tbody) return;
  tbody.innerHTML = TERMS.map(t=>{
    const selected = t.id===CURRENT_TERM_ID;
    return `<tr>
      <td><b>${esc(t.name)}</b></td>
      <td>${selected ? '<span class="tag gold">Selected</span>' : ''}</td>
      <td class="row-actions">
        ${!selected ? `<button class="icon-btn" title="Work in this Term" data-term-select="${t.id}">🎯 Select</button>` : ''}
        <button class="icon-btn" title="Rename this Term" data-term-edit="${t.id}">✏️ Rename</button>
        <button class="icon-btn danger" title="Permanently delete" data-term-del="${t.id}">🗑️ Delete</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="3" class="empty">No Terms yet.</td></tr>`;
  tbody.querySelectorAll("[data-term-select]").forEach(b=>b.onclick = async ()=>{
    const t = termById(b.dataset.termSelect);
    CURRENT_TERM_ID = t.id;
    CURRENT_TERM = t.name;
    await saveData();
    renderAll();
    showToast(`Now working in ${t.name} — this is the Term used as the reference for generating and viewing Subjects.`);
  });
  tbody.querySelectorAll("[data-term-edit]").forEach(b=>b.onclick = ()=> openTermForm(b.dataset.termEdit));
  tbody.querySelectorAll("[data-term-del]").forEach(b=>b.onclick = ()=>{
    const t = termById(b.dataset.termDel);
    if(TERMS.length<=1){ showToast("At least one Term must remain.", true); return; }
    const inUse = SUBJECTS.some(s=>s.termId===t.id);
    openConfirm(`Delete <b>${esc(t.name)}</b>?${inUse?' Subjects already generated for this Term keep their records but will no longer appear under an active Term selector.':''}`, async ()=>{
      const idx = TERMS.findIndex(x=>x.id===t.id);
      if(idx>-1) TERMS.splice(idx,1);
      syncTermOptions();
      if(CURRENT_TERM_ID===t.id){ CURRENT_TERM_ID = TERMS[0].id; CURRENT_TERM = TERMS[0].name; }
      await saveData();
      renderAll();
      showToast("Term deleted.");
    }, "Delete");
  });
}
function openTermForm(existingId){
  const existing = existingId ? termById(existingId) : null;
  const isEdit = !!existing;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="termFormBackdrop">
      <div class="modal-box narrow">
        <div class="modal-head"><h3>${isEdit?'Rename Term':'Add Term'}</h3><button class="modal-close" id="termFormClose">&times;</button></div>
        <div class="modal-body">
          <label class="field">Term Name
            <input type="text" id="termName" value="${isEdit?esc(existing.name):''}" placeholder="e.g. Summer Term">
          </label>
          <div class="err-text" id="termFormErr"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="termFormCancel">Cancel</button>
          <button class="btn gold" id="termFormSave">${isEdit?'Save Changes':'Add Term'}</button>
        </div>
      </div>
    </div>`;
  document.getElementById("termFormClose").onclick = closeModal;
  document.getElementById("termFormCancel").onclick = closeModal;
  document.getElementById("termFormBackdrop").addEventListener("click", e=>{ if(e.target.id==="termFormBackdrop") closeModal(); });
  document.getElementById("termFormSave").onclick = ()=> withButtonLoading(document.getElementById("termFormSave"), async ()=>{
    const name = document.getElementById("termName").value.trim();
    if(!name){ document.getElementById("termFormErr").textContent = "Please enter a term name."; return; }
    const dup = TERMS.some(t=> t.name.toLowerCase()===name.toLowerCase() && (!isEdit || t.id!==existing.id));
    if(dup){ document.getElementById("termFormErr").textContent = "That term already exists."; return; }
    if(isEdit){ existing.name = name; if(existing.id===CURRENT_TERM_ID) CURRENT_TERM = name; }
    else{ TERMS.push({ id:"TM"+(termIdCounter++), name }); }
    syncTermOptions();
    await saveData();
    closeModal();
    renderAll();
    showToast(isEdit ? "Term updated." : "Term added.");
  });
}
document.getElementById("addTermBtn").addEventListener("click", ()=> openTermForm());

/* =========================================================
   6D. SUBJECTS — filters, table, Generate, Add/Edit (Super Admin only)
   ========================================================= */
let SUBJ_FILTER = null; // {sy, term, grade, strand, type}
function initSubjectFilters(){
  const sySel = document.getElementById("subjFilterSY");
  const termSel = document.getElementById("subjFilterTerm");
  const gradeSel = document.getElementById("subjFilterGrade");
  if(!sySel) return;
  sySel.innerHTML = SCHOOL_YEARS.map(y=>`<option value="${y.id}" ${y.id===CURRENT_SCHOOL_YEAR_ID?'selected':''}>${esc(y.label)}${y.status==='active'?' (Active)':''}</option>`).join("");
  termSel.innerHTML = TERMS.map(t=>`<option value="${t.id}" ${t.id===CURRENT_TERM_ID?'selected':''}>${esc(t.name)}</option>`).join("");
  gradeSel.innerHTML = GRADE_ORDER.map(g=>`<option value="${g}">${g}</option>`).join("");
  gradeSel.value = GRADE_ORDER[0];
  syncSubjectStrandFilter();
  [sySel, termSel, gradeSel].forEach(el=> el.addEventListener("change", ()=>{ syncSubjectStrandFilter(); renderSubjects(); }));
  document.getElementById("subjFilterStrand").addEventListener("change", renderSubjects);
  document.getElementById("subjFilterType").addEventListener("change", renderSubjects);
}
function syncSubjectStrandFilter(){
  const grade = document.getElementById("subjFilterGrade").value;
  const strandSel = document.getElementById("subjFilterStrand");
  const isShs = tierOf(grade)==="SHS";
  strandSel.innerHTML = `<option value="">All</option>` + (isShs ? TRACK_LIST.map(s=>`<option value="${s}">${s}</option>`).join("") : "");
  strandSel.disabled = !isShs;
}
function currentSubjectFilter(){
  return {
    sy: document.getElementById("subjFilterSY").value,
    term: document.getElementById("subjFilterTerm").value,
    grade: document.getElementById("subjFilterGrade").value,
    strand: document.getElementById("subjFilterStrand").value,
    type: document.getElementById("subjFilterType").value
  };
}
// "Subjects by grade" tab strip at the top of the Subjects page — a quick,
// live count of generated subjects per grade for the selected School Year +
// Term, so the grade breakdown that used to live on the Curriculum page is
// still visible at a glance. Clicking a grade jumps the page's Grade Level
// filter straight to it.
function renderSubjectGradeSummary(f){
  const wrap = document.getElementById("subjectGradeSummary");
  if(!wrap) return;
  wrap.innerHTML = GRADE_ORDER.map(g=>{
    const count = SUBJECTS.filter(s=> s.schoolYearId===f.sy && s.termId===f.term && s.grade===g).length;
    return `<button type="button" class="grade-tab ${f.grade===g?'active':''}" data-grade="${g}">${g}<span class="count">(${count})</span></button>`;
  }).join("");
  wrap.querySelectorAll(".grade-tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const gradeSel = document.getElementById("subjFilterGrade");
      if(!gradeSel || gradeSel.value===btn.dataset.grade) return;
      gradeSel.value = btn.dataset.grade;
      syncSubjectStrandFilter();
      renderSubjects();
    });
  });
}
function renderSubjects(){
  const table = document.getElementById("subjectsTable");
  if(!table) return;
  const f = currentSubjectFilter();
  renderSubjectGradeSummary(f);
  const rows = SUBJECTS.filter(s=>
    s.schoolYearId===f.sy && s.termId===f.term && s.grade===f.grade &&
    (!f.strand || s.strand===f.strand) &&
    (!f.type || s.type===f.type)
  );
  const tbody = table.querySelector("tbody");
  const syLabel = schoolYearById(f.sy) ? schoolYearById(f.sy).label : "";
  const termName = termById(f.term) ? termById(f.term).name : "";
  const summarySY = document.getElementById("subjSummarySY");
  const summaryTerm = document.getElementById("subjSummaryTerm");
  if(summarySY) summarySY.textContent = syLabel || "—";
  if(summaryTerm) summaryTerm.textContent = termName || "—";
  tbody.innerHTML = rows.length ? rows.map(s=>`
    <tr>
      <td class="check-cell"><input type="checkbox" class="row-check" data-id="${s.id}"></td>
      <td><b>${esc(s.code)}</b></td>
      <td>${esc(s.name)}${s.program==='Special Program'?' <span class="tag maroon">Special Program</span>':''}${syncBadgeHtml("subjects", s.id)}</td>
      <td>${s.grade}</td>
      <td>${s.strand ? esc(s.strand) : '<span class="hint">—</span>'}</td>
      <td>${esc(termName)}</td>
      <td>${esc(syLabel)}</td>
      <td>${s.units}</td>
      <td>${s.hoursPerWeek}</td>
      <td>${scheduleDaysLabel(subjectScheduleDays(s))}</td>
      <td><span class="tag ${s.status==='Active'?'green':'grey'}">${s.status}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" title="View full details" data-subj-view="${s.id}">👁️ View</button>
        <button class="icon-btn" title="Edit this subject" data-subj-edit="${s.id}">✏️ Edit</button>
        <button class="icon-btn danger" title="Permanently delete" data-subj-delete="${s.id}">🗑️ Delete</button>
      </div></td>
    </tr>`).join("") : `<tr><td colspan="12" class="empty">No subjects yet for ${esc(f.grade)} – ${esc(termName)} – S.Y. ${esc(syLabel)}. Click <b>+ Add Subject</b> to get started.</td></tr>`;
  tbody.querySelectorAll("[data-subj-view]").forEach(b=> b.onclick = ()=> openSubjectViewModal(b.dataset.subjView));
  tbody.querySelectorAll("[data-subj-edit]").forEach(b=> b.onclick = ()=> openSubjectForm(b.dataset.subjEdit));
  tbody.querySelectorAll("[data-subj-delete]").forEach(b=> b.onclick = ()=> deleteSubject(b.dataset.subjDelete));
  wireBulkBar({
    selectedSet: SUBJECT_SELECTED,
    allIds: rows.map(s=>s.id),
    barId: "subjectBulkBar", countId: "subjectSelCount", selectAllId: "subjectSelectAll",
    deleteBtnId: "subjectBulkDeleteBtn", rowCheckSelector: "#subjectsTable tbody .row-check",
    onDelete: bulkDeleteSubjects
  });
}
// Read-only "View" modal for a Subject — the "Manage Details" style view
// requested alongside Edit/Delete on every table, without duplicating the
// editable form.
function openSubjectViewModal(id){
  const s = SUBJECTS.find(x=>x.id===id);
  if(!s) return;
  const sy = schoolYearById(s.schoolYearId);
  const term = termById(s.termId);
  const row = (label, value) => `<div class="field-row" style="margin-bottom:8px;"><div style="flex:1;font-size:12px;color:var(--ink-soft);font-weight:700;">${label}</div><div style="flex:2;font-size:13.5px;">${value}</div></div>`;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="subjViewBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>Subject Details</h3><button class="modal-close" id="subjViewClose">&times;</button></div>
        <div class="modal-body">
          ${row("Subject Name", `<b>${esc(s.name)}</b>`)}
          ${row("Subject Code", esc(s.code))}
          ${row("Grade Level", esc(s.grade))}
          ${row("Track/Strand", s.strand ? esc(s.strand) : '<span class="hint">—</span>')}
          ${row("Term", esc(term?term.name:"—"))}
          ${row("School Year", esc(sy?sy.label:"—"))}
          ${row("Type", esc(s.type))}
          ${row("Program", `<span class="tag ${s.program==='Special Program'?'maroon':'gold'}">${esc(s.program||'Regular')}</span>`)}
          ${row("Units", s.units)}
          ${row("Hours/Week", s.hoursPerWeek)}
          ${row("Schedule Days", scheduleDaysLabel(subjectScheduleDays(s)))}
          ${row("Status", `<span class="tag ${s.status==='Active'?'green':'grey'}">${esc(s.status)}</span>`)}
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="subjViewCloseBtn">Close</button>
          <button class="btn gold" id="subjViewEditBtn">✏️ Edit</button>
        </div>
      </div>
    </div>`;
  document.getElementById("subjViewClose").onclick = closeModal;
  document.getElementById("subjViewCloseBtn").onclick = closeModal;
  document.getElementById("subjViewBackdrop").addEventListener("click", e=>{ if(e.target.id==="subjViewBackdrop") closeModal(); });
  document.getElementById("subjViewEditBtn").onclick = ()=>{ closeModal(); openSubjectForm(id); };
}
function deleteSubject(id){
  const s = SUBJECTS.find(x=>x.id===id);
  if(!s) return;
  openConfirm(`Delete <b>${esc(s.name)}</b> (${esc(s.code)})? This cannot be undone.`, async ()=>{
    const idx = SUBJECTS.findIndex(x=>x.id===id);
    if(idx>-1) SUBJECTS.splice(idx,1);
    SUBJECT_SELECTED.delete(id);
    await saveData();
    await persistEntityChange("subjects", {id}, "DELETE");
    renderAll();
    showToast("Subject deleted.");
  });
}
document.getElementById("addSubjectBtn").addEventListener("click", ()=> openSubjectForm());
document.getElementById("clearAllSubjectsBtn").addEventListener("click", ()=> clearAllOfTable("subjects"));
function openSubjectForm(existingId, presetDayScope){
  const existing = existingId ? SUBJECTS.find(s=>s.id===existingId) : null;
  const isEdit = !!existing;
  const f = currentSubjectFilter();
  const grade = existing ? existing.grade : f.grade;
  const isShs = tierOf(grade)==="SHS";
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="subjBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>${isEdit?'Edit Subject':'Add Subject'}</h3><button class="modal-close" id="subjClose">&times;</button></div>
        <div class="modal-body">
          <div class="field-row">
            <label class="field">School Year
              <select id="subjSY">${SCHOOL_YEARS.map(y=>`<option value="${y.id}" ${(existing?existing.schoolYearId:f.sy)===y.id?'selected':''}>${esc(y.label)}</option>`).join("")}</select>
            </label>
            <label class="field">Term
              <select id="subjTerm">${TERMS.map(t=>`<option value="${t.id}" ${(existing?existing.termId:f.term)===t.id?'selected':''}>${esc(t.name)}</option>`).join("")}</select>
            </label>
          </div>
          <div class="field-row">
            <label class="field">Grade Level
              <select id="subjGrade">${GRADE_ORDER.map(g=>`<option value="${g}" ${grade===g?'selected':''}>${g}</option>`).join("")}</select>
            </label>
            <label class="field" id="subjStrandField" style="${isShs?'':'display:none;'}">Track/Strand
              <select id="subjStrand">
                <option value="">— None —</option>
                ${TRACK_LIST.map(s=>`<option value="${s}" ${existing&&existing.strand===s?'selected':''}>${s}</option>`).join("")}
              </select>
            </label>
          </div>
          <label class="field">Subject Name
            <input type="text" id="subjName" value="${isEdit?esc(existing.name):''}" placeholder="e.g. Mathematics">
          </label>
          <div class="field-row">
            <label class="field">Subject Code
              <input type="text" id="subjCode" value="${isEdit?esc(existing.code):''}" placeholder="Auto-generated if left blank">
            </label>
            <label class="field">Subject Type
              <select id="subjType">${SUBJECT_TYPES.map(t=>`<option ${(existing?existing.type:'Core')===t?'selected':''}>${t}</option>`).join("")}</select>
            </label>
          </div>
          <label class="field">Program
            <select id="subjProgram">${SUBJECT_PROGRAMS.map(p=>`<option ${(existing?existing.program:'Regular')===p?'selected':''}>${p}</option>`).join("")}</select>
            <span class="hint">Special Program subjects can only be scheduled to Special Program sections, and vice versa.</span>
          </label>
          <label class="field">Learning Area
            <select id="subjLearningArea">
              <option value="">— Auto-detect from subject name —</option>
              ${AREA_LIST.concat(existing&&existing.learningArea&&!AREA_LIST.includes(existing.learningArea)?[existing.learningArea]:[]).map(a=>`<option value="${esc(a)}" ${existing&&existing.learningArea===a?'selected':''}>${esc(a)}${!AREA_LIST.includes(a)?' (Archived)':''}</option>`).join("")}
            </select>
            <span class="hint">Leave as Auto-detect to let ATLAS guess from the subject name, or explicitly assign it to a Learning Area from Specializations &amp; Learning Areas. A teacher qualifies to teach this subject if their tagged specialization matches this Learning Area.</span>
          </label>
          <label class="field">Schedule Days
            <select id="subjDayScope">
              <option value="mon-thu" ${(existing?subjectScheduleDays(existing):presetDayScope)==='mon-thu'?'selected':''}>Monday to Thursday</option>
              <option value="mon-fri" ${(!existing&&!presetDayScope)||(existing?subjectScheduleDays(existing):presetDayScope)==='mon-fri'?'selected':''}>Monday to Friday</option>
              <option value="friday-only" ${(existing?subjectScheduleDays(existing):presetDayScope)==='friday-only'?'selected':''}>Friday Only</option>
            </select>
            <span class="hint">"Monday to Thursday" is never scheduled on Friday, even when the Friday Schedule is enabled. "Friday Only" is excluded from the Monday–Thursday rotation and only appears in Friday's schedule.</span>
          </label>
          <div class="field-row">
            <label class="field">Units
              <input type="number" min="0" step="0.5" id="subjUnits" value="${isEdit?existing.units:1}">
            </label>
            <label class="field">Hours/Week
              <input type="number" min="0" step="0.5" id="subjHours" value="${isEdit?existing.hoursPerWeek:4}">
            </label>
            <label class="field">Status
              <select id="subjStatus">
                <option ${(existing?existing.status:'Active')==='Active'?'selected':''}>Active</option>
                <option ${(existing?existing.status:'')==='Inactive'?'selected':''}>Inactive</option>
              </select>
            </label>
          </div>
          <div class="err-text" id="subjErr"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="subjCancel">Cancel</button>
          <button class="btn gold" id="subjSave">${isEdit?'Save Changes':'Add Subject'}</button>
        </div>
      </div>
    </div>`;
  document.getElementById("subjGrade").addEventListener("change", ()=>{
    const g = document.getElementById("subjGrade").value;
    document.getElementById("subjStrandField").style.display = tierOf(g)==="SHS" ? "flex" : "none";
  });
  document.getElementById("subjClose").onclick = closeModal;
  document.getElementById("subjCancel").onclick = closeModal;
  document.getElementById("subjBackdrop").addEventListener("click", e=>{ if(e.target.id==="subjBackdrop") closeModal(); });
  document.getElementById("subjSave").onclick = ()=> withButtonLoading(document.getElementById("subjSave"), async ()=>{
    const schoolYearId = document.getElementById("subjSY").value;
    const termId = document.getElementById("subjTerm").value;
    const g = document.getElementById("subjGrade").value;
    const strand = tierOf(g)==="SHS" ? document.getElementById("subjStrand").value : "";
    const name = document.getElementById("subjName").value.trim();
    let code = document.getElementById("subjCode").value.trim();
    const type = document.getElementById("subjType").value;
    const program = document.getElementById("subjProgram").value || "Regular";
    const learningArea = document.getElementById("subjLearningArea").value || undefined;
    const scheduleDays = document.getElementById("subjDayScope").value;
    const fridayOnly = scheduleDays === "friday-only"; // kept in sync for any legacy code path still reading the old boolean
    const units = Number(document.getElementById("subjUnits").value) || 0;
    const hoursPerWeek = Number(document.getElementById("subjHours").value) || 0;
    const status = document.getElementById("subjStatus").value;
    if(!name){ document.getElementById("subjErr").textContent = "Please enter a subject name."; return; }
    if(subjectDuplicate(schoolYearId, termId, g, name, strand, isEdit?existing.id:null)){
      document.getElementById("subjErr").textContent = `A subject named "${name}" already exists for ${g} – ${termById(termId).name} – S.Y. ${schoolYearById(schoolYearId).label}.`;
      return;
    }
    let subjectRecord;
    if(isEdit){
      if(!code) code = existing.code;
      Object.assign(existing, { schoolYearId, termId, grade:g, strand, name, code, type, program, units, hoursPerWeek, status, fridayOnly, scheduleDays, learningArea });
      if(!learningArea) delete existing.learningArea;
      subjectRecord = existing;
    } else {
      if(!code) code = makeSubjectCode(name, g);
      if(SUBJECTS.some(s=>s.code===code)){ document.getElementById("subjErr").textContent = "That subject code is already in use — choose another."; return; }
      subjectRecord = { id: makeId(), schoolYearId, termId, grade:g, strand, name, code, type, program, units, hoursPerWeek, status, fridayOnly, scheduleDays, learningArea };
      SUBJECTS.push(subjectRecord);
    }
    closeModal();
    await saveData();
    await persistEntityChange("subjects", subjectRecord, isEdit ? "UPDATE" : "CREATE");
    renderAll();
    showToast(isEdit ? "Subject updated." : "Subject added.");
  });
}

let SECTION_GRADE_FILTER = "All";
function renderSections(){
  const tabsWrap = document.getElementById("sectionGradeTabs");
  const tabs = ["All", ...GRADE_ORDER];
  tabsWrap.innerHTML = tabs.map(g=>{
    const count = g==="All" ? SECTIONS.length : SECTIONS.filter(s=>s.grade===g).length;
    return `<button type="button" class="grade-tab ${SECTION_GRADE_FILTER===g?'active':''}" data-grade="${g}">${g==="All"?"All Grades":g}<span class="count">(${count})</span></button>`;
  }).join("");
  tabsWrap.querySelectorAll(".grade-tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      SECTION_GRADE_FILTER = btn.dataset.grade;
      renderSections();
    });
  });

  const visible = SECTION_GRADE_FILTER==="All" ? SECTIONS : SECTIONS.filter(s=>s.grade===SECTION_GRADE_FILTER);
  const tbody = document.querySelector("#sectionsTable tbody");
  tbody.innerHTML = visible.length ? visible.map(s=>{
    const cfg = GRADE_CONFIG[s.grade];
    const coordination = s.strand ? s.strand+" Track (Subject Teachers — see Schedule)" : "Subject Teachers (see Schedule)";
    const room = s.roomId ? ROOMS.find(r=>r.id===s.roomId) : null;
    const roomCell = room ? `<b>${esc(room.name)}</b>${room.type?`<div class="hint">${esc(room.type)}</div>`:""}` : `<span class="hint">Unassigned</span>`;
    return `<tr>
      <td class="check-cell"><input type="checkbox" class="row-check" data-id="${s.id}"></td>
      <td>${s.grade}</td>
      <td>${s.name}${s.strand?` <span class="tag maroon">${s.strand}</span>`:""}${s.sectionType==='Special Program'?' <span class="tag maroon">Special Program</span>':''}${s.classShift&&s.classShift!=='None'?` <span class="tag gold">${s.classShift} Class</span>`:''}${syncBadgeHtml("sections", s.id)}</td>
      <td><span class="tag gold">Subject-based</span></td>
      <td>${coordination}</td>
      <td>${roomCell}</td>
      <td>${subjectsForSection(s).length}</td>
      <td>${cfg.periods}</td>
      <td><div class="row-actions">
        <button class="icon-btn" title="View section details" data-view-section="${s.id}">👁️ View</button>
        <button class="icon-btn" title="Edit this section" data-edit-section="${s.id}">✏️ Edit</button>
        <button class="icon-btn danger" title="Permanently delete" data-delete-section="${s.id}">🗑️ Delete</button>
      </div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="9" class="empty">No sections for ${SECTION_GRADE_FILTER==="All"?"the school":SECTION_GRADE_FILTER} yet.</td></tr>`;
  tbody.querySelectorAll("[data-view-section]").forEach(b=>{ b.onclick = ()=>openSectionViewModal(b.dataset.viewSection); });
  tbody.querySelectorAll("[data-edit-section]").forEach(b=>{ b.onclick = ()=>openSectionForm(b.dataset.editSection); });
  tbody.querySelectorAll("[data-delete-section]").forEach(b=>{ b.onclick = ()=>deleteSection(b.dataset.deleteSection); });
  wireBulkBar({
    selectedSet: SECTION_SELECTED,
    allIds: visible.map(s=>s.id),
    barId: "sectionBulkBar", countId: "sectionSelCount", selectAllId: "sectionSelectAll",
    deleteBtnId: "sectionBulkDeleteBtn", rowCheckSelector: "#sectionsTable tbody .row-check",
    onDelete: bulkDeleteSections
  });
}

function renderScheduleSelectors(){
  const gradeSel = document.getElementById("schedGrade");
  gradeSel.innerHTML = GRADE_ORDER.map(g=>`<option value="${g}">${g}</option>`).join("");
  gradeSel.onchange = ()=>{ populateSectionSelect(); renderScheduleTable(); };
  populateSectionSelect();
  document.getElementById("schedSection").onchange = renderScheduleTable;
}
function populateSectionSelect(){
  const grade = document.getElementById("schedGrade").value;
  const secSel = document.getElementById("schedSection");
  const opts = SECTIONS.filter(s=>s.grade===grade);
  secSel.innerHTML = opts.map(s=>`<option value="${s.id}">${s.name}${s.strand?" ("+s.strand+")":""}</option>`).join("");
}
function renderDayTabs(){
  const wrap = document.getElementById("schedDayTabs");
  if(!wrap) return;
  if(!SCHOOL_DAYS.includes(SELECTED_SCHED_DAY)) SELECTED_SCHED_DAY = "Mon";
  wrap.innerHTML = SCHOOL_DAYS.map(day=>{
    const on = isDayActive(day);
    const active = day===SELECTED_SCHED_DAY;
    const cls = "day-tab" + (active?" active":"") + (on?"":" disabled-day");
    const label = DAY_FULL_NAME[day] + (on?"":" (Off)");
    return `<button type="button" class="${cls}" data-day="${day}" title="${on?'':'Friday is currently disabled for auto-generation in Schedule Settings — you can still add manual entries here.'}">${label}</button>`;
  }).join("");
  wrap.querySelectorAll("button[data-day]").forEach(btn=>{
    btn.onclick = ()=>{ SELECTED_SCHED_DAY = btn.dataset.day; renderScheduleTable(); };
  });
}
function renderScheduleTable(){
  renderDayTabs();
  const secId = document.getElementById("schedSection").value;
  const section = SECTIONS.find(s=>s.id===secId);
  const addBtn = document.getElementById("addSchedEntryBtn");
  if(!section){
    // No sections exist for the currently selected grade level — clear the
    // timetable instead of leaving stale data on screen, but still refresh
    // the compare table below (it doesn't depend on this selection).
    document.getElementById("schedTitle").textContent = "Daily Timetable";
    document.getElementById("schedNote").textContent = "";
    document.getElementById("schedTermNote").textContent = "";
    document.querySelector("#schedTable tbody").innerHTML = `<tr><td colspan="5" class="empty">No sections exist for this grade level yet — add one under Sections.</td></tr>`;
    if(addBtn) addBtn.disabled = true;
    renderCompareTable();
    return;
  }
  if(addBtn) addBtn.disabled = false;
  const day = SELECTED_SCHED_DAY;
  const progBadge = (section.sectionType==="Special Program") ? ' <span class="tag gold">Special Program</span>' : ' <span class="tag">Regular Program</span>';
  const shiftBadge = (isSHSGrade(section.grade) && section.classShift && section.classShift!=="None") ? ` <span class="tag blue">${section.classShift} Class</span>` : '';
  document.getElementById("schedTitle").innerHTML = esc(section.grade+" — "+section.name+" — "+DAY_FULL_NAME[day]+" Timetable")+progBadge+shiftBadge;
  const structure = "subject-based (rotating Subject Teachers)"+(section.strand?" — "+section.strand+" Track":"");
  document.getElementById("schedNote").textContent = "This is a "+structure+" section."+(isDayActive(day)?"":" Friday auto-generation is OFF — any entries shown here are manual overrides.");
  document.getElementById("schedTermNote").textContent = "Generated for: "+CURRENT_TERM;

  const timeline = buildTimeline(section, day);
  const tbody = document.querySelector("#schedTable tbody");
  if(!timeline.some(b=>b.type==="period")){
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No periods scheduled for ${DAY_FULL_NAME[day]}. ${isDayActive(day)?'':'Use "+ Add Schedule" to add one manually.'}</td></tr>`;
  } else {
    tbody.innerHTML = timeline.map(b=>{
      const time = fmt(b.start)+" – "+fmt(b.end);
      if(b.type==="break"){
        const label = b.subtype==="pm" ? "Afternoon Break" : "Morning Break (Day Break)";
        return `<tr style="background:#FBF3DC;" data-row-label="${esc(label)}"><td data-label="Time">${time}</td><td data-label="Block"><span class="tag gold">Break</span></td><td colspan="2" data-label="">${label}</td><td data-label=""></td></tr>`;
      }
      if(b.type==="lunch") return `<tr style="background:#F5E4E6;" data-row-label="Lunch Break"><td data-label="Time">${time}</td><td data-label="Block"><span class="tag maroon">Lunch</span></td><td colspan="2" data-label="">Lunch Break</td><td data-label=""></td></tr>`;
      const teacher = teacherById(b.teacherId);
      const who = teacher ? teacher.name : `<span class="tag maroon">Unassigned</span>`;
      const srcTag = b.source==="manual" ? ` <span class="tag gold" title="Manually edited — protected from auto-regeneration">Manual</span>` : "";
      const editArg = b.extraId ? `null,'${b.extraId}'` : `${b.periodIdx}`;
      const delArg = b.extraId ? `null,'${b.extraId}'` : `${b.periodIdx}`;
      return `<tr data-row-label="${esc(b.subject)}"><td data-label="Time">${time}</td><td data-label="Block"><span class="tag blue">Class</span></td><td data-label="Learning Area">${b.subject}${srcTag}</td><td data-label="Teacher">${who}</td>
        <td data-label="Actions" style="white-space:nowrap;">
          <button class="icon-btn" onclick="openScheduleEntryModal('${section.id}','${day}',${editArg})">Edit</button>
          <button class="icon-btn danger" onclick="deleteScheduleEntry('${section.id}','${day}',${delArg})">Delete</button>
        </td></tr>`;
    }).join("");
  }

  renderCompareTable();
}
function renderCompareTable(){
  const tbody = document.querySelector("#compareTable tbody");
  tbody.innerHTML = GRADE_ORDER.map(g=>{
    const rep = SECTIONS.find(s=>s.grade===g);
    if(!rep) return `<tr><td>${g}</td><td colspan="5" class="hint">No sections yet for this grade level.</td></tr>`;
    const timeline = buildTimeline(rep, "Mon");
    const amB = timeline.find(x=>x.type==="break" && x.subtype==="am");
    const l = timeline.find(x=>x.type==="lunch");
    const pmB = timeline.find(x=>x.type==="break" && x.subtype==="pm");
    const dismissal = timeline[timeline.length-1].end;
    return `<tr><td>${g}</td><td>${fmt(toMinutes(GRADE_CONFIG[g].startTime || ADMIN_START))}</td><td>${fmt(amB.start)} – ${fmt(amB.end)}</td><td>${fmt(l.start)} – ${fmt(l.end)}</td><td>${fmt(pmB.start)} – ${fmt(pmB.end)}</td><td>${fmt(dismissal)}</td></tr>`;
  }).join("");
}

/* ---- Manual schedule editing: Add / Edit / Delete a single entry -------- */
function findManualExtra(id){ return MANUAL_EXTRA.find(e=>e.id===id); }

// Checks for conflicts against the FULL effective schedule (auto + manual,
// every section) for the given day/time, excluding the entry being edited.
function checkScheduleConflicts({sectionId, day, start, end, teacherId, subject, excludeKey, excludeExtraId}){
  const problems = [];
  const section = SECTIONS.find(s=>s.id===sectionId);

  // Invalid / overlapping time slot on its face (defensive — callers already
  // validate this on their own form, but the whole-schedule revalidator below
  // relies on this check firing too).
  if(end<=start){
    problems.push(`Invalid time slot: end time must be after start time (${fmt(start)}–${fmt(end)}) for ${section?section.grade+" - "+section.name:"this section"} on ${DAY_FULL_NAME[day]}.`);
  }

  // Breaktime / Lunch conflict — the entry must not overlap this section's
  // own Morning Break, Lunch, or Afternoon Break blocks for that day.
  if(section){
    buildTimeline(section, day).filter(b=>b.type==="break"||b.type==="lunch").forEach(b=>{
      if(!intervalsOverlap(b.start,b.end,start,end)) return;
      const label = b.type==="lunch" ? "Lunch Break" : (b.subtype==="pm" ? "Afternoon Break" : "Morning Break");
      problems.push(`Breaktime/Lunch conflict: ${fmt(start)}–${fmt(end)} overlaps the ${label} (${fmt(b.start)}–${fmt(b.end)}) for ${section.grade} - ${section.name} on ${DAY_FULL_NAME[day]}.`);
    });
  }

  SECTIONS.forEach(sec=>{
    const tl = buildTimeline(sec, day);
    tl.filter(b=>b.type==="period").forEach(b=>{
      const isSelf = sec.id===sectionId && (
        (excludeKey!=null && b.periodIdx===excludeKey) ||
        (excludeExtraId!=null && b.extraId===excludeExtraId)
      );
      if(isSelf) return;
      const overlaps = intervalsOverlap(b.start,b.end,start,end);
      if(!overlaps) return;
      // Special Program / TLE / Research shared-scheduling group: within the
      // SAME Special Program section, two different subjects that both
      // belong to this group (e.g. a combined TLE + Research period) are
      // allowed to intentionally occupy the exact same time slot — this is
      // not a real double-booking, so it's excluded from both the Section
      // time conflict and Teacher time conflict checks below. It never
      // relaxes anything across different sections, different rooms, or
      // subjects outside this specific group.
      const isSharedSlot = sec.id===sectionId && sec.sectionType==="Special Program" &&
        subject && b.subject!==subject &&
        isSharedProgramGroupSubject(b.subject) && isSharedProgramGroupSubject(subject);
      if(sec.id===sectionId && !isSharedSlot){
        // Duplicate schedule: same section, same exact time slot AND same subject.
        if(subject && b.subject===subject && b.start===start && b.end===end){
          problems.push(`Duplicate schedule: ${sec.grade} - ${sec.name} already has an identical "${b.subject}" entry at ${fmt(b.start)}–${fmt(b.end)} on ${DAY_FULL_NAME[day]}.`);
        } else {
          problems.push(`Section time conflict: ${sec.grade} - ${sec.name} already has ${b.subject} at ${fmt(b.start)}–${fmt(b.end)} on ${DAY_FULL_NAME[day]}.`);
        }
      }
      if(teacherId && b.teacherId===teacherId && !isSharedSlot){
        problems.push(`Teacher time conflict: ${teacherById(teacherId)?.name||"This teacher"} is already teaching ${b.subject} for ${sec.grade} - ${sec.name} at ${fmt(b.start)}–${fmt(b.end)} on ${DAY_FULL_NAME[day]}.`);
      }
      if(section && section.roomId && sec.roomId===section.roomId && sec.id!==sectionId){
        const room = ROOMS.find(r=>r.id===section.roomId);
        problems.push(`Room/Building conflict: ${room?room.name:"This room"} is already in use by ${sec.grade} - ${sec.name} at ${fmt(b.start)}–${fmt(b.end)} on ${DAY_FULL_NAME[day]}.`);
      }
    });
  });

  // Grade-Level Teaching Assignment validation: a manually-assigned teacher
  // must be Admin-authorized for this grade, and must not exceed their
  // per-grade teaching-load limit. Reported as a warning (not a hard block)
  // so Admin can still "Save Anyway" — Admin Control explicitly allows
  // manual overrides here, with a clear warning.
  if(teacherId && section){
    const t = teacherById(teacherId);
    if(t){
      if(!t.tiers.includes(section.grade)){
        problems.push(`Grade-level restriction: ${t.name} is not authorized by Admin to teach ${section.grade} (see Grade-Level Teaching Assignment in Teacher Management).`);
      } else if(subject){
        const bucket = sectionProgramBucket(section);
        const bucketLabel = bucket==="special" ? "Special Program" : "Regular Class";
        const cap = teacherGradeCap(t, section.grade, bucket);
        const existingForGrade = (buildAllAssignments()[teacherId]||[]).filter(a=>a.grade===section.grade && (a.program||"Regular")===(section.sectionType||"Regular"));
        const alreadyThisCombo = existingForGrade.some(a=> a.sectionLabel===(section.grade+" - "+section.name) && a.subject===subject);
        if(!alreadyThisCombo && existingForGrade.length>=cap){
          problems.push(`Teaching-load limit: ${t.name} already has ${existingForGrade.length}/${cap} ${bucketLabel} teaching loads for ${section.grade} — assigning this class would exceed the Admin-set limit.`);
        }
      }
    }
  }
  return problems;
}

function openScheduleEntryModal(sectionId, day, periodIdx, extraId){
  const section = SECTIONS.find(s=>s.id===sectionId);
  if(!section) return;
  const isExtra = extraId!=null && extraId!=="null";
  const isEditingPeriod = periodIdx!=null && periodIdx!=="null" && !isExtra;
  let existingSubject="", existingTeacher="", existingStart="", existingEnd="";
  if(isEditingPeriod){
    const raw = buildTimeline(section, day).find(b=>b.type==="period" && b.periodIdx===Number(periodIdx));
    if(raw){ existingSubject=raw.subject; existingTeacher=raw.teacherId||""; existingStart=fmt(raw.start); existingEnd=fmt(raw.end); }
  } else if(isExtra){
    const e = findManualExtra(extraId);
    if(e){ existingSubject=e.subject; existingTeacher=e.teacherId||""; existingStart=fmt(e.start); existingEnd=fmt(e.end); }
  }
  const subjectOptions = subjectsForSection(section, day);
  const isNew = !isEditingPeriod && !isExtra;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="seBackdrop">
      <div class="modal-box">
        <div class="modal-head"><h3>${isNew?'Add Schedule Entry':'Edit Schedule Entry'}</h3><button class="modal-close" id="seClose">&times;</button></div>
        <div class="modal-body">
          <div class="hint">${section.grade} — ${section.name}</div>
          <label class="field">Day
            <select id="seDay">${SCHOOL_DAYS.map(d=>`<option value="${d}" ${d===day?'selected':''}>${DAY_FULL_NAME[d]}${isDayActive(d)?'':' (auto-generation off)'}</option>`).join("")}</select>
          </label>
          <label class="field">Learning Area / Subject
            <select id="seSubject">
              ${subjectOptions.map(s=>`<option value="${esc(s)}" ${s===existingSubject?'selected':''}>${esc(s)}</option>`).join("")}
              ${!subjectOptions.includes(existingSubject) && existingSubject ? `<option value="${esc(existingSubject)}" selected>${esc(existingSubject)}</option>` : ""}
              <option value="__custom__">Other / type a subject…</option>
            </select>
          </label>
          <label class="field" id="seCustomSubjectWrap" style="display:none;">Custom subject name
            <input type="text" id="seCustomSubject" placeholder="e.g. Remedial Reading">
          </label>
          <label class="field">Teacher
            <select id="seTeacher">
              <option value="">— Unassigned —</option>
              ${TEACHERS.map(t=>{
                const authorized = t.tiers.includes(section.grade);
                const qualified = authorized && (!existingSubject || teacherCanTeach(t, existingSubject));
                let flag = "";
                if(!authorized) flag = " — not assigned to this grade level";
                else if(!qualified) flag = " — not tagged for this subject";
                else if(existingSubject){
                  const bucket = sectionProgramBucket(section);
                  const bucketLabel = bucket==="special" ? "Special Program" : "Regular Class";
                  const cap = teacherGradeCap(t, section.grade, bucket);
                  const existingForGrade = (buildAllAssignments()[t.id]||[]).filter(a=>a.grade===section.grade && (a.program||"Regular")===(section.sectionType||"Regular"));
                  const alreadyThisCombo = existingForGrade.some(a=> a.sectionLabel===(section.grade+" - "+section.name) && a.subject===existingSubject);
                  if(!alreadyThisCombo && existingForGrade.length>=cap) flag = ` — at ${bucketLabel} teaching-load limit for ${section.grade} (${existingForGrade.length}/${cap})`;
                }
                return `<option value="${t.id}" ${t.id===existingTeacher?'selected':''}>${esc(t.name)}${flag}</option>`;
              }).join("")}
            </select>
          </label>
          <div class="row-flex">
            <label class="field">Start time
              <input type="time" id="seStart" value="${existingStart}">
            </label>
            <label class="field">End time
              <input type="time" id="seEnd" value="${existingEnd}">
            </label>
          </div>
          <div id="seConflictBox" class="banner" style="display:none; background:#F5E4E6; border-color:#E3C4C7; color:var(--maroon);"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="seCancel">Cancel</button>
          <button class="btn gold" id="seSaveAnyway" style="display:none;">Save Anyway</button>
          <button class="btn" id="seSave">Save</button>
        </div>
      </div>
    </div>`;
  const subjSel = document.getElementById("seSubject");
  const customWrap = document.getElementById("seCustomSubjectWrap");
  const customInput = document.getElementById("seCustomSubject");
  function syncCustom(){
    const isCustom = subjSel.value==="__custom__";
    customWrap.style.display = isCustom ? "block" : "none";
    if(isCustom) customInput.value = subjectOptions.includes(existingSubject) ? "" : existingSubject;
  }
  subjSel.onchange = syncCustom;
  if(!subjectOptions.includes(existingSubject) && existingSubject){ subjSel.value = existingSubject; }
  syncCustom();
  // Re-scope the subject list whenever the chosen Day changes, since
  // Friday-Only subjects should only be selectable when Day = Friday.
  document.getElementById("seDay").addEventListener("change", ()=>{
    const dSel = document.getElementById("seDay").value;
    const opts = subjectsForSection(section, dSel);
    const prevValue = subjSel.value;
    subjSel.innerHTML = opts.map(s=>`<option value="${esc(s)}" ${s===prevValue?'selected':''}>${esc(s)}</option>`).join("")
      + (!opts.includes(prevValue) && prevValue!=="__custom__" && prevValue ? `<option value="${esc(prevValue)}" selected>${esc(prevValue)}</option>` : "")
      + `<option value="__custom__" ${prevValue==="__custom__"?'selected':''}>Other / type a subject…</option>`;
    syncCustom();
  });

  const close = ()=>closeModal();
  document.getElementById("seClose").onclick = close;
  document.getElementById("seCancel").onclick = close;
  document.getElementById("seBackdrop").addEventListener("click", e=>{ if(e.target.id==="seBackdrop") close(); });

  function readForm(){
    const d = document.getElementById("seDay").value;
    let subject = subjSel.value==="__custom__" ? (customInput.value||"").trim() : subjSel.value;
    const teacherId = document.getElementById("seTeacher").value || null;
    const startStr = document.getElementById("seStart").value;
    const endStr = document.getElementById("seEnd").value;
    return { day:d, subject, teacherId, startStr, endStr };
  }

  function doSave(force){
    const { day:d, subject, teacherId, startStr, endStr } = readForm();
    if(!subject){ showToast("Enter or select a subject.", true); return; }
    if(!startStr || !endStr){ showToast("Set a start and end time.", true); return; }
    const start = toMinutes(startStr), end = toMinutes(endStr);
    if(end<=start){ showToast("End time must be after start time.", true); return; }

    const excludeKey = isEditingPeriod ? Number(periodIdx) : null;
    const excludeExtraId = isExtra ? extraId : null;
    const problems = checkScheduleConflicts({ sectionId:section.id, day:d, start, end, teacherId, subject, excludeKey, excludeExtraId });

    if(problems.length && !force){
      const box = document.getElementById("seConflictBox");
      box.style.display = "block";
      box.innerHTML = "<b>This creates a conflict:</b><ul style='margin:6px 0 0;padding-left:18px;'>"+problems.map(p=>`<li>${esc(p)}</li>`).join("")+"</ul>";
      document.getElementById("seSaveAnyway").style.display = "inline-block";
      return;
    }

    if(isEditingPeriod && d===day){
      // Same day, editing the generated slot in place.
      MANUAL_OVERRIDES[scheduleKey(section.id, day, Number(periodIdx))] = { subject, teacherId };
      SECTION_PERIOD_OVERRIDE[section.id] = SECTION_PERIOD_OVERRIDE[section.id] || {};
      SECTION_PERIOD_OVERRIDE[section.id][day] = SECTION_PERIOD_OVERRIDE[section.id][day] || {};
      SECTION_PERIOD_OVERRIDE[section.id][day][Number(periodIdx)] = subject;
    } else if(isEditingPeriod && d!==day){
      // Moved to a different day: clear the original slot, add as a freeform entry on the new day.
      MANUAL_OVERRIDES[scheduleKey(section.id, day, Number(periodIdx))] = { subject:null, teacherId:null };
      MANUAL_EXTRA.push({ id:"MX"+(extraEntryCounter++), sectionId:section.id, day:d, subject, teacherId, start, end });
    } else if(isExtra){
      const e = findManualExtra(extraId);
      if(e){ e.day=d; e.subject=subject; e.teacherId=teacherId; e.start=start; e.end=end; }
    } else {
      MANUAL_EXTRA.push({ id:"MX"+(extraEntryCounter++), sectionId:section.id, day:d, subject, teacherId, start, end });
    }

    recordFinalAuditIfEditing({
      section, day:d, action: isNew ? "add" : "edit",
      before: isNew ? null : { subject:existingSubject, teacherId:existingTeacher||null, start:existingStart?toMinutes(existingStart):null, end:existingEnd?toMinutes(existingEnd):null, day },
      after: { subject, teacherId, start, end, day:d }
    });

    close();
    saveData();
    renderAll();
    showToast(isNew ? "Schedule entry added." : "Schedule entry updated.");
  }

  document.getElementById("seSave").onclick = ()=>doSave(false);
  document.getElementById("seSaveAnyway").onclick = ()=>doSave(true);
}

function deleteScheduleEntry(sectionId, day, periodIdx, extraId){
  const isExtra = extraId!=null && extraId!=="null";
  const section = SECTIONS.find(s=>s.id===sectionId);
  openConfirm(isExtra ? "Delete this manually-added schedule entry?" : "Remove this class period from the timetable? It will show as unscheduled until re-added or the schedule is regenerated.", async ()=>{
    // Capture the entry as it stood immediately before deletion, for the audit trail.
    const before = section ? (buildTimeline(section, day).find(b=>
      isExtra ? b.extraId===extraId : (b.type==="period" && b.periodIdx===Number(periodIdx))
    ) || null) : null;

    if(isExtra){
      MANUAL_EXTRA = MANUAL_EXTRA.filter(e=>e.id!==extraId);
    } else {
      MANUAL_OVERRIDES[scheduleKey(sectionId, day, Number(periodIdx))] = { subject:null, teacherId:null };
    }

    recordFinalAuditIfEditing({
      section, day, action:"delete",
      before: before ? { subject:before.subject, teacherId:before.teacherId||null, start:before.start, end:before.end, day } : null,
      after: null
    });

    await saveData();
    renderAll();
    showToast("Schedule entry removed.");
  }, "Delete");
}

/* =========================================================
   4B. FINAL CLASSROOM SCHEDULE — the official weekly schedule,
   shown and printed as ONE consolidated Monday–Thursday (or
   Monday–Friday, when enabled) document. It reads the same
   SCHEDULE_ASSIGNMENTS / MANUAL_OVERRIDES / MANUAL_EXTRA state
   the Class Schedule page writes, but — unlike before — it is
   also directly editable in place by authorized Admins, behind
   a confirmation step, full-schedule conflict re-validation, and
   a permanent, append-only audit trail (see FINAL_SCHEDULE_AUDIT_LOG
   below).
   ========================================================= */
function sectionRoomName(section){
  if(!section || !section.roomId) return "—";
  const room = ROOMS.find(r=>r.id===section.roomId);
  return room ? room.name : "—";
}

/* ---- Edit Mode / Audit Trail state ------------------------------------- */
let FINAL_EDIT_MODE = false;          // true while the Admin is actively editing the Final Classroom Schedule
let FINAL_EDIT_SNAPSHOT = null;       // deep clone of editable state taken at Edit Mode entry, restored on Cancel
let FINAL_EDIT_PENDING_AUDIT = [];    // audit entries made so far *this* edit session; committed on Save, discarded on Cancel
let FINAL_EDIT_CONFLICTS = [];        // most recent whole-schedule validation result while editing
let FINAL_SCHEDULE_AUDIT_LOG = [];    // permanent, append-only: {id, at, user, sectionLabel, day, action, before, after}
let finalAuditIdCounter = 1;
let FINAL_SCHEDULE_FINALIZED_AT = null;
let FINAL_SCHEDULE_FINALIZED_BY = null;

function currentUserLabel(){
  return (typeof AUTH_SESSION!=="undefined" && AUTH_SESSION && AUTH_SESSION.email) || "Admin";
}
function describeEntry(e){
  if(!e) return "<i>— none —</i>";
  const teacher = e.teacherId ? (teacherById(e.teacherId)?.name || "Unknown teacher") : "Unassigned";
  const dayLabel = DAY_FULL_NAME[e.day] || e.day || "";
  const time = (e.start!=null && e.end!=null) ? `${fmt(e.start)}–${fmt(e.end)}` : "";
  return esc(`${e.subject||"—"} · ${teacher} · ${dayLabel} ${time}`.trim());
}
// Called by the schedule-entry Add/Edit and Delete flows after they mutate
// state. Only records anything while FINAL_EDIT_MODE is on, so ordinary
// Class Schedule edits (outside a confirmed Final Schedule edit session)
// are never audited.
function recordFinalAuditIfEditing({section, day, action, before, after}){
  if(!FINAL_EDIT_MODE) return;
  FINAL_EDIT_PENDING_AUDIT.push({
    at: new Date().toISOString(),
    user: currentUserLabel(),
    sectionLabel: section ? `${section.grade} - ${section.name}${section.strand?" ("+section.strand+")":""}` : "—",
    day, action, before, after
  });
}
function commitPendingFinalAudit(){
  FINAL_EDIT_PENDING_AUDIT.forEach(entry=>{
    FINAL_SCHEDULE_AUDIT_LOG.push(Object.assign({id:"FA"+(finalAuditIdCounter++)}, entry));
  });
  FINAL_EDIT_PENDING_AUDIT = [];
}

function startFinalEditSession(){
  FINAL_EDIT_SNAPSHOT = JSON.parse(JSON.stringify({
    manualOverrides: MANUAL_OVERRIDES,
    manualExtra: MANUAL_EXTRA,
    sectionPeriodOverride: SECTION_PERIOD_OVERRIDE,
    extraEntryCounter
  }));
  FINAL_EDIT_PENDING_AUDIT = [];
  FINAL_EDIT_MODE = true;
  FINAL_EDIT_CONFLICTS = validateFullSchedule();
  renderAll();
  showToast("Edit Mode enabled — changes are checked for conflicts and recorded to the audit trail.");
}
function cancelFinalEditMode(){
  if(!FINAL_EDIT_MODE) return;
  openConfirm("Discard all changes made during this edit session and restore the last saved Final Classroom Schedule?", async ()=>{
    if(FINAL_EDIT_SNAPSHOT){
      MANUAL_OVERRIDES = FINAL_EDIT_SNAPSHOT.manualOverrides;
      MANUAL_EXTRA = FINAL_EDIT_SNAPSHOT.manualExtra;
      SECTION_PERIOD_OVERRIDE = FINAL_EDIT_SNAPSHOT.sectionPeriodOverride;
      extraEntryCounter = FINAL_EDIT_SNAPSHOT.extraEntryCounter;
    }
    FINAL_EDIT_PENDING_AUDIT = [];
    FINAL_EDIT_MODE = false;
    FINAL_EDIT_SNAPSHOT = null;
    FINAL_EDIT_CONFLICTS = [];
    await saveData();
    renderAll();
    showToast("Changes discarded — Final Classroom Schedule restored.");
  }, "Discard Changes");
}
function revalidateFinalSchedule(){
  FINAL_EDIT_CONFLICTS = validateFullSchedule();
  renderFinalEditConflictBanner();
  showToast(FINAL_EDIT_CONFLICTS.length ? `${FINAL_EDIT_CONFLICTS.length} conflict(s) found — see below.` : "No conflicts found — safe to Save & Finalize.", FINAL_EDIT_CONFLICTS.length>0);
}
async function saveFinalScheduleChanges(finalize){
  FINAL_EDIT_CONFLICTS = validateFullSchedule();
  if(finalize && FINAL_EDIT_CONFLICTS.length){
    renderFinalEditConflictBanner();
    showToast("Cannot finalize — resolve all conflicts first, then Re-Validate.", true);
    return;
  }
  commitPendingFinalAudit();
  if(finalize){
    FINAL_SCHEDULE_FINALIZED_AT = new Date().toISOString();
    FINAL_SCHEDULE_FINALIZED_BY = currentUserLabel();
    FINAL_EDIT_MODE = false;
    FINAL_EDIT_SNAPSHOT = null;
  }
  await saveData();
  renderAll();
  showToast(finalize ? "Final Classroom Schedule saved and finalized." : "Changes saved.");
}
function renderFinalEditConflictBanner(){
  const banner = document.getElementById("fsEditConflictBanner");
  const finalizeBtn = document.getElementById("fsSaveFinalizeBtn");
  if(!banner) return;
  if(!FINAL_EDIT_MODE){ banner.style.display = "none"; return; }
  if(FINAL_EDIT_CONFLICTS.length){
    banner.className = "fs-conflict-banner";
    banner.style.display = "block";
    const shown = FINAL_EDIT_CONFLICTS.slice(0,8).map(p=>`<li>${esc(p)}</li>`).join("");
    const more = FINAL_EDIT_CONFLICTS.length>8 ? `<li>…and ${FINAL_EDIT_CONFLICTS.length-8} more — Re-Validate after fixing these.</li>` : "";
    banner.innerHTML = `<b>${FINAL_EDIT_CONFLICTS.length} conflict(s) found — resolve these before Save &amp; Finalize:</b><ul>${shown}${more}</ul>`;
    if(finalizeBtn) finalizeBtn.disabled = true;
  } else {
    banner.className = "fs-conflict-banner ok";
    banner.style.display = "block";
    banner.innerHTML = "No conflicts found. Safe to Save &amp; Finalize.";
    if(finalizeBtn) finalizeBtn.disabled = false;
  }
}
function renderFinalEditToolbar(){
  const toolbar = document.getElementById("fsEditToolbar");
  const editBtn = document.getElementById("fsEditBtn");
  if(!toolbar || !editBtn) return;
  toolbar.style.display = FINAL_EDIT_MODE ? "flex" : "none";
  editBtn.style.display = FINAL_EDIT_MODE ? "none" : "inline-flex";
  renderFinalEditConflictBanner();
}

// Small picker modal (Section + Day) used only to route "+ Add Entry" into
// the existing Add/Edit Schedule Entry modal, which already has its own
// conflict checking, subject list, and teacher list.
function openAddFinalEntryPicker(){
  const sorted = SECTIONS.slice().sort((a,b)=>{
    const gi = GRADE_ORDER.indexOf(a.grade)-GRADE_ORDER.indexOf(b.grade);
    return gi!==0 ? gi : a.name.localeCompare(b.name);
  });
  if(!sorted.length){ showToast("Add a section first.", true); return; }
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="faeBackdrop">
      <div class="modal-box narrow">
        <div class="modal-head"><h3>Add Schedule Entry</h3><button class="modal-close" id="faeClose">&times;</button></div>
        <div class="modal-body">
          <label class="field">Section
            <select id="faeSection">${sorted.map(s=>`<option value="${s.id}">${s.grade} — ${esc(s.name)}${s.strand?" ("+s.strand+")":""}</option>`).join("")}</select>
          </label>
          <label class="field">Day
            <select id="faeDay">${activeDays().map(d=>`<option value="${d}">${DAY_FULL_NAME[d]}</option>`).join("")}</select>
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="faeCancel">Cancel</button>
          <button class="btn" id="faeContinue">Continue</button>
        </div>
      </div>
    </div>`;
  const close = ()=>closeModal();
  document.getElementById("faeClose").onclick = close;
  document.getElementById("faeCancel").onclick = close;
  document.getElementById("faeBackdrop").addEventListener("click", e=>{ if(e.target.id==="faeBackdrop") close(); });
  document.getElementById("faeContinue").onclick = ()=>{
    const secId = document.getElementById("faeSection").value;
    const day = document.getElementById("faeDay").value;
    close();
    openScheduleEntryModal(secId, day, null, null);
  };
}

function openFinalAuditModal(){
  const rows = FINAL_SCHEDULE_AUDIT_LOG.slice().sort((a,b)=> new Date(b.at) - new Date(a.at));
  const body = rows.length ? rows.map(r=>{
    const when = new Date(r.at).toLocaleString();
    const actionLabel = r.action==="add" ? "Added" : r.action==="delete" ? "Deleted" : "Edited";
    return `<tr>
      <td>${esc(when)}</td>
      <td>${esc(r.user)}</td>
      <td>${esc(r.sectionLabel)}</td>
      <td>${esc(DAY_FULL_NAME[r.day]||r.day||"")}</td>
      <td>${actionLabel}</td>
      <td class="fs-audit-old">${describeEntry(r.before)}</td>
      <td class="fs-audit-new">${describeEntry(r.after)}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">No edits have been made to the Final Classroom Schedule yet.</td></tr>`;

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="faBackdrop">
      <div class="modal-box wide">
        <div class="modal-head"><h3>Final Classroom Schedule — Audit Trail</h3><button class="modal-close" id="faClose">&times;</button></div>
        <div class="modal-body">
          <div class="hint" style="margin-bottom:10px;">Every modification ever made to the Final Classroom Schedule, newest first — including the previous and new value each time. This history is permanent and cannot be cleared.</div>
          <div style="overflow:auto; max-height:60vh;">
            <table class="fs-audit-table" style="width:100%; border-collapse:collapse;">
              <thead><tr><th>Date &amp; Time</th><th>Admin/User</th><th>Section</th><th>Day</th><th>Action</th><th>Previous Value</th><th>New Value</th></tr></thead>
              <tbody>${body}</tbody>
            </table>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="faCloseBtn">Close</button>
        </div>
      </div>
    </div>`;
  const close = ()=>closeModal();
  document.getElementById("faClose").onclick = close;
  document.getElementById("faCloseBtn").onclick = close;
  document.getElementById("faBackdrop").addEventListener("click", e=>{ if(e.target.id==="faBackdrop") close(); });
}

function collectFinalScheduleFilters(){
  return {
    grade: document.getElementById("fsGrade").value,
    sectionId: document.getElementById("fsSection").value,
    schoolYearId: document.getElementById("fsSchoolYear").value,
    termId: document.getElementById("fsTerm").value,
    day: document.getElementById("fsDay").value,
    teacherId: document.getElementById("fsTeacher").value,
    roomId: document.getElementById("fsRoom").value
  };
}
function finalScheduleMatchingSections(f){
  return SECTIONS.filter(s=>{
    if(f.grade && s.grade!==f.grade) return false;
    if(f.sectionId && s.id!==f.sectionId) return false;
    if(f.roomId && s.roomId!==f.roomId) return false;
    return true;
  });
}
function finalScheduleOutOfContext(f){
  return (f.schoolYearId && f.schoolYearId!==CURRENT_SCHOOL_YEAR_ID) || (f.termId && f.termId!==CURRENT_TERM_ID);
}
// Days included in the ONE consolidated document: an explicit Day filter
// narrows it to just that day; otherwise every currently active school day
// (Mon–Thu, or Mon–Fri once Friday is enabled) is included together.
function finalScheduleDays(f){
  return f.day ? [f.day] : activeDays();
}
// Flat, sorted list of every timeline block (class period, break, lunch)
// across every day/section that passes the current filters — the single
// source of rows for the on-screen table, the printout, and the Excel
// export, so all three always show exactly the same consolidated schedule.
function collectFinalScheduleRows(f){
  const days = finalScheduleDays(f).slice().sort((a,b)=>SCHOOL_DAYS.indexOf(a)-SCHOOL_DAYS.indexOf(b));
  const sections = finalScheduleMatchingSections(f).slice().sort((a,b)=>{
    const gi = GRADE_ORDER.indexOf(a.grade)-GRADE_ORDER.indexOf(b.grade);
    return gi!==0 ? gi : a.name.localeCompare(b.name);
  });
  const rows = [];
  days.forEach(day=>{
    sections.forEach(sec=>{
      const timeline = buildTimeline(sec, day);
      if(!timeline.some(b=>b.type==="period")) return;
      if(f.teacherId && !timeline.some(b=>b.type==="period" && b.teacherId===f.teacherId)) return;
      timeline.forEach(b=> rows.push({ day, section:sec, block:b }));
    });
  });
  return rows;
}
// Builds the row model for one section's Time x Day grid: one row per
// period slot (matched across the shown days by periodIdx, since every day
// shares the same grade's period count/order) plus one row per break/lunch,
// using the first day that actually has periods as the canonical source of
// times and break placement. Freeform "extra" entries (added via + Add
// Entry, not tied to a periodIdx) are appended afterward as their own
// single-day rows since they have no cross-day alignment.
function buildSectionGridRows(section, days){
  const timelines = {};
  days.forEach(d=> timelines[d] = buildTimeline(section, d));
  const canonicalDay = days.find(d=> timelines[d].some(b=>b.type==="period" && !b.extraId)) || days[0];
  const canonicalTimeline = timelines[canonicalDay] || [];
  const rows = [];
  canonicalTimeline.forEach(b=>{
    if(b.extraId) return; // handled separately below
    if(b.type==="break" || b.type==="lunch"){
      const label = b.type==="lunch" ? "Lunch Break" : (b.subtype==="pm" ? "Afternoon Break" : "Morning Break");
      rows.push({ kind:"break", time:`${fmt(b.start)} – ${fmt(b.end)}`, label });
      return;
    }
    const periodIdx = b.periodIdx;
    const dayCells = {};
    const teacherNames = new Set();
    let anyAssigned = false;
    days.forEach(d=>{
      const match = (timelines[d]||[]).find(x=>x.type==="period" && !x.extraId && x.periodIdx===periodIdx);
      dayCells[d] = match ? { subject: match.subject||"", sectionId:section.id, day:d, periodIdx } : null;
      if(match && match.teacherId){ anyAssigned = true; const t = teacherById(match.teacherId); if(t) teacherNames.add(t.name); }
    });
    rows.push({
      kind:"period", time:`${fmt(b.start)} – ${fmt(b.end)}`, periodIdx, dayCells,
      teacherLabel: teacherNames.size ? Array.from(teacherNames).join(" / ") : (anyAssigned ? null : "Unassigned")
    });
  });
  const extraRows = [];
  days.forEach(d=>{
    (timelines[d]||[]).filter(b=>b.type==="period" && b.extraId).forEach(b=>{
      const dayCells = {};
      days.forEach(dd=> dayCells[dd] = (dd===d) ? { subject:b.subject||"", sectionId:section.id, day:d, extraId:b.extraId } : null);
      const t = teacherById(b.teacherId);
      extraRows.push({ kind:"period", time:`${fmt(b.start)} – ${fmt(b.end)}`, dayCells, teacherLabel: t ? t.name : "Unassigned", sortKey:b.start });
    });
  });
  extraRows.sort((a,b)=>a.sortKey-b.sortKey);
  return rows.concat(extraRows);
}
// Renders one section's Time x Day grid table — the actual "class program"
// format posted in a classroom: rows are time slots, columns are the
// currently-active weekdays (Friday only when Enable Friday Schedule is
// on), and the last column shows the teacher(s) assigned to that slot.
function sectionGridHtml(section, days, editable){
  const gridRows = buildSectionGridRows(section, days);
  const dayHeaders = days.map(d=>`<th>${DAY_FULL_NAME[d]}</th>`).join("");
  const bodyRows = gridRows.map(r=>{
    if(r.kind==="break"){
      return `<tr class="fs-break"><td>${r.time}</td><td colspan="${days.length}" style="text-align:center;">${r.label}</td><td>—</td></tr>`;
    }
    const dayTds = days.map(d=>{
      const cell = r.dayCells[d];
      if(!cell || !cell.subject) return `<td>—</td>`;
      const arg = cell.extraId ? `null,'${cell.extraId}'` : `${cell.periodIdx}`;
      const actions = editable ? `<div class="fs-cell-actions">
          <button class="icon-btn" onclick="openScheduleEntryModal('${cell.sectionId}','${cell.day}',${arg})">Edit</button>
          <button class="icon-btn danger" onclick="deleteScheduleEntry('${cell.sectionId}','${cell.day}',${arg})">Delete</button>
        </div>` : "";
      return `<td class="fs-subject-cell">${esc(cell.subject)}${actions}</td>`;
    }).join("");
    const teacherCell = r.teacherLabel==="Unassigned" ? `<td><span class="tag maroon">Unassigned</span></td>` : `<td>${esc(r.teacherLabel||"—")}</td>`;
    return `<tr><td>${r.time}</td>${dayTds}${teacherCell}</tr>`;
  }).join("");
  const sectionLabel = `${esc(section.grade)} — ${esc(section.name)}${section.strand?" ("+esc(section.strand)+")":""}`;
  return `<div class="fs-section-block">
    <div class="fs-section-header">${sectionLabel} <span class="hint">${esc(sectionRoomName(section))}</span></div>
    <table>
      <thead><tr><th style="width:130px;">Time</th>${dayHeaders}<th>Teacher Assigned</th></tr></thead>
      <tbody>${bodyRows || `<tr><td colspan="${days.length+2}" class="empty">No periods scheduled.</td></tr>`}</tbody>
    </table>
  </div>`;
}
function buildConsolidatedScheduleHTML(forPrint){
  const f = collectFinalScheduleFilters();
  const days = finalScheduleDays(f).slice().sort((a,b)=>SCHOOL_DAYS.indexOf(a)-SCHOOL_DAYS.indexOf(b));
  let sections = finalScheduleMatchingSections(f).slice().sort((a,b)=>{
    const gi = GRADE_ORDER.indexOf(a.grade)-GRADE_ORDER.indexOf(b.grade);
    return gi!==0 ? gi : a.name.localeCompare(b.name);
  }).filter(sec=> days.some(d=> buildTimeline(sec, d).some(b=>b.type==="period")));
  if(f.teacherId) sections = sections.filter(sec=> days.some(d=> buildTimeline(sec, d).some(b=>b.type==="period" && b.teacherId===f.teacherId)));
  if(!sections.length) return "";
  const sy = schoolYearById(CURRENT_SCHOOL_YEAR_ID);
  const term = termById(CURRENT_TERM_ID);
  const dayLabel = days.length===1 ? DAY_FULL_NAME[days[0]]
    : `${DAY_FULL_NAME[days[0]]} – ${DAY_FULL_NAME[days[days.length-1]]}`;
  const editable = FINAL_EDIT_MODE && !forPrint;

  const generatedNote = SCHEDULE_GENERATED_AT ? `Generated ${new Date(SCHEDULE_GENERATED_AT).toLocaleString()}` : "";
  const finalizedNote = FINAL_SCHEDULE_FINALIZED_AT ? `${generatedNote?" &middot; ":""}Finalized ${new Date(FINAL_SCHEDULE_FINALIZED_AT).toLocaleString()} by ${esc(FINAL_SCHEDULE_FINALIZED_BY||"—")}` : "";

  return `<div class="fs-doc">
    <div class="fs-doc-head">
      ${SCHOOL_LOGO ? `<img class="fs-logo" src="${SCHOOL_LOGO}" alt="School logo">` : ""}
      <div class="fs-head-text">
        <div class="fs-school">${esc(SCHOOL_NAME)}</div>
        <div class="fs-meta">
          Final Classroom Schedule &middot; <b>${sy?esc(sy.label):"—"}</b> &middot; <b>${term?esc(term.name):esc(CURRENT_TERM)}</b> &middot; <b>${dayLabel}</b>
        </div>
      </div>
    </div>
    <div class="fs-doc-table-wrap">
      ${sections.map(sec=> sectionGridHtml(sec, days, editable)).join("")}
    </div>
    <div class="fs-doc-foot"><div>${sections.length} section(s) across ${days.length} day(s).</div><div>${generatedNote}${finalizedNote}</div></div>
  </div>`;
}
function renderFinalScheduleResults(){
  const f = collectFinalScheduleFilters();
  const warnEl = document.getElementById("fsTermWarning");
  if(finalScheduleOutOfContext(f)){
    warnEl.style.display = "block";
    warnEl.textContent = "No saved schedule to show for that School Year/Term combination — only the currently active School Year and Term (selected on School Year & Terms) has a generated schedule. Switch to it there first, then come back here.";
    document.getElementById("fsResults").innerHTML = "";
    return;
  }
  warnEl.style.display = "none";
  const html = buildConsolidatedScheduleHTML(false);
  document.getElementById("fsResults").innerHTML = html || `<div class="fs-empty">No saved schedule entries match these filters.</div>`;
}
function renderFinalScheduleFilters(){
  const gradeSel = document.getElementById("fsGrade");
  const prevGrade = gradeSel.value;
  gradeSel.innerHTML = `<option value="">All</option>` + GRADE_ORDER.map(g=>`<option value="${g}">${g}</option>`).join("");
  gradeSel.value = prevGrade;
  const secSel = document.getElementById("fsSection");
  function refreshSections(){
    const g = gradeSel.value;
    const prevSec = secSel.value;
    const opts = SECTIONS.filter(s=> !g || s.grade===g);
    secSel.innerHTML = `<option value="">All</option>` + opts.map(s=>`<option value="${s.id}">${s.grade} — ${esc(s.name)}${s.strand?" ("+s.strand+")":""}</option>`).join("");
    secSel.value = opts.some(s=>s.id===prevSec) ? prevSec : "";
  }
  refreshSections();
  gradeSel.onchange = ()=>{ refreshSections(); renderFinalScheduleResults(); };
  secSel.onchange = renderFinalScheduleResults;

  const sySel = document.getElementById("fsSchoolYear");
  sySel.innerHTML = SCHOOL_YEARS.map(y=>`<option value="${y.id}" ${y.id===CURRENT_SCHOOL_YEAR_ID?'selected':''}>${esc(y.label)}${y.status==='active'?' (Active)':''}</option>`).join("");
  sySel.onchange = renderFinalScheduleResults;

  const termSel = document.getElementById("fsTerm");
  termSel.innerHTML = TERMS.map(t=>`<option value="${t.id}" ${t.id===CURRENT_TERM_ID?'selected':''}>${esc(t.name)}</option>`).join("");
  termSel.onchange = renderFinalScheduleResults;

  const daySel = document.getElementById("fsDay");
  const prevDay = daySel.value;
  daySel.innerHTML = `<option value="">All</option>` + activeDays().map(d=>`<option value="${d}">${DAY_FULL_NAME[d]}</option>`).join("");
  daySel.value = activeDays().includes(prevDay) ? prevDay : "";
  daySel.onchange = renderFinalScheduleResults;

  const teacherSel = document.getElementById("fsTeacher");
  const prevTeacher = teacherSel.value;
  teacherSel.innerHTML = `<option value="">All</option>` + TEACHERS.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("");
  teacherSel.value = prevTeacher;
  teacherSel.onchange = renderFinalScheduleResults;

  const roomSel = document.getElementById("fsRoom");
  const prevRoom = roomSel.value;
  roomSel.innerHTML = `<option value="">All</option>` + ROOMS.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join("");
  roomSel.value = prevRoom;
  roomSel.onchange = renderFinalScheduleResults;
}
function renderFinalSchedulePage(){
  renderFinalScheduleFilters();
  renderFinalEditToolbar();
  renderFinalScheduleResults();
}
function applyPrintOrientation(){
  const paper = document.getElementById("fsPaperSize").value;
  const orientation = document.getElementById("fsOrientation").value;
  document.getElementById("printOrientationStyle").textContent = `@page{ size:${paper} ${orientation}; margin:12mm; }`;
}
// Prints the ENTIRE matching weekly schedule as one continuous document —
// a single table with a repeating header, never separate printouts per day.
function printAllFinalSchedules(){
  const f = collectFinalScheduleFilters();
  if(finalScheduleOutOfContext(f)){ showToast("Switch to the current School Year/Term to print its schedule.", true); return; }
  const html = buildConsolidatedScheduleHTML(true);
  if(!html){ showToast("No saved schedule entries match the current filters to print.", true); return; }
  applyPrintOrientation();
  document.getElementById("printArea").innerHTML = html;
  window.print();
}

// Exports the currently-filtered Final Classroom Schedule as a SINGLE .xlsx
// workbook (via the SheetJS library already loaded for import/export
// elsewhere in the app) — one row per scheduled block, honoring every
// active filter (Grade Level, Section, Day, Teacher, Room/Building), using
// the exact same row data as the on-screen consolidated document.
function downloadFinalScheduleExcel(){
  const f = collectFinalScheduleFilters();
  if(finalScheduleOutOfContext(f)){ showToast("Switch to the current School Year/Term to download its schedule.", true); return; }
  const sy = schoolYearById(CURRENT_SCHOOL_YEAR_ID);
  const term = termById(CURRENT_TERM_ID);
  const rows = collectFinalScheduleRows(f);
  if(!rows.length){ showToast("No saved schedule entries match the current filters.", true); return; }
  const dataRows = rows.map(r=>{
    const { day, section:sec, block:b } = r;
    const time = fmt(b.start)+" – "+fmt(b.end);
    const sectionLabel = sec.name + (sec.strand?" ("+sec.strand+")":"");
    if(b.type==="period"){
      const teacher = teacherById(b.teacherId);
      return [DAY_FULL_NAME[day]||day, time, sec.grade, sectionLabel, b.subject||"", teacher?teacher.name:"Unassigned", sectionRoomName(sec)];
    } else if(b.type==="break"){
      return [DAY_FULL_NAME[day]||day, time, sec.grade, sectionLabel, b.subtype==="pm"?"Afternoon Break":"Morning Break", "", ""];
    } else {
      return [DAY_FULL_NAME[day]||day, time, sec.grade, sectionLabel, "Lunch Break", "", ""];
    }
  });
  const aoa = [
    [SCHOOL_NAME],
    [`Final Classroom Schedule  ·  ${sy?sy.label:"—"}  ·  ${term?term.name:CURRENT_TERM}`],
    [],
    ["Day","Time","Grade Level","Section","Subject","Teacher","Classroom/Building"],
    ...dataRows
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{wch:11},{wch:20},{wch:12},{wch:18},{wch:26},{wch:22},{wch:18}];
  ws["!merges"] = [
    { s:{r:0,c:0}, e:{r:0,c:6} },
    { s:{r:1,c:0}, e:{r:1,c:6} }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Final Schedule");
  const syPart = sy ? sy.label.replace(/[^A-Za-z0-9]+/g,"-") : "SchoolYear";
  const termPart = (term?term.name:CURRENT_TERM).replace(/[^A-Za-z0-9]+/g,"-");
  XLSX.writeFile(wb, `Final-Classroom-Schedule_${syPart}_${termPart}.xlsx`);
  showToast("Final Classroom Schedule downloaded as one Excel file.");
}

function renderSettings(){
  document.getElementById("adminStart").value = ADMIN_START;
  document.getElementById("schoolNameInput").value = SCHOOL_NAME;
  renderSchoolLogoPreview();
  const tbody = document.querySelector("#settingsTable tbody");
  tbody.innerHTML = GRADE_ORDER.map(g=>{
    const c = GRADE_CONFIG[g];
    return `<tr data-grade="${g}">
      <td><b>${g}</b></td>
      <td><input type="time" value="${c.startTime}" data-field="startTime"></td>
      <td><input type="number" min="1" max="12" value="${c.periods}" data-field="periods"></td>
      <td><input type="number" min="20" max="90" value="${c.periodLen}" data-field="periodLen"></td>
      <td><input type="number" min="0" max="480" value="${c.amBreakAt}" data-field="amBreakAt"></td>
      <td><input type="number" min="5" max="30" value="${c.amBreakLen}" data-field="amBreakLen"></td>
      <td><input type="number" min="0" max="600" value="${c.lunchAt}" data-field="lunchAt"></td>
      <td><input type="number" min="20" max="120" value="${c.lunchLen}" data-field="lunchLen"></td>
      <td><input type="number" min="0" max="700" value="${c.pmBreakAt}" data-field="pmBreakAt"></td>
      <td><input type="number" min="5" max="30" value="${c.pmBreakLen}" data-field="pmBreakLen"></td>
    </tr>`;
  }).join("");
  renderScheduleSettingsPanel();
}
function collectSettingsFromForm(){
  document.querySelectorAll("#settingsTable tbody tr").forEach(row=>{
    const g = row.dataset.grade;
    const cfg = GRADE_CONFIG[g];
    row.querySelectorAll("input").forEach(inp=>{
      if(inp.dataset.field==="startTime"){ cfg.startTime = inp.value || cfg.startTime; }
      else{ cfg[inp.dataset.field] = Number(inp.value)||cfg[inp.dataset.field]; }
    });
  });
}

// Subject records for the currently-selected School Year + Term — the
// SINGLE source of truth for Schedule Settings. Deliberately does NOT fall
// back to the CURRICULUM/STRAND_SUBJECTS default templates: those are only
// ever used elsewhere as a last-resort scheduling placeholder before any
// real Subject exists, and must never leak into this admin-facing list as
// if they were actual configured subjects.
function currentTermSubjectRecords(){
  return SUBJECTS.filter(s=> s.schoolYearId===CURRENT_SCHOOL_YEAR_ID && s.termId===CURRENT_TERM_ID);
}
function fridaySubjects(){
  return currentTermSubjectRecords().filter(s=> subjectScheduleDays(s)==='friday-only');
}
// Renders the Subject Duration table (Schedule Settings). Every row is
// backed by a real Subject record for the currently-selected School Year +
// Term — nothing is shown unless it actually exists in the Subject data,
// so newly-added subjects appear automatically and deleted ones disappear
// and are never recreated. Friday-only subjects are additionally
// auto-hidden/unhidden by the Enable Friday Schedule toggle, reading its
// live (possibly-unsaved) checked state so hide/unhide happens instantly.
function renderSubjectDurationTable(){
  const tbody = document.querySelector("#subjectDurationTable tbody");
  if(!tbody) return;
  const toggle = document.getElementById("fridayToggle");
  const fridayOn = toggle ? toggle.checked : !!FRIDAY_ENABLED;
  const recordByName = {};
  currentTermSubjectRecords().forEach(s=>{ if(!recordByName[s.name]) recordByName[s.name] = s; });
  const names = Object.keys(recordByName).sort((a,b)=>a.localeCompare(b)).filter(name=>{
    const rec = recordByName[name];
    return subjectScheduleDays(rec) !== 'friday-only' || fridayOn; // Friday-only: unhide when ON, auto-hide when OFF
  });
  tbody.innerHTML = names.length ? names.map(name=>{
    const val = SUBJECT_DURATIONS[name] || "";
    const rec = recordByName[name];
    const fridayTag = subjectScheduleDays(rec)==='friday-only' ? ' <span class="tag gold">Friday Only</span>' : '';
    const actions = `<div class="row-actions">
          <button class="icon-btn" title="Edit ${esc(name)}" data-dur-edit="${rec.id}">✏️ Edit</button>
          <button class="icon-btn danger" title="Delete ${esc(name)}" data-dur-delete="${rec.id}">🗑️ Delete</button>
        </div>`;
    return `<tr data-subject="${esc(name)}">
      <td>${esc(name)}${fridayTag}</td>
      <td><input type="number" min="10" max="240" class="duration-input" placeholder="Default" value="${val}"></td>
      <td>${actions}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="3" class="empty"><b>No subjects available</b><br>Subjects will appear here once they have been added${fridayOn?'':', or once Friday-only subjects are unhidden by enabling Friday Schedule'}.</td></tr>`;
  tbody.querySelectorAll("[data-dur-edit]").forEach(b=> b.onclick = ()=> openSubjectForm(b.dataset.durEdit));
  tbody.querySelectorAll("[data-dur-delete]").forEach(b=> b.onclick = ()=> deleteSubject(b.dataset.durDelete));
}
function renderScheduleSettingsPanel(){
  const toggle = document.getElementById("fridayToggle");
  if(toggle) toggle.checked = !!FRIDAY_ENABLED;
  const shsInput = document.getElementById("shsPmStartInput");
  if(shsInput) shsInput.value = SHS_PM_START;
  renderSubjectDurationTable();
}
function collectScheduleSettingsFromForm(){
  const toggle = document.getElementById("fridayToggle");
  FRIDAY_ENABLED = !!(toggle && toggle.checked);
  const shsInput = document.getElementById("shsPmStartInput");
  if(shsInput && shsInput.value) SHS_PM_START = shsInput.value;
  document.querySelectorAll("#subjectDurationTable tbody tr[data-subject]").forEach(row=>{
    const name = row.dataset.subject;
    const inp = row.querySelector("input");
    const val = Number(inp.value);
    if(val>0) SUBJECT_DURATIONS[name] = val;
    else delete SUBJECT_DURATIONS[name];
  });
}

/* =========================================================
   7. WIRE UP EVENTS + INITIAL RENDER
   ========================================================= */
document.getElementById("teacherSearch").addEventListener("input", renderTeachers);
document.getElementById("teacherLevelFilter").addEventListener("change", renderTeachers);
document.getElementById("addTeacherBtn").addEventListener("click", ()=>openTeacherForm());
document.getElementById("addSectionBtn").addEventListener("click", ()=>openSectionForm());

document.getElementById("saveSchoolName").addEventListener("click", async ()=>{
  const name = document.getElementById("schoolNameInput").value.trim();
  if(!name){ showToast("Enter a school name.", true); return; }
  SCHOOL_NAME = name;
  await saveData();
  renderAll();
  showToast("School name saved.");
});

function renderSchoolLogoPreview(){
  const img = document.getElementById("schoolLogoPreview");
  const empty = document.getElementById("schoolLogoEmpty");
  const removeBtn = document.getElementById("removeLogoBtn");
  if(!img) return;
  if(SCHOOL_LOGO){
    img.src = SCHOOL_LOGO;
    img.style.display = "block";
    empty.style.display = "none";
    removeBtn.style.display = "inline-block";
  } else {
    img.src = "";
    img.style.display = "none";
    empty.style.display = "inline";
    removeBtn.style.display = "none";
  }
}
document.getElementById("uploadLogoBtn").addEventListener("click", ()=> document.getElementById("schoolLogoFile").click());
document.getElementById("schoolLogoFile").addEventListener("change", (e)=>{
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if(!file) return;
  if(!file.type.startsWith("image/")){ showToast("Please choose an image file.", true); return; }
  if(file.size > 2*1024*1024){ showToast("Logo image is too large — please use a file under 2MB.", true); return; }
  const reader = new FileReader();
  reader.onload = async ()=>{
    SCHOOL_LOGO = reader.result;
    renderSchoolLogoPreview();
    await saveData();
    renderAll();
    showToast("School logo uploaded.");
  };
  reader.onerror = ()=> showToast("Couldn't read that image file.", true);
  reader.readAsDataURL(file);
});
document.getElementById("removeLogoBtn").addEventListener("click", ()=>{
  openConfirm("Remove the school logo? It will no longer appear on the Final Classroom Schedule view or printouts.", async ()=>{
    SCHOOL_LOGO = "";
    renderSchoolLogoPreview();
    await saveData();
    renderAll();
    showToast("School logo removed.");
  }, "Remove Logo");
});
document.getElementById("applyStart").addEventListener("click", async ()=>{
  const base = document.getElementById("adminStart").value;
  if(!base){ showToast("Enter a base start time first.", true); return; }
  ADMIN_START = base;
  const baseMin = toMinutes(base);
  GRADE_ORDER.forEach((g,i)=>{ GRADE_CONFIG[g].startTime = fmt24(baseMin + i*15); });
  await saveData();
  renderAll();
  showToast("Class start times staggered by 15 minutes per grade level from the base time.");
});
document.getElementById("saveSettings").addEventListener("click", async ()=>{
  collectSettingsFromForm();
  await saveData();
  renderAll();
  showToast("Bell schedule settings saved.");
});
document.getElementById("fridayToggle").addEventListener("change", renderSubjectDurationTable);
document.getElementById("saveScheduleSettings").addEventListener("click", async ()=>{
  collectScheduleSettingsFromForm();
  await saveData();
  renderAll();
  showToast("Schedule settings saved. Use Regenerate Schedule to apply the changes to the auto-generated timetable.");
});
document.getElementById("regenerateScheduleBtn").addEventListener("click", ()=>{
  collectScheduleSettingsFromForm();
  saveData();
  runGenerateSchedule();
});
document.getElementById("resetSettings").addEventListener("click", ()=>{
  openConfirm("Reset the school start time and every grade level's bell schedule back to DepEd defaults? Faculty, sections, and subjects are not affected.", async ()=>{
    GRADE_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    ADMIN_START = "07:30";
    generateSchedule();
    await saveData();
    renderSettings();
    renderAll();
    showToast("Bell schedule reset to DepEd defaults and the teaching schedule was regenerated.");
  }, "Reset");
});
document.getElementById("factoryResetBtn").addEventListener("click", ()=>{
  openConfirm("Erase every teacher, section, subject, and room you've added and reset to a clean, empty state? This cannot be undone.", async ()=>{
    TEACHERS_ALL = JSON.parse(JSON.stringify(SEED_TEACHERS));
    SECTIONS_ALL = JSON.parse(JSON.stringify(SEED_SECTIONS));
    ROOMS.length = 0; ROOMS.push(...JSON.parse(JSON.stringify(SEED_ROOMS)));
    roomCounter = 1;
    refreshOwnedViews();
    GRADE_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    ADMIN_START = "07:30";
    teacherCounter = 1; sectionCounter = 1;
    selectedTeacher = null;

    SCHOOL_YEARS.length = 0;
    SCHOOL_YEARS.push(
      { id:"SY1", label:"2025–2026", status:"archived" },
      { id:"SY2", label:"2026–2027", status:"active" },
      { id:"SY3", label:"2027–2028", status:"upcoming" }
    );
    schoolYearCounter = 4;
    CURRENT_SCHOOL_YEAR_ID = activeSchoolYear().id;
    TERMS.length = 0;
    TERMS.push({ id:"TM1", name:"1st Term" }, { id:"TM2", name:"2nd Term" }, { id:"TM3", name:"3rd Term" });
    termIdCounter = 4;
    syncTermOptions();
    CURRENT_TERM_ID = TERMS[0].id;
    CURRENT_TERM = TERMS[0].name;
    SUBJECTS.length = 0;
    subjectIdCounter = 1;

    generateSchedule();
    await saveData();
    renderSettings();
    initSubjectFilters();
    renderAll();
    showToast("All data erased. The app is back to a clean, empty state.");
  }, "Erase & Reset");
});

/* =========================================================
   BULK IMPORT (Excel/CSV) — generic engine used by Teachers,
   Sections, and Subjects. Each importer:
   1) offers a downloadable template (.csv) with the exact
      required/optional columns for that feature,
   2) reads an uploaded .xlsx/.xls/.csv file via SheetJS,
   3) validates every row and shows a preview (valid rows
      that will be imported + row-by-row errors to fix),
   4) on confirm, creates the records the same way the
      existing "Add" modals do (so IDs, counters, IndexedDB
      persistence and cloud sync all stay consistent).
   ========================================================= */
function downloadCsvTemplate(filename, headers, sampleRows){
  const esc = v => {
    v = (v===undefined||v===null) ? "" : String(v);
    return /[",\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v;
  };
  const lines = [headers.map(esc).join(",")];
  (sampleRows||[]).forEach(row=> lines.push(row.map(esc).join(",")));
  const blob = new Blob(["\uFEFF"+lines.join("\r\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// Reads a File (.csv, .xlsx, .xls) and resolves to an array of row objects
// keyed by a normalized (lowercased, trimmed) version of the header cells.
function readSpreadsheetFile(file){
  return new Promise((resolve, reject)=>{
    const name = (file.name||"").toLowerCase();
    const reader = new FileReader();
    reader.onerror = ()=> reject(new Error("Could not read the file."));
    if(name.endsWith(".csv")){
      reader.onload = ()=>{
        try{
          const wb = XLSX.read(reader.result, {type:"string"});
          resolve(sheetToRows(wb));
        }catch(e){ reject(e); }
      };
      reader.readAsText(file);
    } else {
      reader.onload = ()=>{
        try{
          const wb = XLSX.read(reader.result, {type:"array"});
          resolve(sheetToRows(wb));
        }catch(e){ reject(e); }
      };
      reader.readAsArrayBuffer(file);
    }
  });
}
function sheetToRows(workbook){
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, {defval:""});
  return raw.map(r=>{
    const norm = {};
    Object.keys(r).forEach(k=>{ norm[k.trim().toLowerCase()] = typeof r[k]==="string" ? r[k].trim() : r[k]; });
    return norm;
  });
}

// Renders the shared "Import from Excel/CSV" modal. `config` describes the
// feature-specific parts:
//   title, hint, fileInputId
//   templateFilename, templateHeaders, templateSample
//   parseRow(rawRow, rowIndex) -> {ok:true, record, display} | {ok:false, error}
//   commit(records) -> async, actually creates the records
//   entityLabel: e.g. "teacher(s)"
function openBulkImportModal(config){
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="bulkImportBackdrop">
      <div class="modal-box" style="max-width:640px;">
        <div class="modal-head"><h3>${config.title}</h3><button class="modal-close" id="biClose">&times;</button></div>
        <div class="modal-body">
          <div class="hint" style="margin-bottom:10px;">${config.hint}</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
            <button type="button" class="btn ghost" id="biTemplateBtn">⬇ Download Template (.csv)</button>
            <button type="button" class="btn gold" id="biChooseFileBtn">Choose File…</button>
            <span class="hint" id="biFileName" style="align-self:center;"></span>
          </div>
          <div id="biPreviewWrap" style="display:none;">
            <div id="biSummary" style="font-size:13px;font-weight:600;margin-bottom:8px;"></div>
            <div style="max-height:320px; overflow:auto; border:1px solid var(--line); border-radius:8px;">
              <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
                <thead id="biTableHead"></thead>
                <tbody id="biTableBody"></tbody>
              </table>
            </div>
          </div>
          <div class="err-text" id="biErr"></div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="biCancel">Cancel</button>
          <button class="btn gold" id="biImportBtn" disabled>Import 0 ${config.entityLabel}</button>
        </div>
      </div>
    </div>`;
  const close = ()=> closeModal();
  document.getElementById("biClose").onclick = close;
  document.getElementById("biCancel").onclick = close;
  document.getElementById("bulkImportBackdrop").addEventListener("click", e=>{ if(e.target.id==="bulkImportBackdrop") close(); });
  document.getElementById("biTemplateBtn").onclick = ()=> downloadCsvTemplate(config.templateFilename, config.templateHeaders, config.templateSample);

  let validRecords = [];
  const hiddenInput = document.getElementById(config.fileInputId);
  document.getElementById("biChooseFileBtn").onclick = ()=> hiddenInput.click();
  hiddenInput.onchange = async (e)=>{
    const file = e.target.files[0];
    e.target.value = "";
    if(!file) return;
    document.getElementById("biErr").textContent = "";
    document.getElementById("biFileName").textContent = file.name;
    let rows;
    try{
      rows = await readSpreadsheetFile(file);
    }catch(err){
      console.error("Bulk import read failed:", err);
      document.getElementById("biErr").textContent = "Could not read that file. Please upload a .xlsx, .xls, or .csv file that matches the template.";
      return;
    }
    if(!rows.length){
      document.getElementById("biErr").textContent = "That file doesn't contain any data rows.";
      return;
    }
    // Structural check: every required column must be present in the file's
    // header row before any row is parsed — a missing required column is
    // reported clearly and the import is not attempted, rather than silently
    // parsing a partial/wrong schema (see CSV Import Validation).
    if(config.requiredColumns){
      const headerKeys = new Set(Object.keys(rows[0]||{}));
      const missing = config.requiredColumns.filter(rc=> !rc.keys.some(k=>headerKeys.has(k)));
      if(missing.length){
        document.getElementById("biErr").textContent = `The CSV file is missing the required column${missing.length>1?'s':''}: ${missing.map(m=>m.label).join(", ")}.`;
        document.getElementById("biPreviewWrap").style.display = "none";
        document.getElementById("biImportBtn").disabled = true;
        return;
      }
    }
    const results = rows.map((row,i)=> config.parseRow(row, i));
    const rawValid = results.filter(r=>r.ok).map(r=>r.record);
    const displayRows = results.map(r=> r.ok ? r.display : null);
    const errorRows = results.map((r,i)=> r.ok ? null : {row:i+2, error:r.error}); // +2: header row + 1-index
    // finalizeRecords (optional): groups/aggregates the raw per-row records
    // into the records actually passed to commit() — e.g. the Teacher Load
    // importer has one CSV row per Teacher+Grade combination, but each
    // distinct teacher must become (or update) exactly one Teacher record.
    // The on-screen preview below still shows one line per CSV row either way.
    validRecords = config.finalizeRecords ? config.finalizeRecords(rawValid) : rawValid;
    const okCount = rawValid.length, errCount = results.length - okCount;
    document.getElementById("biPreviewWrap").style.display = "block";
    document.getElementById("biSummary").innerHTML = errCount
      ? `<span style="color:var(--maroon,#8C2F39);">${okCount} row(s) ready to import, ${errCount} row(s) have errors and will be skipped.</span>`
      : `<span style="color:#2E7D46;">${okCount} row(s) ready to import.</span>`;
    document.getElementById("biTableHead").innerHTML = `<tr>${config.previewColumns.map(c=>`<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);">${c}</th>`).join("")}<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);">Status</th></tr>`;
    document.getElementById("biTableBody").innerHTML = results.map((r,i)=>{
      const cells = r.ok ? r.display : (errorRows[i] ? config.errorRowCells(rows[i]) : config.previewColumns.map(()=>""));
      const status = r.ok ? `<span style="color:#2E7D46;">OK</span>` : `<span style="color:var(--maroon,#8C2F39);">Row ${i+2}: ${r.error}</span>`;
      return `<tr style="${r.ok?'':'background:#FBEAEA;'}">${cells.map(c=>`<td style="padding:6px 8px;border-bottom:1px solid var(--line);">${c}</td>`).join("")}<td style="padding:6px 8px;border-bottom:1px solid var(--line);">${status}</td></tr>`;
    }).join("");
    const importBtn = document.getElementById("biImportBtn");
    importBtn.textContent = `Import ${validRecords.length} ${config.entityLabel}`;
    importBtn.disabled = validRecords.length===0;
  };
  document.getElementById("biImportBtn").onclick = async ()=>{
    if(!validRecords.length) return;
    await config.commit(validRecords);
    close();
    renderAll();
    showToast(`${validRecords.length} ${config.entityLabel} imported.`);
  };
}

/* ---- Teachers bulk import ----
   Schema note: one CSV row = one Teacher + Grade Level assignment (so a
   teacher who teaches 2 grade levels appears as 2 rows sharing the same
   Teacher Name/Employee ID). This exactly matches the Regular Class
   Loads / Special Program Loads fields the Teacher form itself uses —
   Total is never a CSV column, it's always computed as their sum. Rows
   for the same teacher are grouped back into one record (or merged into
   an existing teacher's gradeLoads, by Employee/Teacher ID when given,
   else Name+Role) before anything is created. */
document.getElementById("importTeachersBtn").addEventListener("click", ()=>{
  const wholeNonNegative = v => v!==undefined && v!==null && String(v).trim()!=="" && /^\d+$/.test(String(v).trim());
  const splitList = v => (v||"").toString().split(/[;,]/).map(s=>s.trim()).filter(Boolean);
  openBulkImportModal({
    title: "Import Teacher Loads from Excel/CSV",
    hint: "One row per Teacher + Grade Level. Required columns: Teacher Name, Role/Position, Grade Level, Regular Class Loads, Special Program Loads (whole numbers, 0 or greater — Special Program Loads = 0 is normal and won't produce an error). Special Program Subject is required whenever Special Program Loads is greater than 0 (any new subject name is added to the Special Program Subject list automatically). Optional: Employee/Teacher ID, Employment Status, Specialization. A teacher who teaches more than one grade level should have one row per grade; Total Loads is always calculated as Regular + Special, never a column you fill in.",
    fileInputId: "teacherImportFile",
    templateFilename: "atlas-teacher-loads-template.csv",
    templateHeaders: ["Teacher Name","Role/Position","Employee/Teacher ID","Grade Level","Regular Class Loads","Special Program Loads","Special Program Subject","Employment Status","Specialization"],
    templateSample: [
      ["Juan Dela Cruz","JHS Mathematics Teacher","T-2026-014","Grade 7","5","2","ICT","Full-time","Math"],
      ["Juan Dela Cruz","JHS Mathematics Teacher","T-2026-014","Grade 8","4","2","Research","Full-time","Math"],
      ["Maria Santos","SHS Science Teacher","T-2026-021","Grade 11","6","0","","Part-time","Science"]
    ],
    requiredColumns: [
      {label:"Teacher Name", keys:["teacher name","full name","name"]},
      {label:"Role/Position", keys:["role/position","role","position"]},
      {label:"Grade Level", keys:["grade level","grade"]},
      {label:"Regular Class Loads", keys:["regular class loads","regular load(s)","regular loads","regular"]},
      {label:"Special Program Loads", keys:["special program loads","special program load(s)","special"]}
    ],
    previewColumns: ["Teacher","Grade Level","Regular Loads","Special Program Loads","Special Program Subject","Total"],
    entityLabel: "teacher(s)",
    errorRowCells: row => [
      row["teacher name"]||row["full name"]||row["name"]||"",
      row["grade level"]||row["grade"]||"",
      row["regular class loads"]!==undefined?row["regular class loads"]:(row["regular"]||""),
      row["special program loads"]!==undefined?row["special program loads"]:(row["special"]||""),
      row["special program subject"]||"",
      ""
    ],
    parseRow(row){
      const name = (row["teacher name"]||row["full name"]||row["name"]||"").toString().trim();
      const role = (row["role/position"]||row["role"]||row["position"]||"").toString().trim();
      const employeeId = (row["employee/teacher id"]||row["employee id"]||row["teacher id"]||"").toString().trim();
      const gradeRaw = (row["grade level"]||row["grade"]||"").toString().trim();
      const regRaw = row["regular class loads"]!==undefined ? row["regular class loads"] : (row["regular load(s)"]!==undefined?row["regular load(s)"]:(row["regular loads"]!==undefined?row["regular loads"]:row["regular"]));
      const specRaw = row["special program loads"]!==undefined ? row["special program loads"] : (row["special program load(s)"]!==undefined?row["special program load(s)"]:row["special"]);
      const specialSubject = (row["special program subject"]||row["special program subject(s)"]||"").toString().trim();

      if(!name) return {ok:false, error:"Missing Teacher Name."};
      if(!role) return {ok:false, error:"Missing Role/Position."};
      if(!gradeRaw) return {ok:false, error:"Missing Grade Level."};
      const grade = GRADE_ORDER.find(g=>g.toLowerCase()===gradeRaw.toLowerCase());
      if(!grade) return {ok:false, error:`Unrecognized Grade Level "${gradeRaw}". Configured Grade Levels: ${GRADE_ORDER.join(", ")}.`};
      if(!wholeNonNegative(regRaw)) return {ok:false, error:`Regular Class Loads must be a whole number, 0 or greater (got "${regRaw===undefined?"":regRaw}").`};
      if(!wholeNonNegative(specRaw)) return {ok:false, error:`Special Program Loads must be a whole number, 0 or greater (got "${specRaw===undefined?"":specRaw}").`};
      const regular = Number(regRaw), special = Number(specRaw);
      if(regular+special < 1) return {ok:false, error:`Regular Class Loads + Special Program Loads must total at least 1 for ${grade}.`};
      if(special>0 && !specialSubject) return {ok:false, error:`Special Program Subject is required for ${grade} since Special Program Loads is greater than 0.`};

      let status = (row["employment status"]||row["status"]||"Full-time").toString().trim();
      status = /^part-?time$/i.test(status) ? "Part-time" : "Full-time";
      const specializations = splitList(row["specialization"]||row["specializations"]||row["learning area"]);
      return {
        ok:true,
        record: { name, role, employeeId, status, specializations, grade, regular, special, specialSubject: special>0?specialSubject:"" },
        display: [name+(employeeId?` (${employeeId})`:""), grade, regular, special, special>0?specialSubject:"—", regular+special]
      };
    },
    // Groups the per-(teacher,grade) rows above into one entry per distinct
    // teacher — matched to an EXISTING teacher (by Employee/Teacher ID when
    // given, else Name+Role, same as the manual duplicate check) so a
    // re-imported/updated CSV merges into that teacher's gradeLoads instead
    // of erroring or creating a duplicate; otherwise a new teacher is queued.
    finalizeRecords(rawValid){
      const groups = new Map();
      rawValid.forEach(r=>{
        const key = r.employeeId ? "id::"+r.employeeId.toLowerCase() : "name::"+r.name.toLowerCase()+"::"+r.role.toLowerCase();
        if(!groups.has(key)) groups.set(key, { name:r.name, role:r.role, employeeId:r.employeeId, status:r.status, specializations:r.specializations, gradeLoads:{} });
        groups.get(key).gradeLoads[r.grade] = { regular:r.regular, special:r.special, specialSubject:r.specialSubject }; // last row for a repeated grade wins
      });
      const entries = [];
      groups.forEach(g=>{
        const existing = g.employeeId
          ? TEACHERS.find(t=> (t.employeeId||"").toLowerCase()===g.employeeId.toLowerCase())
          : TEACHERS.find(t=> t.name.toLowerCase()===g.name.toLowerCase() && t.role.toLowerCase()===g.role.toLowerCase());
        if(existing){
          entries.push({ isNew:false, existingId: existing.id, mergedGradeLoads: g.gradeLoads });
        } else {
          const tiers = GRADE_ORDER.filter(gr=>gradeLoadTotal(g.gradeLoads[gr])>0);
          entries.push({ isNew:true, record: { id: makeId(), name:g.name, role:g.role, employeeId:g.employeeId||"", tiers, gradeLoads:g.gradeLoads, gradeShifts:{}, status:g.status, specializations:g.specializations, subjectsCanTeach:[], maxTeachingHours:null, createdBy: currentAdminId() } });
        }
      });
      return entries;
    },
    async commit(entries){
      entries.forEach(e=>{
        const loads = e.isNew ? e.record.gradeLoads : e.mergedGradeLoads;
        Object.values(loads||{}).forEach(gl=>{
          if(gl.specialSubject && !SPECIAL_PROGRAM_SUBJECTS.some(s=>s.toLowerCase()===gl.specialSubject.toLowerCase())){
            SPECIAL_PROGRAM_SUBJECTS.push(gl.specialSubject);
          }
        });
        if(e.isNew){ TEACHERS_ALL.push(e.record); return; }
        const t = TEACHERS_ALL.find(x=>x.id===e.existingId);
        if(!t) return;
        t.gradeLoads = t.gradeLoads || {};
        Object.assign(t.gradeLoads, e.mergedGradeLoads);
        t.tiers = GRADE_ORDER.filter(g=>gradeLoadTotal(t.gradeLoads[g])>0);
      });
      refreshOwnedViews();
      await saveData();
      for(const e of entries){
        const rec = e.isNew ? e.record : TEACHERS_ALL.find(x=>x.id===e.existingId);
        if(rec) await persistEntityChange("teachers", rec, e.isNew ? "CREATE" : "UPDATE");
      }
    }
  });
});

/* ---- Sections bulk import ---- */
document.getElementById("importSectionsBtn").addEventListener("click", ()=>{
  openBulkImportModal({
    title: "Import Sections from Excel/CSV",
    hint: "Upload a spreadsheet with one row per section. Required columns: Grade Level, Section Name. Optional: Track (Sr. High only — TechPro, ACADS, or Both), Room/Building (must match an existing room name exactly, or leave blank).",
    fileInputId: "sectionImportFile",
    templateFilename: "atlas-sections-template.csv",
    templateHeaders: ["Grade Level","Section Name","Track","Room/Building"],
    templateSample: [
      ["Grade 7","Narra","",""],
      ["Grade 11","STEM-A","TechPro","Room 204"]
    ],
    previewColumns: ["Grade Level","Section Name","Track","Room/Building"],
    entityLabel: "section(s)",
    errorRowCells: row => [row["grade level"]||"", row["section name"]||row["section"]||"", row["track"]||"", row["room/building"]||row["room"]||""],
    parseRow(row){
      const gradeRaw = (row["grade level"]||row["grade"]||"").toString().trim();
      const name = (row["section name"]||row["section"]||"").toString().trim();
      const grade = GRADE_ORDER.find(g=>g.toLowerCase()===gradeRaw.toLowerCase());
      if(!gradeRaw) return {ok:false, error:"Missing Grade Level."};
      if(!grade) return {ok:false, error:`Unrecognized grade level "${gradeRaw}". Use values like "Grade 7".`};
      if(!name) return {ok:false, error:"Missing Section Name."};
      const isShs = grade==="Grade 11"||grade==="Grade 12";
      let strand = (row["track"]||row["track/strand"]||"").toString().trim();
      if(strand && !isShs) strand = "";
      if(strand && !TRACK_LIST.some(t=>t.toLowerCase()===strand.toLowerCase())){
        return {ok:false, error:`Unrecognized track "${strand}". Use TechPro, ACADS, or Both.`};
      }
      strand = strand ? TRACK_LIST.find(t=>t.toLowerCase()===strand.toLowerCase()) : "";
      const roomName = (row["room/building"]||row["room"]||"").toString().trim();
      let roomId = "";
      if(roomName){
        const room = ROOMS.find(r=>r.name.toLowerCase()===roomName.toLowerCase());
        if(!room) return {ok:false, error:`Room "${roomName}" was not found. Add it first on the Sections page, or leave this blank.`};
        roomId = room.id;
      }
      if(SECTIONS.some(s=>s.grade===grade && s.name.toLowerCase()===name.toLowerCase())){
        return {ok:false, error:`A section named "${name}" already exists in ${grade}.`};
      }
      const sec = { id: makeId(), grade, name, tier:tierOf(grade), subTier:subTierOf(grade), createdBy: currentAdminId() };
      if(strand) sec.strand = strand;
      if(roomId) sec.roomId = roomId;
      return { ok:true, record: sec, display:[grade, name, strand||"—", roomName||"—"] };
    },
    async commit(records){
      records.forEach(r=> SECTIONS_ALL.push(r));
      refreshOwnedViews();
      await saveData();
      for(const r of records) await persistEntityChange("sections", r, "CREATE");
    }
  });
});

/* ---- Subjects bulk import ---- */
document.getElementById("importSubjectsBtn").addEventListener("click", ()=>{
  const f = currentSubjectFilter();
  openBulkImportModal({
    title: "Import Subjects from Excel/CSV",
    hint: `Upload a spreadsheet with one row per subject. Required columns: Subject Name, Grade Level. Optional: Track/Strand (Sr. High only), Term, School Year, Units, Hours/Week, Subject Type (Core, Specialized, or Elective), Friday Only (Yes/No — excludes the subject from the Mon–Thu rotation so it only appears in Friday's schedule). Rows that leave Term/School Year blank use the currently selected filter (${(termById(f.term)||{}).name||"current term"} — S.Y. ${(schoolYearById(f.sy)||{}).label||"current"}).`,
    fileInputId: "subjectImportFile",
    templateFilename: "atlas-subjects-template.csv",
    templateHeaders: ["Subject Name","Grade Level","Track/Strand","Term","School Year","Units","Hours/Week","Subject Type","Friday Only"],
    templateSample: [
      ["Mathematics","Grade 7","","","","1","4","Core","No"],
      ["Research 1","Grade 11","TechPro","","","1","2","Specialized","No"]
    ],
    previewColumns: ["Subject Name","Grade Level","Track/Strand","Term","School Year","Units","Hrs/Wk","Type","Friday Only"],
    entityLabel: "subject(s)",
    errorRowCells: row => [row["subject name"]||row["name"]||"", row["grade level"]||"", row["track/strand"]||row["track"]||"", row["term"]||"", row["school year"]||"", row["units"]||"", row["hours/week"]||"", row["subject type"]||row["type"]||"", row["friday only"]||""],
    parseRow(row){
      const name = (row["subject name"]||row["name"]||row["subject"]||"").toString().trim();
      const gradeRaw = (row["grade level"]||row["grade"]||"").toString().trim();
      const grade = GRADE_ORDER.find(g=>g.toLowerCase()===gradeRaw.toLowerCase());
      if(!name) return {ok:false, error:"Missing Subject Name."};
      if(!gradeRaw) return {ok:false, error:"Missing Grade Level."};
      if(!grade) return {ok:false, error:`Unrecognized grade level "${gradeRaw}". Use values like "Grade 7".`};
      const isShs = grade==="Grade 11"||grade==="Grade 12";
      let strand = (row["track/strand"]||row["track"]||"").toString().trim();
      if(strand && !isShs) strand = "";
      if(strand && !TRACK_LIST.some(t=>t.toLowerCase()===strand.toLowerCase())){
        return {ok:false, error:`Unrecognized track "${strand}". Use TechPro, ACADS, or Both.`};
      }
      strand = strand ? TRACK_LIST.find(t=>t.toLowerCase()===strand.toLowerCase()) : "";
      const termRaw = (row["term"]||"").toString().trim();
      const term = termRaw ? TERMS.find(t=>t.name.toLowerCase()===termRaw.toLowerCase()) : termById(f.term);
      if(termRaw && !term) return {ok:false, error:`Unrecognized term "${termRaw}".`};
      const syRaw = (row["school year"]||"").toString().trim();
      const sy = syRaw ? SCHOOL_YEARS.find(y=>y.label.toLowerCase()===syRaw.toLowerCase()) : schoolYearById(f.sy);
      if(syRaw && !sy) return {ok:false, error:`Unrecognized school year "${syRaw}".`};
      const units = row["units"]!==undefined && row["units"]!=="" ? Number(row["units"]) : 1;
      const hoursPerWeek = row["hours/week"]!==undefined && row["hours/week"]!=="" ? Number(row["hours/week"]) : 4;
      if(isNaN(units) || isNaN(hoursPerWeek)) return {ok:false, error:"Units and Hours/Week must be numbers."};
      let type = (row["subject type"]||row["type"]||"Core").toString().trim();
      type = SUBJECT_TYPES.find(t=>t.toLowerCase()===type.toLowerCase()) || "Core";
      const fridayOnlyRaw = (row["friday only"]||"").toString().trim().toLowerCase();
      const fridayOnly = ["yes","y","true","friday","friday only"].includes(fridayOnlyRaw);
      if(subjectDuplicate(sy.id, term.id, grade, name, strand)){
        return {ok:false, error:`A subject named "${name}" already exists for ${grade} – ${term.name} – S.Y. ${sy.label}.`};
      }
      const code = makeSubjectCode(name, grade);
      const record = { id: makeId(), schoolYearId:sy.id, termId:term.id, grade, strand, name, code, type, units, hoursPerWeek, status:"Active", fridayOnly };
      return { ok:true, record, display:[name, grade, strand||"—", term.name, sy.label, units, hoursPerWeek, type, fridayOnly?"Yes":"No"] };
    },
    async commit(records){
      records.forEach(r=> SUBJECTS.push(r));
      await saveData();
      for(const r of records) await persistEntityChange("subjects", r, "CREATE");
    }
  });
});

function renderAll(){
  renderTopStart();
  renderTopTerm();
  renderTopSchoolYear();
  renderDashboard();
  renderSchoolYears();
  renderTerms();
  renderTeachers();
  renderLearningAreasPage();
  renderSubjects();
  renderSections();
  renderScheduleSelectors();
  renderScheduleTable();
  if(document.getElementById("page-finalschedule") && document.getElementById("page-finalschedule").classList.contains("active")) renderFinalSchedulePage();
  renderSettings();
  renderConflicts();
  renderReports();
  renderDatabase();
  renderSyncCenter();
}

function validateFullSchedule(){
  const problems = [];
  const seen = new Set();
  SECTIONS.forEach(sec=>{
    activeDays().forEach(day=>{
      buildTimeline(sec, day).filter(b=>b.type==="period").forEach(b=>{
        const probs = checkScheduleConflicts({ sectionId:sec.id, day, start:b.start, end:b.end, teacherId:b.teacherId, subject:b.subject, excludeKey:b.periodIdx, excludeExtraId:b.extraId });
        probs.forEach(p=>{ if(!seen.has(p)){ seen.add(p); problems.push(p); } });
      });
    });
  });
  return problems;
}
// Full pre-save Validation Report: re-scans the schedule exactly as it
// currently stands (catching anything introduced by a manual edit, not
// just what the last Auto-Generate/Auto-Fix run recorded) for hard
// double-booking conflicts, and combines that with any still-open conflict
// already tracked on the Schedule Conflicts page (Program/Teacher-Shift/
// AM-PM-Shift/Teaching-Load issues that haven't yet produced a literal
// double-booking). Never mutates the schedule — purely a read-only report.
function scheduleValidationReport(){
  const hardProblems = validateFullSchedule();
  const openConflicts = SCHEDULE_CONFLICTS.filter(c=>c.status==="OPEN");
  let status;
  if(hardProblems.length===0 && openConflicts.length===0) status = { level:"ok", icon:"✅", label:"No Conflicts Found" };
  else if(hardProblems.length===0) status = { level:"warn", icon:"⚠️", label:`${openConflicts.length} Warning${openConflicts.length===1?'':'s'} Found` };
  else status = { level:"error", icon:"❌", label:`${hardProblems.length} Conflict${hardProblems.length===1?'':'s'} Found` };
  return { status, hardProblems, openConflicts };
}
document.getElementById("validateScheduleBtn").addEventListener("click", ()=>{
  const { status, hardProblems, openConflicts } = scheduleValidationReport();
  const badgeColor = status.level==="ok" ? "green" : status.level==="warn" ? "gold" : "maroon";
  const hardList = hardProblems.slice(0,6).map(p=>`<li>${esc(p)}</li>`).join("") + (hardProblems.length>6 ? `<li>…and ${hardProblems.length-6} more.</li>` : "");
  const warnList = openConflicts.slice(0,6).map(c=>`<li><b>${esc(conflictTypeLabel(c))}:</b> ${esc(c.message)}</li>`).join("") + (openConflicts.length>6 ? `<li>…and ${openConflicts.length-6} more.</li>` : "");
  const body = `
    <div style="margin-bottom:10px;"><span class="tag ${badgeColor}" style="font-size:13px;padding:4px 10px;">${status.icon} ${esc(status.label)}</span></div>
    ${hardProblems.length ? `<div style="font-weight:700;margin:8px 0 2px;">Double-Booking Conflicts (Teacher / Section / Room)</div><ul style="margin:0 0 8px;padding-left:18px;text-align:left;">${hardList}</ul>` : ''}
    ${openConflicts.length ? `<div style="font-weight:700;margin:8px 0 2px;">Other Open Conflicts (Program / Teacher Shift / AM-PM Shift / Teaching Load)</div><ul style="margin:0;padding-left:18px;text-align:left;">${warnList}</ul>` : ''}
    ${!hardProblems.length && !openConflicts.length ? `<div class="hint">Every teacher, section, room, and AM/PM/Program constraint checks out — this schedule is safe to publish or export.</div>` : ''}
  `;
  if(status.level==="ok"){ showToast("Schedule validated — no teacher, section, room, program, or AM/PM shift conflicts found."); return; }
  openConfirm(body, ()=>{ navigateTo("conflicts"); }, "View Conflicts");
});
document.getElementById("genScheduleBtnTeachers").addEventListener("click", runGenerateSchedule);
document.getElementById("genScheduleBtnSchedule").addEventListener("click", runGenerateSchedule);
document.getElementById("addSchedEntryBtn").addEventListener("click", ()=>{
  const secId = document.getElementById("schedSection").value;
  const section = SECTIONS.find(s=>s.id===secId);
  if(!section){ showToast("Select a section first.", true); return; }
  openScheduleEntryModal(secId, SELECTED_SCHED_DAY, null, null);
});
document.getElementById("autoFixBtnSchedule").addEventListener("click", runAutoFixConflicts);
document.getElementById("fsPrintAllBtn").addEventListener("click", printAllFinalSchedules);
document.getElementById("fsDownloadExcelBtn").addEventListener("click", downloadFinalScheduleExcel);
document.getElementById("fsPaperSize").addEventListener("change", applyPrintOrientation);
document.getElementById("fsOrientation").addEventListener("change", applyPrintOrientation);
document.getElementById("fsEditBtn").addEventListener("click", ()=>{
  openConfirm("This is a Final Classroom Schedule. Are you sure you want to edit it?", startFinalEditSession, "Edit Final Schedule");
});
document.getElementById("fsAddEntryBtn").addEventListener("click", openAddFinalEntryPicker);
document.getElementById("fsRevalidateBtn").addEventListener("click", revalidateFinalSchedule);
document.getElementById("fsSaveChangesBtn").addEventListener("click", ()=>saveFinalScheduleChanges(false));
document.getElementById("fsCancelEditBtn").addEventListener("click", cancelFinalEditMode);
document.getElementById("fsSaveFinalizeBtn").addEventListener("click", ()=>saveFinalScheduleChanges(true));
document.getElementById("fsAuditBtn").addEventListener("click", openFinalAuditModal);

async function initApp(){
  let loaded = false;
  try{
    loaded = await loadData();
  }catch(e){
    // A saved snapshot that's corrupted or from an incompatible older
    // version could otherwise throw here and leave the app stuck on a
    // blank screen. Log it, warn the user once, and continue with an
    // empty in-memory state instead of failing the whole boot.
    console.error("initApp: loadData threw, continuing with an empty state:", e);
    showToast("Saved data couldn't be read — starting from a clean, empty state instead.", true);
    loaded = false;
  }
  // Claim any pre-existing/unowned Teacher & Section records for this admin
  // (see claimLegacyOwnership() — a one-time migration for data created
  // before per-admin ownership existed). No-op once every record has an
  // owner.
  if(claimLegacyOwnership()) refreshOwnedViews();
  if(!loaded || Object.keys(SCHEDULE_ASSIGNMENTS).length===0){
    generateSchedule(); // first run (or nothing generated yet): produce an initial conflict-free schedule
  }
  initSubjectFilters();
  await saveData();

  // ---- Offline-first data layer + cloud sync engine startup ----------
  // Runs after the main blob load/save above so the in-memory arrays
  // (TEACHERS/SECTIONS/SUBJECTS) are populated before anything is queued
  // for the cloud. Every step here is wrapped so a failure (e.g. this
  // browser has IndexedDB disabled) degrades to offline-blob-only mode
  // instead of blocking the rest of the app from loading.
  try{
    await loadCloudConfig();
    await loadAutoSyncFlag();
    await migrateExistingDataIntoOfflineLayer();
    await refreshPendingSyncSet();
    setConnectionState(navigator.onLine ? (CLOUD_CONFIG.enabled ? "syncing" : "offline") : "offline");
    if(navigator.onLine && CLOUD_CONFIG.enabled) attemptSync();
  }catch(e){
    console.error("initApp: offline/sync layer failed to start — continuing in blob-only offline mode:", e);
    setConnectionState("offline");
  }

  try{
    renderAll();
  }catch(e){
    console.error("initApp: renderAll failed:", e);
    showToast("Something went wrong rendering the app. Check the console for details.", true);
  }
}

/* =========================================================
   0. AUTHENTICATION (Firebase Authentication)
   Real accounts: Firebase Authentication (email/password and Google
   Sign-In) is the identity provider, and each user's role lives in the
   users/{uid} Firestore document — never trusted from anything the
   client sends. See firestoreAuthHeader() above: every Firestore REST
   call already attaches the signed-in user's ID token so Firestore
   Security Rules can check request.auth on the server side.

   DepEd SSO: Google Sign-In is restricted to ALLOWED_GOOGLE_DOMAIN
   below. Set this to your division's real Google Workspace domain
   (e.g. "deped.gov.ph" or a school/division-specific domain) once you
   know it — until then Google sign-in is deliberately refused with a
   clear message rather than silently accepting any Google account.
   ========================================================= */
const GOOGLE_DOMAIN_PLACEHOLDER = "REPLACE_WITH_YOUR_DEPED_DOMAIN";
let ALLOWED_GOOGLE_DOMAIN = "deped.gov.ph"; // set to your DepEd/division Google Workspace domain
function buildGoogleProvider(){
  const provider = new firebase.auth.GoogleAuthProvider();
  if(ALLOWED_GOOGLE_DOMAIN !== GOOGLE_DOMAIN_PLACEHOLDER){
    provider.setCustomParameters({ hd: ALLOWED_GOOGLE_DOMAIN }); // hints Google's account chooser — not itself a security control
  }
  return provider;
}

let AUTH_SESSION = null; // { id (Firebase uid), uid, name, email, role }
let WELCOME_TOAST_MESSAGE = null;

function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

// ---- users/{uid} Firestore profile doc (name, email, role) ------------
async function getUserProfileDoc(uid){
  const authHeader = await firestoreAuthHeader();
  const res = await fetch(firestoreBase()+"/users/"+encodeURIComponent(uid)+firestoreKeyQS(), { headers: authHeader });
  if(res.status===404) return null;
  if(!res.ok) throw new Error("Could not load user profile (HTTP "+res.status+")");
  const doc = await res.json();
  return firestoreDecodeFields(doc.fields);
}
async function createUserProfileDoc(uid, profile){
  const authHeader = await firestoreAuthHeader();
  const res = await fetch(firestoreBase()+"/users/"+encodeURIComponent(uid)+firestoreKeyQS(), {
    method:"PATCH",
    headers: Object.assign({ "Content-Type":"application/json" }, authHeader),
    body: JSON.stringify({ fields: firestoreEncodeFields(profile) })
  });
  if(!res.ok){ const t = await res.text().catch(()=>""); throw new Error("Could not create user profile (HTTP "+res.status+") "+t.slice(0,200)); }
}

function switchAuthTab(tab){
  document.querySelectorAll(".auth-tab").forEach(b=> b.classList.toggle("active", b.dataset.authTab===tab));
  document.getElementById("authView-login").style.display = tab==="login" ? "block" : "none";
  document.getElementById("authView-signup").style.display = tab==="signup" ? "block" : "none";
  document.getElementById("authView-forgot").style.display = "none";
  document.getElementById("authView-pending").style.display = "none";
  document.getElementById("authView-verify").style.display = "none";
  ["loginErr","signupErr","forgotErr"].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=""; });
  document.querySelectorAll(".auth-field.has-error").forEach(f=> f.classList.remove("has-error"));
  const banner = document.getElementById("forgotBanner"); if(banner) banner.style.display = "none";
}
function setFieldError(inputId, hasError){
  const input = document.getElementById(inputId);
  const field = input && input.closest(".auth-field");
  if(field) field.classList.toggle("has-error", !!hasError);
}
function clearFieldErrors(view){
  document.querySelectorAll(`#authView-${view} .auth-field`).forEach(f=> f.classList.remove("has-error"));
}
function showForgotView(){
  document.querySelectorAll(".auth-tab").forEach(b=> b.classList.remove("active"));
  document.getElementById("authView-login").style.display = "none";
  document.getElementById("authView-signup").style.display = "none";
  document.getElementById("authView-forgot").style.display = "block";
  document.getElementById("authView-pending").style.display = "none";
  document.getElementById("forgotErr").textContent = "";
  document.getElementById("forgotBanner").style.display = "none";
}
function showPendingView(){
  document.querySelectorAll(".auth-tab").forEach(b=> b.classList.remove("active"));
  document.getElementById("authView-login").style.display = "none";
  document.getElementById("authView-signup").style.display = "none";
  document.getElementById("authView-forgot").style.display = "none";
  document.getElementById("authView-pending").style.display = "block";
  document.getElementById("authView-verify").style.display = "none";
}
function showEmailVerificationView(){
  document.querySelectorAll(".auth-tab").forEach(b=> b.classList.remove("active"));
  document.getElementById("authView-login").style.display = "none";
  document.getElementById("authView-signup").style.display = "none";
  document.getElementById("authView-forgot").style.display = "none";
  document.getElementById("authView-pending").style.display = "none";
  document.getElementById("authView-verify").style.display = "block";
}
document.querySelectorAll(".auth-tab").forEach(b=> b.addEventListener("click", ()=> switchAuthTab(b.dataset.authTab)));
document.getElementById("gotoSignup").addEventListener("click", e=>{ e.preventDefault(); switchAuthTab("signup"); });
document.getElementById("gotoLogin").addEventListener("click", e=>{ e.preventDefault(); switchAuthTab("login"); });
document.getElementById("gotoLoginFromForgot").addEventListener("click", e=>{ e.preventDefault(); switchAuthTab("login"); });
document.getElementById("gotoForgot").addEventListener("click", e=>{ e.preventDefault(); showForgotView(); });
document.querySelectorAll("[data-toggle-pw]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const input = document.getElementById(btn.dataset.togglePw);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.textContent = showing ? "Show" : "Hide";
  });
});
document.getElementById("verifyLogoutBtn").addEventListener("click", e=>{ e.preventDefault(); firebase.auth().signOut(); });
document.getElementById("verifyRefreshBtn").addEventListener("click", async ()=>{
  const user = firebase.auth().currentUser;
  if(!user) return;
  await user.reload();
  if(user.emailVerified) location.reload();
  else document.getElementById("verifyErr").textContent = "Your email is not verified yet. Open the link in your email, then try again.";
});
document.getElementById("verifyResendBtn").addEventListener("click", async ()=>{
  const user = firebase.auth().currentUser;
  const err = document.getElementById("verifyErr");
  if(!user) return;
  try{
    await user.sendEmailVerification();
    document.getElementById("verifyBanner").style.display = "inline-block";
    document.getElementById("verifyBanner").textContent = "A new verification link was sent. You can request another after 3 minutes.";
    document.getElementById("verifyResendBtn").disabled = true;
    setTimeout(()=>document.getElementById("verifyResendBtn").disabled = false, 180000);
  }catch(e){ err.textContent = "Could not resend the verification link: "+e.message; }
});

firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(error=>console.warn("ATLAS could not enable persistent login:", error));

// Called by firebase.auth().onAuthStateChanged whenever a real Firebase
// user is signed in. Loads (or, on first sign-in, creates) that user's
// users/{uid} Firestore doc, then either shows the full app (role
// "admin") or a pending-approval screen (any other role) — this is the
// server-verified gate the migration spec asks for, replacing the old
// "every signed-in account is an admin" demo behavior.
//
// Every brand-new account — including a Google sign-in that passed the
// ALLOWED_GOOGLE_DOMAIN check above — starts as role "pending", never
// "admin", and the matching Firestore Security Rule only allows a user
// to create their OWN doc with role "pending". Auto-granting "admin"
// client-side just because the email domain matched would mean the
// client is deciding its own authorization, which is exactly what
// section 4's security requirement (and section 14) rules out; genuinely
// automatic promotion for verified DepEd accounts needs a server-side
// Cloud Function setting a custom claim, which isn't part of this pass —
// see the Firebase Setup Checklist for how to promote the first admin.
async function handleAuthenticatedUser(fbUser){
  let profile;
  try{
    profile = await getUserProfileDoc(fbUser.uid);
    if(!profile){
      const isGoogle = fbUser.providerData.some(p=>p.providerId==="google.com");
      const nowIso = new Date().toISOString();
      profile = {
        name: fbUser.displayName || fbUser.email,
        email: fbUser.email,
        role: "pending",
        accountType: isGoogle ? "deped" : "email",
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await createUserProfileDoc(fbUser.uid, profile);
    }
  }catch(e){
    console.error("Could not load/create user profile:", e);
    showToast("Signed in, but couldn't reach the user profile database. Some features may not work until this is resolved.", true);
    profile = { name: fbUser.displayName || fbUser.email, email: fbUser.email, role: "pending" };
  }
  AUTH_SESSION = { id: fbUser.uid, uid: fbUser.uid, name: profile.name, email: profile.email, role: profile.role };

  const usesEmailPassword = fbUser.providerData.some(p=>p.providerId==="password");
  if(usesEmailPassword && !fbUser.emailVerified){
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("appRoot").classList.remove("authed");
    showEmailVerificationView();
    return;
  }

  if(AUTH_SESSION.role !== "admin"){
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("appRoot").classList.remove("authed");
    showPendingView();
    return;
  }

  // Prefer the account's cloud snapshot over any device-local copy. This is
  // what makes a signed-in account portable to a phone, tablet, or laptop.
  try{
    const localOwner = await Store.get(ACCOUNT_OWNER_KEY);
    if(profile.appData && typeof profile.appData === "object"){
      await Store.set(STORAGE_KEY, JSON.stringify(profile.appData));
    }else if(localOwner && localOwner !== fbUser.uid){
      await Store.del(STORAGE_KEY);
      applySnapshot({});
    }
    await Store.set(ACCOUNT_OWNER_KEY, fbUser.uid);
  }catch(e){
    console.error("Could not prepare account data:", e);
    showToast("Your account opened, but its cloud data could not be prepared on this device.", true);
  }

  document.getElementById("authScreen").style.display = "none";
  const app = document.getElementById("appRoot");
  app.classList.add("authed");
  const line = document.getElementById("sidebarUserLine");
  if(line) line.innerHTML = `Signed in as <b style="color:#EAF0F6;">${esc(AUTH_SESSION.name || AUTH_SESSION.email)}</b>`;
  await initApp();
  if(typeof ATLASTour !== "undefined") ATLASTour.maybeOfferOnLogin();
  if(WELCOME_TOAST_MESSAGE){ showToast(WELCOME_TOAST_MESSAGE); WELCOME_TOAST_MESSAGE = null; }
}

firebase.auth().onAuthStateChanged(async (fbUser)=>{
  try{
    if(fbUser){
      await handleAuthenticatedUser(fbUser);
    } else {
      AUTH_SESSION = null;
      closeInstallPrompt();
      document.getElementById("appRoot").classList.remove("authed");
      document.getElementById("authScreen").style.display = "flex";
    }
  }catch(e){
    console.error("onAuthStateChanged handler failed:", e);
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("appRoot").classList.remove("authed");
  }finally{
    document.documentElement.classList.remove("auth-checking");
  }
});

document.getElementById("loginBtn").addEventListener("click", async ()=>{
  const errEl = document.getElementById("loginErr");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  errEl.textContent = "";
  clearFieldErrors("login");
  if(!isValidEmail(email)){ errEl.textContent = "Please enter a valid email address."; setFieldError("loginEmail", true); return; }
  if(!password){ errEl.textContent = "Please enter your password."; setFieldError("loginPassword", true); return; }
  const btn = document.getElementById("loginBtn"); const original = btn.textContent;
  btn.disabled = true; btn.textContent = "Logging in…";
  try{
    WELCOME_TOAST_MESSAGE = "Welcome back.";
    await firebase.auth().signInWithEmailAndPassword(email, password);
  }catch(e){
    WELCOME_TOAST_MESSAGE = null;
    if(e.code==="auth/user-not-found"){ errEl.textContent = "No account found with that email. Try signing up instead."; setFieldError("loginEmail", true); }
    else if(e.code==="auth/wrong-password"){ errEl.textContent = "Incorrect password. Please try again."; setFieldError("loginPassword", true); }
    else if(e.code==="auth/invalid-email"){ errEl.textContent = "Please enter a valid email address."; setFieldError("loginEmail", true); }
    else if(e.code==="auth/too-many-requests"){ errEl.textContent = "Too many attempts. Please wait a moment and try again."; }
    else { errEl.textContent = "Could not log in: " + e.message; }
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
});

document.getElementById("signupBtn").addEventListener("click", async ()=>{
  const errEl = document.getElementById("signupErr");
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const password2 = document.getElementById("signupPassword2").value;
  errEl.textContent = "";
  clearFieldErrors("signup");
  if(!name){ errEl.textContent = "Please enter your full name."; setFieldError("signupName", true); return; }
  if(!isValidEmail(email)){ errEl.textContent = "Please enter a valid email address."; setFieldError("signupEmail", true); return; }
  if(password.length < 8){ errEl.textContent = "Password must be at least 8 characters."; setFieldError("signupPassword", true); return; }
  if(password !== password2){ errEl.textContent = "Passwords do not match."; setFieldError("signupPassword", true); setFieldError("signupPassword2", true); return; }
  const btn = document.getElementById("signupBtn"); const original = btn.textContent;
  btn.disabled = true; btn.textContent = "Creating account…";
  try{
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    await cred.user.sendEmailVerification();
    const nowIso = new Date().toISOString();
    await createUserProfileDoc(cred.user.uid, { name, email, role:"pending", accountType:"email", verificationSentAt: nowIso, createdAt: nowIso, updatedAt: nowIso });
    WELCOME_TOAST_MESSAGE = `Account created. Check ${email} to verify it.`;
  }catch(e){
    if(e.code==="auth/email-already-in-use"){ errEl.textContent = "An account with that email already exists. Try logging in instead."; setFieldError("signupEmail", true); }
    else if(e.code==="auth/weak-password"){ errEl.textContent = "Password is too weak. Please choose a stronger password."; setFieldError("signupPassword", true); }
    else if(e.code==="auth/invalid-email"){ errEl.textContent = "Please enter a valid email address."; setFieldError("signupEmail", true); }
    else { errEl.textContent = "Could not create account: " + e.message; }
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
});

document.getElementById("forgotBtn").addEventListener("click", async ()=>{
  const errEl = document.getElementById("forgotErr");
  const banner = document.getElementById("forgotBanner");
  const email = document.getElementById("forgotEmail").value.trim();
  errEl.textContent = ""; banner.style.display = "none";
  clearFieldErrors("forgot");
  if(!isValidEmail(email)){ errEl.textContent = "Please enter a valid email address."; setFieldError("forgotEmail", true); return; }
  const btn = document.getElementById("forgotBtn"); const original = btn.textContent;
  btn.disabled = true; btn.textContent = "Sending…";
  try{
    await firebase.auth().sendPasswordResetEmail(email);
  }catch(e){
    // auth/user-not-found is deliberately treated the same as success —
    // don't reveal whether an account exists for a given email.
    if(e.code!=="auth/user-not-found" && e.code!=="auth/invalid-email"){
      errEl.textContent = "Could not send reset email: " + e.message;
      btn.disabled = false; btn.textContent = original;
      return;
    }
  }
  banner.style.display = "inline-block";
  banner.style.background = "#EFF5EA"; banner.style.borderColor = "#CFE3C4"; banner.style.color = "#385A2C";
  banner.textContent = "If an account exists for that email, a password reset link has been sent.";
  btn.disabled = false; btn.textContent = original;
});

async function handleGoogleSignIn(){
  if(ALLOWED_GOOGLE_DOMAIN === GOOGLE_DOMAIN_PLACEHOLDER){
    showToast("Google sign-in isn't configured yet — set ALLOWED_GOOGLE_DOMAIN near the top of the AUTHENTICATION section in script.js to your DepEd Workspace domain.", true);
    return;
  }
  try{
    const result = await firebase.auth().signInWithPopup(buildGoogleProvider());
    const email = (result.user.email||"").toLowerCase();
    if(!email.endsWith("@"+ALLOWED_GOOGLE_DOMAIN.toLowerCase())){
      await firebase.auth().signOut();
      showToast(`Only @${ALLOWED_GOOGLE_DOMAIN} accounts can sign in to ATLAS.`, true);
      return;
    }
    WELCOME_TOAST_MESSAGE = "Welcome.";
    // onAuthStateChanged fires from here and finishes signing the user in.
  }catch(e){
    if(e.code!=="auth/popup-closed-by-user") showToast("Google sign-in failed: "+e.message, true);
  }
}
["ssoGoogleLogin","ssoGoogleSignup"].forEach(id=>{
  const btn = document.getElementById(id);
  if(btn) btn.addEventListener("click", handleGoogleSignIn);
});

document.getElementById("pendingLogoutBtn").addEventListener("click", ()=> firebase.auth().signOut());

document.getElementById("logoutBtn").addEventListener("click", ()=>{
  openConfirm("Log out of ATLAS?", async ()=>{
    await saveData();
    if(navigator.onLine){
      await attemptSync(true);
      const cloudSaved = await saveAccountSnapshot();
      if(!cloudSaved) showToast("Local data was saved, but the account database could not be reached. Please log in again when online to retry.", true);
    }else{
      showToast("You are offline. Local data was saved; cloud backup will happen after you reconnect and log in.", true);
    }
    if(typeof ATLASTour !== "undefined") await ATLASTour.resetDeferredOnLogout();
    await firebase.auth().signOut();
    switchAuthTab("login");
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
    document.querySelectorAll("[data-toggle-pw]").forEach(btn=>{
      document.getElementById(btn.dataset.togglePw).type = "password";
      btn.textContent = "Show";
    });
  }, "Log Out");
});


/* =========================================================
   FIRST-LOGIN GUIDED TOUR (ATLASTour)
   Independent onboarding layer only. It never touches the data
   model, never rewrites existing business logic, and only moves
   around the app via the existing navigateTo() function and
   existing DOM elements (tagged with data-tour="..."). Removing
   this whole block leaves every other ATLAS module unaffected.
   ========================================================= */
const TOUR_STATE_KEY = "atlas_tour_state";

let deferredInstallPrompt = null;
let installPromptOpen = false;

function isAtlasInstalled(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallButton(){
  const button = document.getElementById("installAppBtn");
  if(!button) return;
  button.style.display = isAtlasInstalled() ? "none" : "inline-flex";
  button.disabled = false;
  button.title = deferredInstallPrompt ? "Install ATLAS on this device" : "Install is available from a supported browser over HTTPS or localhost";
}

function closeInstallPrompt(){
  installPromptOpen = false;
  const root = document.getElementById("installPromptRoot");
  if(root) root.innerHTML = "";
}

async function requestAtlasInstall(){
  if(isAtlasInstalled()) return;
  if(!deferredInstallPrompt){
    showToast("Install is available when ATLAS is opened from a supported browser over HTTPS or localhost.", true);
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  updateInstallButton();
  closeInstallPrompt();
  await promptEvent.prompt();
  await promptEvent.userChoice.catch(()=>null);
}

function showInstallPrompt(){
  if(installPromptOpen || isAtlasInstalled() || !deferredInstallPrompt) return;
  installPromptOpen = true;
  const root = document.getElementById("installPromptRoot");
  if(!root) return;
  root.innerHTML = `
    <div class="modal-backdrop" id="installAppBackdrop">
      <div class="modal-box narrow">
        <div class="modal-head"><h3>Install ATLAS</h3><button class="modal-close" id="installPromptClose" aria-label="Close">&times;</button></div>
        <div class="modal-body">
          <p style="font-size:13.5px;color:var(--ink);margin:0;">Install ATLAS on this device for a faster launch, an app icon, and a focused full-screen workspace.</p>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="installPromptLater">Later</button>
          <button class="btn gold" id="installPromptInstall">Install ATLAS</button>
        </div>
      </div>
    </div>`;
  const close = ()=>closeInstallPrompt();
  document.getElementById("installPromptClose").onclick = close;
  document.getElementById("installPromptLater").onclick = close;
  document.getElementById("installPromptInstall").onclick = requestAtlasInstall;
}

function maybeOfferInstallPrompt(){
  if(isAtlasInstalled() || !deferredInstallPrompt) return;
  setTimeout(showInstallPrompt, 350);
}

window.addEventListener("beforeinstallprompt", event=>{
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
  if(typeof ATLASTour !== "undefined") ATLASTour.maybeOfferInstallPrompt();
});
window.addEventListener("appinstalled", ()=>{
  deferredInstallPrompt = null;
  closeInstallPrompt();
  updateInstallButton();
  showToast("ATLAS was installed on this device.");
});

const TOUR_STEPS = [
  { page:"dashboard", selector:"#statCards", title:"Dashboard Overview",
    body:["Start here. The Dashboard gives you a quick overview of faculty members, active sections, learning areas, and weekly teaching hours."] },
  { page:"dashboard", selector:"#quickActions", title:"Quick Actions",
    body:["Quick Actions are shortcuts to commonly used tasks — creating a schedule, adding a teacher or section, generating subjects, and more. Only actions you're authorized for appear here."] },
  { page:"schoolyears", selector:"#addSchoolYearBtn", title:"School Year & Terms",
    body:["Use this section to create, activate, archive, and select the School Year and Term that ATLAS uses throughout the system.",
          "The School Year and Term you select here affect every downstream module — Subjects, Teaching Load, Sections, and Class Scheduling."] },
  { page:"teachers", selector:"#addTeacherBtn", title:"Teachers & Loads",
    body:["Manage your faculty roster, teacher specializations, grade levels taught, and weekly teaching loads here. Teacher information matters for schedule generation.",
          "Select the grade levels a teacher is qualified to teach — a teacher should only be assigned to appropriate grade levels unless they also have specialized subject assignments.",
          "For a teacher assigned to Grade 11 or Grade 12, you can also set that grade's Class Shift — AM, PM, or No Shift. A teacher set to AM or PM will never be scheduled against a section on the opposite shift; \"No Shift\" means the teacher can take either.",
          "Open a teacher's details to see their Teaching Load by Program — how many classes, subjects, and hours/week they're actually carrying, split Regular vs Special Program, per grade level."] },
  { page:"learningareas", selector:"#addLearningAreaBtn", title:"Specializations & Learning Areas",
    body:["This is the shared master list behind two things: the Specializations a teacher can be tagged with on the Teachers page, and the Learning Area a Subject can be explicitly assigned to on the Subjects page. A teacher automatically qualifies for a subject whenever a tagged specialization matches that subject's Learning Area.",
          "Add, rename, archive, or delete entries here. Archiving hides an item from new assignments without breaking anything already using it. Deleting one that's still in use warns you first and lets you Cancel, Archive Instead, or Delete with an optional reassignment to another area."] },
  { page:"subjects", selector:"#addSubjectBtn", title:"Subjects",
    body:["Subjects are the school's primary academic reference — generate and manage the learning areas for each Grade Level directly here, scoped to the selected School Year and Term. Use the grade summary at the top to jump straight to a grade level.",
          "Before generating a schedule, make sure the subjects offered for the current School Year and Term are correctly configured.",
          "Each subject also has a Program — Regular or Special Program. A subject's Program must match the Section Type of any section it's scheduled to; ATLAS reports a Program Conflict instead of silently assigning a subject to the wrong kind of section.",
          "Schedule Days now has three options — Monday to Thursday, Monday to Friday, or Friday Only — so a subject can be excluded from Friday specifically, included on Friday, or scheduled on Friday exclusively. You can also explicitly assign a subject to a Learning Area instead of relying on ATLAS's automatic guess."] },
  { page:"sections", selector:"#addSectionBtn", title:"Sections",
    body:["Create and manage class sections, advisers, grade levels, and section-related information.",
          "Sections are the classes that will receive subjects, teachers, and schedules.",
          "Every section has a Section Type — Regular or Special Program — which is matched against each Subject's Program during scheduling. Grade 11 and Grade 12 sections also have a Class Shift (AM Class, PM Class, or None) so a school can run a Senior High morning shift and afternoon shift side by side, sharing teachers and rooms without double-booking either."] },
  { page:"schedule", selector:"#genScheduleBtnSchedule", title:"Class Schedule",
    body:["This is where ATLAS generates and manages the class timetable for your sections, using the configured subjects, teachers, sections, teaching loads, and bell schedule.",
          "Administrators can manually edit or add schedule entries without removing the automated scheduling workflow. Friday can be enabled or disabled for automatic generation in Admin Settings — manual Friday entries can still be added when Friday auto-generation is off.",
          "For Grade 11/12 AM/PM Class sections and Special Program sections, the generator automatically respects each section's Class Shift and Section Type — you don't need to schedule those constraints by hand.",
          "Generating now lets you choose exactly which Grade Levels to (re)generate — every other grade's saved schedule is left untouched — and a one-time Monday–Thursday or Monday–Friday override for just that run, without changing your saved Friday Schedule setting."] },
  { page:"finalschedule", selector:"#fsPrintAllBtn", title:"Final Classroom Schedule",
    body:["Use the Final Classroom Schedule to review the consolidated schedule that is ready to share with teachers, sections, and school administrators.",
          "You can print the full schedule, download it as Excel, audit changes, re-validate entries, and use Edit Final Schedule when a finalized entry needs a controlled adjustment."] },
  { page:"conflicts", selector:"#autoFixBtnSchedule", title:"Schedule Conflicts", important:true,
    body:["Schedule Conflicts is a separate management area designed to detect, review, resolve, and track scheduling conflicts. This module is separate from Class Schedule — it does not interfere with the normal Class Schedule interface or its edits.",
          "Beyond the original Teacher, Section, and Teaching-Load conflicts, ATLAS now also detects Program Conflicts (a subject's Program doesn't match its section's Section Type), Teacher Shift Conflicts (every qualified teacher's AM/PM assignment conflicts with the section's Class Shift), AM/PM Shift Conflicts (a Grade 11/12 section's Class Shift doesn't fit its grade's bell configuration), and Room Conflicts (two sections double-booked into the same room at an overlapping time).",
          "Auto-Fix attempts to resolve detected conflicts by finding valid teacher assignments or schedule adjustments while respecting all of these constraints, and shows what changed afterward. Program Conflicts and AM/PM Shift Conflicts can't be fixed by reassigning a teacher, so Auto-Fix leaves those for you to resolve directly on the Subjects, Sections, or Settings pages, and they stay listed as Unsolved Conflicts in the meantime.",
          "Use \"Validate Schedule\" on the Class Schedule page any time for a full ✅/⚠️/❌ Validation Report before you rely on or share a schedule."] },
  { page:"conflicts", selector:"#conflictTabs", title:"Conflict Filters",
    body:["Use these tabs to switch between all conflicts, unresolved conflicts, Auto-Fix, resolved items, and the complete conflict history.",
          "This keeps active problems separate from resolved records while preserving an audit trail."] },
  { page:"conflicts", selector:"#changesBody", title:"Auto-Fix Changes",
    body:["After Auto-Fix runs, review this table to see which teacher or schedule assignments changed.",
          "You can inspect the recorded changes and undo the most recent Auto-Fix run when needed."] },
  { page:"conflicts", selector:"#cmgmtHistoryBody", title:"Conflict History",
    body:["Conflict History records when a problem was detected, what schedule entry it affected, and how it was resolved.",
          "Use it when auditing or explaining why a final schedule changed."] },
  { page:"reports", selector:"#reportLoadByArea", title:"Reports",
    body:["Use Reports to review summarized information about teaching loads, faculty composition, and bell schedules — including Teaching Load by Learning Area, Regular vs Special Program Assignments, Roster Composition, and Bell Schedule Snapshot.",
          "Reports provide a convenient way to review the information configured and generated throughout ATLAS."] },
  { page:"database", selector:"#syncNowBtn", title:"Database & Sync",
    body:["Database & Sync lets you monitor stored application data, synchronization status, backups, exports, and restore options.",
          "ATLAS stores application data locally and can synchronize supported records with the configured cloud database."] },
  { page:"settings", selector:"#saveSettings", title:"Admin Settings",
    body:["Admin Settings controls important school-wide scheduling configuration: school start time, grade-level bell schedules, class periods, breaks, lunch, and the Friday schedule.",
          "Configure these settings carefully — the bell schedule is used when generating class schedules."] },
  { page:"settings", selector:"#saveSchoolName", title:"School Identity",
    body:["Set the school's official name and upload its logo. These details appear on the Final Classroom Schedule and printed schedules."] },
  { page:"settings", selector:"#saveSettings", title:"Bell Configuration",
    body:["Configure each grade level's start time, periods per day, period length, breaks, lunch, and dismissal timing, then save and regenerate schedules."] },
  { page:"settings", selector:"#saveScheduleSettings", title:"Schedule Settings",
    body:["Control Friday availability, Senior High shift timing, and per-subject duration overrides. Save these rules before regenerating the class schedule."] },
  { page:"settings", selector:"#settingsGoDbBtn", title:"Application Data & Backup",
    body:["Open Database & Sync to inspect stored records, synchronize cloud data, export a full JSON backup, or restore a previous backup."] },
  { page:"settings", selector:'[data-tour="shs-shift"]', title:"Senior High AM/PM Shift Settings",
    body:["If your school runs Grade 11/12 in two shifts, set the clock time here that the PM Class shift starts at. PM Class sections build their whole bell schedule from this time instead of the grade's normal start time, so an AM Class section and a PM Class section can safely share the same room, day, and even the same teachers.",
          "This works together with each grade's Class Start Time in the Per-Grade-Level Bell Configuration table above: an AM Class section is only valid if that grade's Class Start Time falls before this PM boundary. If it doesn't, ATLAS reports it as an AM/PM Shift Conflict on the Schedule Conflicts page instead of generating an invalid schedule."] }
];

const ATLASTour = (function(){
  let idx = 0;
  let active = false;
  let resizeHandler = null;

  function currentEmail(){
    return (AUTH_SESSION && AUTH_SESSION.email) ? AUTH_SESSION.email.toLowerCase() : null;
  }

  async function loadTourState(){
    const email = currentEmail();
    if(!email) return null;
    try{
      const raw = await Store.get(TOUR_STATE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      return all[email] || null;
    }catch(e){ console.error("ATLASTour: could not load tour state:", e); return null; }
  }

  async function saveTourState(status){
    const email = currentEmail();
    if(!email) return;
    try{
      const raw = await Store.get(TOUR_STATE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[email] = { status, updatedAt: new Date().toISOString() };
      await Store.set(TOUR_STATE_KEY, JSON.stringify(all));
    }catch(e){ console.error("ATLASTour: could not save tour state:", e); }
  }

  async function resetDeferredOnLogout(){
    const email = currentEmail();
    if(!email) return;
    try{
      const raw = await Store.get(TOUR_STATE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      if(all[email] && all[email].status === "deferred"){
        delete all[email];
        await Store.set(TOUR_STATE_KEY, JSON.stringify(all));
      }
    }catch(e){ console.error("ATLASTour: could not reset deferred tour state:", e); }
  }

  function root(){ return document.getElementById("atlasTourRoot"); }

  function teardown(){
    active = false;
    closeTourDrawer();
    const r = root();
    if(r) r.innerHTML = "";
    if(resizeHandler){
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("scroll", resizeHandler, true);
      resizeHandler = null;
    }
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(e){
    if(!active) return;
    if(e.key === "Escape"){ skipTour(); }
    else if(e.key === "ArrowRight"){ nextStep(); }
    else if(e.key === "ArrowLeft"){ previousStep(); }
  }

  function navExists(page){
    return !!document.querySelector('.navlist button[data-page="'+page+'"]');
  }

  function openTourDrawer(){
    const app = document.getElementById("appRoot");
    if(app) app.classList.add("sidebar-open");
  }

  function closeTourDrawer(){
    const app = document.getElementById("appRoot");
    if(app) app.classList.remove("sidebar-open");
  }

  // Step 19 requirement: verify the nav item exists, the user can access
  // the page, and only then treat the step as showable. canAccessPage()
  // is the app's existing authorization check — reused as-is, never
  // duplicated, so the tour always respects real permissions.
  function targetAvailable(step){
    if(step.page && typeof canAccessPage === "function" && !canAccessPage(step.page)) return false;
    if(step.page && !navExists(step.page) && !document.getElementById("page-"+step.page)) return false;
    return true;
  }

  function positionOn(el){
    const r = root();
    if(!r) return;
    const rect = el.getBoundingClientRect();
    const pad = 0;
    let highlight = r.querySelector(".tour-highlight");
    if(!highlight){
      highlight = document.createElement("div");
      highlight.className = "tour-highlight";
      r.appendChild(highlight);
    }
    highlight.style.top = Math.max(rect.top - pad, 4) + "px";
    highlight.style.left = Math.max(rect.left - pad, 4) + "px";
    highlight.style.width = (rect.width + pad*2) + "px";
    highlight.style.height = (rect.height + pad*2) + "px";
    highlight.classList.add("show");

    const card = r.querySelector(".tour-card");
    if(card){
      const cardRect = card.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      let top = rect.bottom + pad + 14;
      let left = rect.left;
      if(top + cardRect.height > vh - 12) top = rect.top - cardRect.height - pad - 14; // flip above
      if(top < 8) top = Math.min(Math.max((vh - cardRect.height)/2, 8), Math.max(vh - cardRect.height - 8, 8));
      if(left + cardRect.width > vw - 12) left = vw - cardRect.width - 12;
      if(left < 12) left = 12;
      card.style.top = top + "px";
      card.style.left = left + "px";
    }
  }

  function renderCard(step, stepNumber, total){
    const r = root();
    let card = r.querySelector(".tour-card");
    if(!card){
      card = document.createElement("div");
      card.className = "tour-card";
      r.appendChild(card);
    }
    const isLast = stepNumber === total;
    card.innerHTML = `
      <div class="tour-card-head">
        <div>
          <div class="tour-progress">Step ${stepNumber} of ${total}</div>
          <h4>${esc(step.title)}</h4>
        </div>
        <button class="tour-card-close" id="tourCardClose" title="Close tour" aria-label="Close tour">&times;</button>
      </div>
      <div class="tour-card-body">${step.body.map(p=>`<p>${esc(p)}</p>`).join("")}</div>
      <div class="tour-card-foot">
        <button class="tour-skip-link" id="tourSkipBtn">Skip Tour</button>
        <div class="tour-nav-btns">
          ${stepNumber>1 ? `<button class="btn ghost tour-btn-sm" id="tourBackBtn">Back</button>` : ``}
          <button class="btn gold tour-btn-sm" id="tourNextBtn">${isLast ? "Finish" : "Next"}</button>
        </div>
      </div>`;
    requestAnimationFrame(()=> card.classList.add("show"));
    document.getElementById("tourCardClose").onclick = skipTour;
    document.getElementById("tourSkipBtn").onclick = skipTour;
    const backBtn = document.getElementById("tourBackBtn");
    if(backBtn) backBtn.onclick = previousStep;
    document.getElementById("tourNextBtn").onclick = ()=> isLast ? finishTour() : nextStep();
  }

  async function showStep(i){
    if(i < 0) i = 0;
    if(i >= TOUR_STEPS.length){ finishTour(); return; }
    const step = TOUR_STEPS[i];
    if(!targetAvailable(step)){ showStep(i+1); return; } // never leave the user stuck on a missing target
    idx = i;
    const activePage = document.querySelector(".page.active");
    const activeId = activePage ? activePage.id.replace("page-","") : null;
    if(step.page && step.page !== activeId){
      navigateTo(step.page); // reuses the app's own navigation — no second nav system
      await new Promise(res=> setTimeout(res, 260));
    }
    const target = document.querySelector(step.selector);
    if(!target){ showStep(i+1); return; }
    target.scrollIntoView({ block:"center", behavior:"smooth" });
    await new Promise(res=> setTimeout(res, 220));
    renderCard(step, i+1, TOUR_STEPS.length);
    positionOn(target);
    if(!resizeHandler){
      resizeHandler = ()=>{ const t = document.querySelector(TOUR_STEPS[idx].selector); if(t) positionOn(t); };
      window.addEventListener("resize", resizeHandler);
      window.addEventListener("scroll", resizeHandler, true);
    }
  }

  function nextStep(){ showStep(idx+1); }
  function previousStep(){ showStep(idx-1); }

  function skipTour(){ teardown(); saveTourState("skipped"); maybeOfferInstallPrompt(); }

  function finishTour(){ teardown(); saveTourState("completed"); showCompletionScreen(); }

  function showCompletionScreen(){
    const r = root();
    r.innerHTML = `
      <div class="modal-backdrop" id="tourDoneBackdrop">
        <div class="modal-box narrow">
          <div class="modal-head"><h3>You're Ready to Use ATLAS!</h3></div>
          <div class="modal-body">
            <p style="font-size:13.5px;color:var(--ink);margin:0;">You've completed the ATLAS system tour. You can now manage your academic setup, teachers, subjects, sections, teaching loads, class schedules, conflicts, reports, and system settings.</p>
          </div>
          <div class="modal-foot">
            <button class="btn ghost" id="tourDoneRestartLater">Restart Tour Later</button>
            <button class="btn gold" id="tourDoneFinish">Finish Tour</button>
          </div>
        </div>
      </div>`;
    const close = ()=>{ r.innerHTML = ""; };
    document.getElementById("tourDoneFinish").onclick = ()=>{ close(); maybeOfferInstallPrompt(); };
    document.getElementById("tourDoneRestartLater").onclick = ()=>{ close(); maybeOfferInstallPrompt(); };
  }

  function showWelcome(){
    const r = root();
    r.innerHTML = `
      <div class="modal-backdrop" id="tourWelcomeBackdrop">
        <div class="modal-box narrow">
          <div class="modal-head"><h3>Welcome to ATLAS</h3></div>
          <div class="modal-body">
            <div class="hint" style="margin-top:-8px;">Teaching Loads &amp; Class Schedules</div>
            <p style="font-size:13.5px;color:var(--ink);margin:0;">Welcome to ATLAS. This quick tour will guide you through the main features of the system and show you how they work together to manage teachers, subjects, sections, teaching loads, schedules, conflicts, and reports.</p>
          </div>
          <div class="modal-foot" style="justify-content:space-between;">
            <button class="tour-skip-link" id="tourWelcomeLater">Maybe Later</button>
            <div style="display:flex; gap:10px;">
              <button class="btn ghost" id="tourWelcomeSkip">Skip Tour</button>
              <button class="btn gold" id="tourWelcomeStart">Start Tour</button>
            </div>
          </div>
        </div>
      </div>`;
    document.getElementById("tourWelcomeStart").onclick = ()=>{ r.innerHTML=""; startTour(); };
    document.getElementById("tourWelcomeSkip").onclick = ()=>{ r.innerHTML=""; saveTourState("skipped"); maybeOfferInstallPrompt(); };
    document.getElementById("tourWelcomeLater").onclick = ()=>{ r.innerHTML=""; saveTourState("deferred"); };
  }

  function startTour(){
    active = true;
    closeTourDrawer();
    document.addEventListener("keydown", onKeydown);
    showStep(0);
  }

  function restartTour(){
    const r = root();
    if(r) r.innerHTML = "";
    startTour();
  }

  async function maybeOfferOnLogin(){
    const state = await loadTourState();
    if(!state || (state.status !== "completed" && state.status !== "skipped" && state.status !== "deferred")) showWelcome();
    else maybeOfferInstallPrompt();
  }

  async function maybeOfferInstallPrompt(){
    const state = await loadTourState();
    if(state && (state.status === "completed" || state.status === "skipped")) window.maybeOfferInstallPrompt();
  }

  return { startTour, nextStep, previousStep, skipTour, finishTour, restartTour, showStep, saveTourState, loadTourState, maybeOfferOnLogin, maybeOfferInstallPrompt, resetDeferredOnLogout };
})();

document.getElementById("startGuidedTourBtn").addEventListener("click", ()=> ATLASTour.restartTour());
document.getElementById("installAppBtn").addEventListener("click", requestAtlasInstall);
updateInstallButton();

if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(error=>console.warn("ATLAS service worker registration failed:", error)));
}

// No separate bootstrap step needed here: firebase.auth().onAuthStateChanged
// (registered up in the AUTHENTICATION section) fires once immediately with
// whatever session Firebase already has persisted, and handles showing
// either the app or the login screen from there.
