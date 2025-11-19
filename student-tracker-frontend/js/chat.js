const Chat = (function(){
  const STORE_KEY = 'st_chat_store';
  const SEL_KEY = 'st_chat_selected';
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }catch{ return {}; } }
  function save(data){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  function uid(){ return Math.random().toString(36).slice(2, 9); }
  function nowISO(){ return new Date().toISOString(); }

  const state = { threads: [], users: [], role: 'STUDENT', me: null, selectedId: null, roster: [] };

  // Populates the database with initial seed data if it's empty.
  function seedIfEmpty(){
    const db = load();
    if (!db.users){
      db.users = [
        { id: 1, fullName: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
        { id: 2, fullName: 'Instructor User', email: 'instructor@example.com', role: 'INSTRUCTOR' },
        { id: 3, fullName: 'Student One', email: 's1@example.com', role: 'STUDENT' },
        { id: 4, fullName: 'Student Two', email: 's2@example.com', role: 'STUDENT' },
        { id: 5, fullName: 'Student Three', email: 's3@example.com', role: 'STUDENT' }
      ];
    }
    if (!db.threads){
      db.threads = [{
        id: uid(),
        participants: [2,3],           
        title: "Instructor ↔ Student One",
        messages: [
          { id: uid(), from: 2, text: "Welcome to the class!", at: nowISO() },
          { id: uid(), from: 3, text: "Thank you!", at: nowISO() }
        ]
      }];
    }
    save(db);
  }

  // Populates the database with initial seed data if it's empty.
  function currentDB(){ seedIfEmpty(); return load(); }

  // Renders the list of chat threads in the sidebar, handling search and sorting.
  function renderSidebar(){
    const me = state.me;
    const db = currentDB();
    const myThreads = (db.threads || []).filter(t => t.participants.includes(me.id));
    const cont = document.getElementById('threads');
    if (!cont) return;
    const q = document.getElementById('search').value.toLowerCase();
    const items = myThreads
      .map(t => ({ ...t, last: t.messages[t.messages.length-1] }))
      .filter(t => t.title.toLowerCase().includes(q) || (t.last?.text||'').toLowerCase().includes(q))
      .sort((a,b) => (b.last?.at||'').localeCompare(a.last?.at||''));

    cont.innerHTML = items.map(t => {
      const active = t.id === state.selectedId ? ' active' : '';
      const preview = (t.last?.text || '').slice(0, 50);
      return `<div class="chat-item${active}" data-id="${t.id}">
        <div class="avatar">${nameFor(threadOtherName(t, me)).slice(0,1)}</div>
        <div>
          <div style="font-weight:700">${escapeHTML(t.title)}</div>
          <div class="chat-badge">${escapeHTML(preview)}</div>
        </div>
      </div>`;
    }).join('');

    cont.querySelectorAll('.chat-item').forEach(el => {
      el.addEventListener('click', () => {
        state.selectedId = el.getAttribute('data-id');
        localStorage.setItem(SEL_KEY, state.selectedId);
        renderActiveThread();
        renderSidebar();
      });
    });
  }

  // Utility function to return a name or 'U' as a fallback.
  function nameFor(str){ return (str || 'U'); }

  // Escapes a string for safe insertion into HTML.
  function escapeHTML(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Gets a comma-separated string of all participants in a thread, excluding the current user.
  function threadOtherName(thread, me){
    const db = currentDB();
    const others = thread.participants.filter(id => id !== me.id);
    const names = others.map(id => db.users.find(u => u.id===id)?.fullName || "User");
    return names.join(', ');
  }

  // Renders the header and all messages for the currently selected thread.
  function renderActiveThread(){
    const db = currentDB();
    const me = state.me;
    const thread = (db.threads || []).find(t => t.id === state.selectedId);
    const titleEl = document.getElementById('thread-title');
    const subEl = document.getElementById('thread-sub');
    const recipEl = document.getElementById('recipients');
    const msgEl = document.getElementById('messages');
    const input = document.getElementById('msg-input');

    if (!thread){
      titleEl.textContent = "Select a conversation";
      subEl.textContent = "";
      recipEl.innerHTML = "";
      msgEl.innerHTML = "";
      input.disabled = true;
      return;
    }
    input.disabled = false;

    titleEl.textContent = thread.title;
    const others = thread.participants.filter(id => id !== me.id)
      .map(id => db.users.find(u => u.id===id)?.fullName || "User");
    subEl.textContent = `Participants: ${others.join(", ")}`;

    recipEl.innerHTML = others.map(n => `<span class="recipient-pill">${escapeHTML(n)}</span>`).join('');

    msgEl.innerHTML = thread.messages.map(m => {
      const from = db.users.find(u => u.id===m.from);
      const mine = m.from === me.id;
      return `<div class="msg ${mine ? 'me':''}">
        <div>${escapeHTML(m.text)}</div>
        <div class="msg-meta">${escapeHTML(from?.fullName || 'User')} • ${new Date(m.at).toLocaleString()}</div>
      </div>`;
    }).join('');
    msgEl.scrollTop = msgEl.scrollHeight;
  }

  // Adds the message from the input box to the active thread and updates the UI.
  function sendMessage(){
    const db = currentDB();
    const me = state.me;
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;
    const thread = db.threads.find(t => t.id === state.selectedId);
    if (!thread) return;
    thread.messages.push({ id: uid(), from: me.id, text, at: nowISO() });
    save(db);
    input.value = "";
    renderActiveThread();
    renderSidebar();
  }

  // Shows or hides UI elements (like the 'new thread' button) based on the user's role.
  function setRoleCapabilities(){
    const me = state.me;
    const btn = document.getElementById('new-thread');
    if (me.role === 'INSTRUCTOR'){
      btn.style.display = '';
      btn.onclick = openModal;
    } else {
      btn.style.display = 'none';
    }
  }

  // Opens the 'new thread' modal and populates it with a list of students.
  function openModal(){
    const modal = document.getElementById('recip-modal');
    const list = document.getElementById('recip-list');
    const db = currentDB();
    const students = db.users.filter(u => u.role === 'STUDENT');
    list.innerHTML = students.map(s => `
      <div class="list-item">
        <div class="row" style="gap:10px; align-items:center;">
          <div class="avatar">${(s.fullName||'S').slice(0,1)}</div>
          <div>${escapeHTML(s.fullName)}<div class="chat-badge">${escapeHTML(s.email)}</div></div>
        </div>
        <input type="checkbox" value="${s.id}" />
      </div>
    `).join('');
    modal.classList.add('open');
  }

  // Closes the 'new thread' modal.
  function closeModal(){
    document.getElementById('recip-modal').classList.remove('open');
  }

  // Creates a new chat thread based on the students selected in the modal.
  function createThreadFromSelection(){
    const db = currentDB();
    const me = state.me;
    const checkboxes = Array.from(document.querySelectorAll('#recip-list input[type=checkbox]'));
    const selected = checkboxes.filter(c => c.checked).map(c => Number(c.value));
    if (selected.length === 0) return closeModal();
    const participants = [me.id, ...selected];
    const names = selected.map(id => db.users.find(u => u.id===id)?.fullName || "User").join(', ');
    const id = uid();
    db.threads.push({
      id,
      participants,
      title: `Instructor → ${names}`,
      messages: [{ id: uid(), from: me.id, text: "Hello everyone 👋", at: nowISO() }]
    });
    save(db);
    state.selectedId = id;
    localStorage.setItem(SEL_KEY, id);
    closeModal();
    renderSidebar();
    renderActiveThread();
  }

  // Restores the previously selected thread ID from localStorage.
  function restoreSelection(){
    const id = localStorage.getItem(SEL_KEY);
    if (!id) return;
    state.selectedId = id;
  }

  // Sets up event listeners for the message input and send button.
  function setupComposer(){
    document.getElementById('send').addEventListener('click', sendMessage);
    const input = document.getElementById('msg-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
    });
  }

  // Adds a 'Chat' link to the main navigation if the user is a student or instructor.
  function fixNavLinks(){
    const me = state.me;
    const links = document.querySelector('.nav .links');
    if (!links) return;
    const chatLink = document.createElement('a');
    chatLink.href = 'chat.html';
    chatLink.textContent = 'Chat';
    if (me.role === 'INSTRUCTOR'){
      links.insertAdjacentHTML('beforeend', ' <a href="chat.html">Chat</a>');
    } else if (me.role === 'STUDENT'){
      links.insertAdjacentHTML('beforeend', ' <a href="chat.html">Chat</a>');
    }
  }

  // Main initialization function to set up the chat application on page load.
  function init(){
    const me = Auth.currentUser();
    state.me = me;
    state.role = me.role;
    restoreSelection();
    setRoleCapabilities();
    setupComposer();
    renderSidebar();
    renderActiveThread();
    fixNavLinks();

    document.getElementById('search').addEventListener('input', renderSidebar);
  }

  return { init, closeModal, createThreadFromSelection };
})();