// Shared UI helpers
const UI = {
  
  requireAuth() { if (!Auth.currentUser()) location.href = 'index.html'; },
  guardRole(...roles){
    this.requireAuth();
    const me = Auth.currentUser();
    if (!roles.includes(me.role)) this.redirectByRole(me.role);
  },
  redirectByRole(role){
    if (role==='ADMIN') location.href = 'admin.html';
    else if (role==='INSTRUCTOR') location.href = 'instructor.html';
    else location.href = 'student.html';
  },
  mountNav(){
    const el = document.getElementById('nav'); if (!el) return;
    const me = Auth.currentUser();
    const links = me?.role==='ADMIN'
      ? `<a href="admin.html">Admin</a> <a href="classes.html">Classes</a>`
      : me?.role==='INSTRUCTOR'
        ? `<a href="instructor.html">Instructor</a> <a href="classes.html">My Classes</a> <a href="chat.html">Chat</a>`
        : `<a href="student.html">Student</a> <a href="classes.html">My Classes</a> <a href="chat.html">Chat</a>`;
    const here = location.pathname.split('/').pop();
    el.innerHTML = `
      <div class="nav">
        <div class="nav-inner">
          <div class="brand"><div class="logo"></div> Student Tracker</div>
          <div class="links">${links}</div>
          <div class="user">
            <button class="theme-toggle" onclick="cycleTheme()">
              <span class="theme-dot"></span> <span id="theme-label">${(localStorage.getItem('st_theme')||'aurora').capitalize()}</span>
            </button>
            ${me ? `<div class="avatar">${(me.fullName||'U').slice(0,1)}</div><span>${me.fullName||''}</span>` : ''}
          </div>
        </div>
      </div>`;
    document.querySelectorAll('.nav .links a').forEach(a=>{ if(a.getAttribute('href')===here) a.classList.add('active'); });
  },
  renderTable(tbodyId, items, mapper){
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = items.map(item => `<tr>${mapper(item).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
  },
  toast(msg){ alert(msg); }
};

String.prototype.capitalize = function(){ return this.charAt(0).toUpperCase()+this.slice(1); };


    // Theme handling
    const THEME_KEY = 'st_theme';
    const themes = ['aurora','sunset','emerald'];
    function applySavedTheme(){
      const t = localStorage.getItem(THEME_KEY) || 'aurora';
      document.documentElement.setAttribute('data-theme', t==='aurora' ? '' : t);
    }
    function cycleTheme(){
      const current = localStorage.getItem(THEME_KEY) || 'aurora';
      const idx = themes.indexOf(current);
      const next = themes[(idx+1)%themes.length];
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.setAttribute('data-theme', next==='aurora' ? '' : next);
      // Update label
      const el = document.querySelector('#theme-label');
      if (el) el.textContent = next.capitalize ? next.capitalize() : (next[0].toUpperCase()+next.slice(1));
    }
    applySavedTheme();
