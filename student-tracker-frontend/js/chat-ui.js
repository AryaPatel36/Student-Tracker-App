const Chat = (() => {
  let me, threads = [], activeId = null, poll = null;
  let allUsers = [];
  const usersById = {};     
  const titlesByThread = {}; 

  // ----- DOM helpers -----
  const el           = (id) => document.getElementById(id);
  const $threads     = () => el("threads");
  const $messages    = () => el("messages");
  const $title       = () => el("thread-title");
  const $sub         = () => el("thread-sub");
  const $input       = () => el("msg-input");
  const $send        = () => el("send");
  const $search      = () => el("search");
  const $newBtn      = () => el("new-thread");
  const $recipModal  = () => el("recip-modal");
  const $recipList   = () => el("recip-list");
  const $recipSearch = () => el("recip-search");
  const $btnClose    = () => el("btnCloseModal");
  const $btnCancel   = () => el("btnCancelRecip");
  const $btnStart    = () => el("btnStartThread");

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  const fmtTime = (t) => new Date(t).toLocaleString();

  // Adds or updates user information in the global 'usersById' directory.
  function upsertDirectory(list){
    (list || []).forEach(u => {
      const id = Number(u.id);
      if (!id) return;
      usersById[id] = {
        id,
        full_name: u.full_name || u.fullName || u.name || "User",
        email: u.email || usersById[id]?.email || "",
        role: String(u.role || usersById[id]?.role || "").toUpperCase()
      };
    });
  }

  // Fetches the list of all people (students/instructors) and adds the current user to the directory.
  async function loadDirectory(){
    try{
      const rows = await api.getPeople(); 
      upsertDirectory(rows);
    }catch{/* ignore */ }
    if (me){
      usersById[Number(me.id)] = {
        id: Number(me.id),
        full_name: me.full_name || me.fullName || me.name || "Me",
        email: me.email || "",
        role: String(me.role || "").toUpperCase()
      };
    }
  }

  // Returns an array of full names for a given list of user IDs.
  function namesFor(ids, { excludeMe = false } = {}) {
    const mine = Number(me?.id);
    return (ids || [])
      .map(Number)
      .filter(id => id && (!excludeMe || id !== mine))
      .map(id => usersById[id]?.full_name)
      .filter(Boolean);
  }

  // Formats a list of names into a concise group title (e.g., "A, B +2 more").
  function formatGroupTitle(otherNames) {
    if (!otherNames.length) return "Group";
    if (otherNames.length <= 3) return otherNames.join(", ");
    const head = otherNames.slice(0, 3).join(", ");
    return `${head} +${otherNames.length - 3} more`;
  }

  // Computes a user-friendly display title for a thread (e.g., "John Doe" or "Jane, John +1").
  function computeDisplayTitle(t){
    if (t?.title) return t.title;

    const ids = Array.isArray(t?.participants)
      ? t.participants.map(Number).filter(Boolean)
      : [];

    if (!ids.length) {
      const kind = String(t?.kind || "").toUpperCase();
      return kind === "GROUP" ? "Group" : "Direct message";
    }

    const mine   = Number(me?.id);
    const others = ids.filter(id => id !== mine);

    if (others.length <= 1) {
      const otherId = others[0] ?? ids[0];
      return usersById[otherId]?.full_name || "Direct message";
    }

    const names = others
      .map(id => usersById[id]?.full_name)
      .filter(Boolean);
    if (!names.length) return "Group";
    return formatGroupTitle(names);
  }

  // Renders the list of chat threads in the sidebar.
  function renderThreads(list){
    $threads().innerHTML = (list ?? []).map(t => {
      const title   = titlesByThread[t.id] || computeDisplayTitle(t);
      const initial = (title.trim()[0] || "D").toUpperCase();
      return `
        <div class="chat-item ${t.id===activeId ? "active" : ""}" data-id="${t.id}">
          <div class="avatar">${esc(initial)}</div>
          <div style="flex:1;min-width:0;">
            <div class="strong ellip-1">${esc(title)}</div>
            <div class="chat-badge">#${esc(t.id)} • ${esc(t.kind || "")}</div>
          </div>
        </div>`;
    }).join("") || `<div class="muted" style="padding:16px">No conversations</div>`;

    $threads().querySelectorAll(".chat-item").forEach(n => {
      n.onclick = () => openThread(Number(n.dataset.id));
    });
  }

  // Renders all messages for the currently active thread.
  function renderMessages(rows){
    $messages().innerHTML = rows.map(m => `
      <div class="msg ${m.sender_id===me.id ? "me" : ""}">
        <div>${esc(m.body)}</div>
        <div class="msg-meta">${esc(m.full_name || "")} • ${fmtTime(m.created_at)}</div>
      </div>
    `).join("");
    $messages().scrollTop = $messages().scrollHeight;
  }

  // Fetches messages for threads that are missing participant data to infer participants.
  async function enrichThreadsFromMessages(list){
    const needs = (list || []).filter(
      t => !Array.isArray(t.participants) || !t.participants.length
    );

    await Promise.all(needs.map(async (t) => {
      try{
        const msgs = await api.getThreadMessages(t.id);

        msgs.forEach(m => {
          if (m.sender_id && m.full_name){
            upsertDirectory([{ id:m.sender_id, full_name:m.full_name, email:m.email || "" }]);
          }
        });

        const ids = Array.from(new Set(
          msgs.map(m => Number(m.sender_id)).filter(Boolean)
        ));
        if (ids.length) t.participants = ids;
      }catch{/* ignore */ }
    }));
  }

  // Fetches all threads, enriches them with participant data, computes titles, and renders them.
  async function loadThreads(){
    threads = await api.getThreads();

    threads.forEach(t => {
      if (!titlesByThread[t.id]) {
        titlesByThread[t.id] = computeDisplayTitle(t);
      }
    });

    await enrichThreadsFromMessages(threads);

    threads.forEach(t => {
      const current = titlesByThread[t.id];
      if (!current || current === "Direct message" || current === "Group") {
        titlesByThread[t.id] = computeDisplayTitle(t);
      }
    });

    renderThreads(threads);
  }

  // Fetches messages for a specific thread, renders them, and updates the header.
  async function openThread(id){
    activeId = id;
    const msgs = await api.getThreadMessages(id);
    const t    = threads.find(x => x.id === id) || { title:"Conversation", kind:"DIRECT" };

    const headTitle = titlesByThread[id] || computeDisplayTitle(t);
    $title().textContent = headTitle;

    let partIds = Array.isArray(t.participants) ? t.participants : [];
    if (!partIds.length) {
      const ids = Array.from(new Set(
        msgs.map(m => Number(m.sender_id)).filter(Boolean)
      ));
      partIds = ids;
      t.participants = ids;
    }
    const fullNames = namesFor(partIds, { excludeMe:false });
    $sub().textContent = fullNames.length
      ? fullNames.join(" • ")
      : `Thread #${id} • ${t.kind}`;

    renderMessages(msgs);
    startPolling();
  }

  // Sends the message from the input box to the active thread and refreshes messages.
  async function onSend(){
    const body = $input().value.trim();
    if (!activeId || !body) return;

    $send().disabled = true;
    try{
      await api.sendMessage(activeId, body);
      $input().value = "";
      const msgs = await api.getThreadMessages(activeId);
      renderMessages(msgs);
    } finally {
      $send().disabled = false;
    }
  }

  // Starts a polling interval to refresh messages for the active thread every 3 seconds.
  function startPolling(){
    if (poll) clearInterval(poll);
    poll = setInterval(async () => {
      if (!activeId) return;
      const msgs = await api.getThreadMessages(activeId);
      renderMessages(msgs);
    }, 3000);
  }

  // Opens the 'new thread' recipient-picker modal.
  function openModal(){
    $recipModal().style.display = "flex";
    loadUsersForModal();
  }

  // Closes the 'new thread' recipient-picker modal.
  function closeModal(){
    $recipModal().style.display = "none";
    if ($recipSearch()) $recipSearch().value = "";
  }

  // Fetches and displays the list of users (students/instructors) in the modal.
  async function loadUsersForModal(){
    try {
      const meId = Number(me.id);
      const rows = await api.getPeople();

      allUsers = rows
        .filter(u => String(u.role).toUpperCase() !== "ADMIN")
        .map(u => ({
          id: Number(u.id),
          full_name: u.full_name || u.fullName || u.name || "User",
          email: u.email || "",
          role: String(u.role || "").toUpperCase()
        }))
        .filter(u => u.id !== meId);

      renderUserList(allUsers);
    } catch (err) {
      $recipList().innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Error loading users</div>
          <div class="empty-state-message">${esc(err.message || "Unable to load")}</div>
        </div>`;
    }
  }

  // Renders the list of users in the 'new thread' modal.
  function renderUserList(rows){
    if (!rows.length){
      $recipList().innerHTML = `
        <div class="empty-state" style="padding:40px 20px;text-align:center">
          <div style="font-size:48px;opacity:.25;line-height:1">👤</div>
          <div class="empty-state-title">No people found</div>
          <div class="empty-state-message">There are no users available to message</div>
        </div>`;
      return;
    }

    $recipList().innerHTML = rows.map(p => `
      <label class="pick-row">
        <input class="pick-check" type="checkbox" value="${p.id}">
        <div class="pick-avatar">${esc((p.full_name || "U").slice(0,1))}</div>
        <div class="pick-info">
          <div class="pick-name">
            ${esc(p.full_name)}
            <span class="role-chip ${p.role==="INSTRUCTOR" ? "chip-inst" : "chip-stu"}">
              ${esc(p.role)}
            </span>
          </div>
          <div class="pick-email">${esc(p.email)}</div>
        </div>
      </label>
    `).join("");
  }

  // Filters the user list in the 'new thread' modal based on the search query.
  function filterUsers(q){
    const term = (q||"").toLowerCase();
    const filtered = !term ? allUsers :
      allUsers.filter(u =>
        u.full_name.toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
      );
    renderUserList(filtered);
  }

  // Creates a sorted, comma-separated key from a list of participant IDs.
  function participantsKey(ids){
    return (ids || [])
      .map(Number)
      .filter(Boolean)
      .sort((a,b)=>a-b)
      .join(",");
  }

  // Finds an existing thread that contains the exact same set of participants.
  function findExistingThreadForSelection(selectedIds){
    const mine = Number(me.id);
    const key = participantsKey([mine, ...selectedIds]);

    for (const t of threads){
      if (!Array.isArray(t.participants) || !t.participants.length) continue;
      if (participantsKey(t.participants) === key) return t.id;
    }
    return null;
  }

  // Creates a new thread from the users selected in the modal, or opens an existing one.
  async function createThreadFromSelection(){
    const checks = document.querySelectorAll('#recip-list input[type="checkbox"]:checked');
    const selectedIds = Array.from(checks).map(cb => Number(cb.value));

    if (!selectedIds.length){
      UI.showToast("Please select at least one person to message", "error");
      return;
    }

    const existingId = findExistingThreadForSelection(selectedIds);
    if (existingId){
      closeModal();
      await openThread(existingId);
      UI.showToast("Opening existing conversation", "success");
      return;
    }

    try{
      const meId = Number(me.id);
      const kind = selectedIds.length === 1 ? "DIRECT" : "GROUP";
      const resp = await api.createThread({ kind, participantIds: selectedIds });
      const threadId = resp.id;

      const allIds = [meId, ...selectedIds];
      const others = allIds.filter(id => id !== meId);
      const otherNames = others
        .map(id => usersById[id]?.full_name || allUsers.find(u => u.id === id)?.full_name)
        .filter(Boolean);

      if (kind === "DIRECT"){
        titlesByThread[threadId] = otherNames[0] || "Direct message";
      } else {
        titlesByThread[threadId] = formatGroupTitle(otherNames);
      }

      threads.push({
        id: threadId,
        kind,
        participants: allIds
      });

      closeModal();
      await loadThreads();
      await openThread(threadId);
      UI.showToast("Conversation ready", "success");
    } catch (error) {
      console.error("createThread error:", error);
      UI.showToast(`Error: ${error.message}`, "error");
    }
  }

  // Main initialization function for the chat application.
  async function init(){
    me = Auth.currentUser();
    me.role = String(me.role || "").toUpperCase();

    await loadDirectory();
    await loadThreads();

    $send().onclick = onSend;
    $input().addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey){
        e.preventDefault();
        onSend();
      }
    });

    $search().oninput = (e) => {
      const q = e.target.value.trim().toLowerCase();
      renderThreads(threads.filter(t => {
        const title = titlesByThread[t.id] || computeDisplayTitle(t);
        return title.toLowerCase().includes(q);
      }));
    };

    $newBtn().style.display = "inline-flex";
    $newBtn().onclick = openModal;

    if ($btnClose())  $btnClose().onclick  = closeModal;
    if ($btnCancel()) $btnCancel().onclick = closeModal;
    if ($btnStart())  $btnStart().onclick  = createThreadFromSelection;

    if ($recipSearch())
      $recipSearch().oninput = (e)=> filterUsers(e.target.value);

    $recipModal().addEventListener("click", (e) => {
      if (e.target.id === "recip-modal") closeModal();
    });
  }

  return { init, closeModal, createThreadFromSelection };
})();

window.Chat = Chat;
