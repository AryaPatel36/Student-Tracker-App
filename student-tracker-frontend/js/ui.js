// Redirects the user to the appropriate dashboard page based on their role.
function goToDashboard(role){
  if (role === "ADMIN")        location.href = "./admin.html";
  else if (role === "INSTRUCTOR") location.href = "./instructor.html";
  else                          location.href = "./student.html";
}

// Redirects to the index page if the user is not logged in or doesn't have the expected role.
function guardRole(expected){
  const u = Auth.currentUser();
  if (!u) return location.replace("./index.html");
  if (expected && u.role !== expected) return location.replace("./index.html");
}

// Renders the main navigation bar, customizing it based on the user's role and current page.
function mountNav(roleText = "") {
  const nav = document.querySelector("#nav");
  if (!nav) return;

  const u = Auth.currentUser();
  const path = location.pathname.toLowerCase();
  const isAdminPage = path.endsWith("admin.html");

  let dashboardHref = "./index.html";
  if (u) {
    if (u.role === "ADMIN") dashboardHref = "./admin.html";
    else if (u.role === "INSTRUCTOR") dashboardHref = "./instructor.html";
    else dashboardHref = "./student.html";
  }

  const isChat = path.includes("chat");
  const isDashboard = !isChat && !isAdminPage;

  nav.innerHTML = `
    <div class="navbar">
      <!-- left: brand -->
      <div class="brand">Student Tracker</div>

      <!-- center: pill (hidden on admin.html) -->
      <div class="nav-center">
        ${u && !isAdminPage ? `
        <div class="nav-pill">
          <a href="${dashboardHref}"
             class="nav-pill-item ${isDashboard ? "active" : ""}"
             aria-label="Dashboard">
            <svg viewBox="0 0 24 24" class="nav-pill-icon">
              <path d="M4 11.5L12 4l8 7.5"></path>
              <path d="M7 11v8h4v-4h2v4h4v-8"></path>
            </svg>
            <span>Dashboard</span>
          </a>

          <a href="./chat.html"
             class="nav-pill-item ${isChat ? "active" : ""}"
             aria-label="Chat">
            <svg viewBox="0 0 24 24" class="nav-pill-icon">
              <path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"></path>
              <path d="M8 10h8"></path>
              <path d="M8 13h4"></path>
            </svg>
            <span>Chat</span>
          </a>
        </div>
        ` : ``}
      </div>

      <!-- right: user + logout (still shown on admin) -->
      ${u ? `
      <div class="user-chip">
        <span class="user-role">${roleText || u.role}</span>
        <span class="user-dot">•</span>
        <span class="user-name">${u.fullName || u.email}</span>
        <button class="btn-link" id="btnLogout" title="Sign out">Logout</button>
      </div>
      ` : ``}
    </div>
  `;

  document.querySelector("#btnLogout")?.addEventListener("click", () => Auth.logout());
}

// Populates a table body with data, using a mapping function to create cells for each row.
function renderTable(tbodyId, data, mapFn) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; opacity:0.6;">No data</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(item => {
    const cells = mapFn(item);
    return `<tr class="fade-in">${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
  }).join('');
}

// Displays a toast notification on the screen with a message, type, and duration.
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Toggles the loading state of a button, disabling it and showing a spinner.
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.classList.add('loading');
    button.dataset.originalText = button.textContent;
    button.textContent = '';
  } else {
    button.disabled = false;
    button.classList.remove('loading');
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

// Displays a custom confirmation modal and returns a Promise that resolves with true/false.
function showConfirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger') {
  return new Promise((resolve) => {
    const existing = document.getElementById('confirm-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal';
    modal.style.display = 'flex';

    const iconColors = {
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#6366f1'
    };

    const icons = {
      danger: '⚠️',
      warning: '⚠️',
      info: 'ℹ️'
    };

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 28px;">${icons[type] || icons.danger}</span>
            <h2 style="margin: 0;">${title}</h2>
          </div>
        </div>
        <div class="modal-body">
          <p style="margin: 0; line-height: 1.6; color: var(--ink-soft);">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="confirm-cancel">${cancelText}</button>
          <button class="btn btn-primary" id="confirm-ok" style="background: ${iconColors[type] || iconColors.danger}; border-color: ${iconColors[type] || iconColors.danger};">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = (result) => {
      modal.style.animation = 'modalFadeIn 0.3s var(--ease-out-expo) reverse';
      setTimeout(() => {
        modal.remove();
        resolve(result);
      }, 300);
    };

    document.getElementById('confirm-ok').addEventListener('click', () => closeModal(true));
    document.getElementById('confirm-cancel').addEventListener('click', () => closeModal(false));
    
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'confirm-modal') closeModal(false);
    });

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal(false);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

window.UI = { goToDashboard, guardRole, mountNav, renderTable, showToast, setButtonLoading, showConfirm };
