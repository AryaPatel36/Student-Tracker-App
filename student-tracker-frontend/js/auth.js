const LS_TOKEN = "st_token";
const LS_USER  = "st_user";

// Logs in the user, stores auth token and user data in localStorage, and returns the user object.
async function doLogin(email, password) {
  const data = await api.login(email, password);
  if (!data?.token || !data?.user) throw new Error("Invalid login response");
  localStorage.setItem(LS_TOKEN, data.token);
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  return data.user;
}

// Clears auth token and user data from localStorage and redirects to the index page.
function logout() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
  location.href = "./index.html";
}

// Retrieves the current auth token from localStorage.
function token() {
  return localStorage.getItem(LS_TOKEN);
}

// Retrieves the currently logged-in user object from localStorage.
function currentUser() {
  const raw = localStorage.getItem(LS_USER);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

window.Auth = {
  login: doLogin,
  logout,
  token,
  currentUser,
};
