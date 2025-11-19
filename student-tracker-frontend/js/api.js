// frontend/js/api.js
const API_BASE = "http://localhost:3000";  

async function http(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = Auth.token();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.error || msg;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

// POST /api/auth/login
function login(email, password) {
  return http("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
}

// GET /api/auth/me
function me() {
  return http("/api/auth/me");
}

// GET /api/users
function listUsers() {
  return http("/api/users");                  
}

// POST /api/users
function adminCreateUser(fullName, email, role, password) {
  return http("/api/users", {
    method: "POST",
    body: { fullName, email, role, password },
  });
}

// DELETE /api/users/:id
function adminDeleteUser(id) {
  return http(`/api/users/${id}`, {
    method: "DELETE",
  });
}

// GET /api/classes - get instructor's classes
function getClasses(instructorId) {
  const query = instructorId ? `?instructorId=${instructorId}` : '';
  return http(`/api/classes${query}`);
}

// POST /api/classes - create a class
function createClass(title, term, section) {
  return http("/api/classes", {
    method: "POST",
    body: { title, term, section },
  });
}

// GET /api/classes/:id - get single class
function getClass(id) {
  return http(`/api/classes/${id}`);
}

// GET /api/classes/mine - get student's classes
function getMyClasses() {
  return http("/api/classes/mine");
}

// GET /api/enrollments/:classId - get roster
function getRoster(classId) {
  return http(`/api/enrollments/${classId}`);
}

// GET /api/attendance/:classId - get attendance
function getAttendance(classId) {
  return http(`/api/attendance/${classId}`);
}

// GET /api/attendance/my/:classId - get my attendance
function getMyAttendance(classId) {
  return http(`/api/attendance/my/${classId}`);
}

// GET /api/users/students - get all students (for instructors)
function getStudents() {
  return http("/api/users/students");
}

// GET /api/users/instructors - get all instructors
function getInstructors() {
  return http("/api/users/instructors");
}

// POST /api/enrollments - enroll a student
function enrollStudent(classId, studentId) {
  return http("/api/enrollments", {
    method: "POST",
    body: { classId, studentId },
  });
}

// DELETE /api/enrollments - unenroll a student
function unenrollStudent(classId, studentId) {
  return http("/api/enrollments", {
    method: "DELETE",
    body: { classId, studentId },
  });
}

// DELETE /api/classes/:id - delete a class
function deleteClass(id) {
  return http(`/api/classes/${id}`, {
    method: "DELETE",
  });
}

// POST /api/attendance/checkin
function checkIn(classId, geo) {
  const lat = geo?.lat ?? null;
  const lon = geo?.lon ?? null;
  const method = geo ? "geo" : "self";
  return http("/api/attendance/checkin", {
    method: "POST",
    body: { classId, lat, lon, method },
  });
}

// POST /api/attendance/checkout
function checkOut(classId, geo) {
  const lat = geo?.lat ?? null;
  const lon = geo?.lon ?? null;
  return http("/api/attendance/checkout", {
    method: "POST",
    body: { classId, lat, lon },
  });
}

// Chat API functions
function getThreads(){                     
  return http("/api/chat/threads");
}

// GET /api/chat/threads/:threadId/messages
function getThreadMessages(threadId){      
  return http(`/api/chat/threads/${threadId}/messages`);
}

// POST /api/chat/threads/:threadId/messages
function sendMessage(threadId, body){      
  return http(`/api/chat/threads/${threadId}/messages`, {
    method:"POST", body:{ body }
  });
}

// POST /api/chat/threads
function createThread({ kind="DIRECT", title=null, participantIds=[] }){
  return http(`/api/chat/threads`, { method:"POST", body:{ kind, title, participantIds } });
}

// GET /api/users/people
function getPeople() { return http("/api/users/people"); }

window.api = {
  login,
  me,
  listUsers,
  adminCreateUser,
  adminDeleteUser,
  getClasses,
  createClass,
  getClass,
  getRoster,
  getAttendance,
  getStudents,
  enrollStudent,
  unenrollStudent,
  deleteClass,
  getAttendance,
  getMyAttendance,
  getMyClasses,
  checkIn,
  checkOut,
  getThreads, 
  getThreadMessages, 
  sendMessage, 
  createThread,
  getInstructors, 
  getPeople     
};