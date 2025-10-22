// Simple demo auth utilities using localStorage
const Auth = {
  currentUser() { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; },
  setUser(user) { localStorage.setItem('user', JSON.stringify(user)); },
  logout() { localStorage.removeItem('user'); location.href = 'index.html'; },
  async fakeLogin(email, _password) {
    const role = email.startsWith('admin') ? 'ADMIN' : email.startsWith('instructor') ? 'INSTRUCTOR' : 'STUDENT';
    return { id: role==='ADMIN'?1:role==='INSTRUCTOR'?2:3, email, role, fullName: (role[0]+role.slice(1).toLowerCase())+' User' };
  }
};
