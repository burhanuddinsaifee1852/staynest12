
"use strict";

const $ = selector => document.querySelector(selector);

const loginTab = $("#loginTab");
const registerTab = $("#registerTab");
const loginPanel = $("#loginPanel");
const registerPanel = $("#registerPanel");
const authMessage = $("#authMessage");

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.hidden = false;
  authMessage.classList.toggle("error", isError);
}

function clearMessage() {
  authMessage.textContent = "";
  authMessage.hidden = true;
  authMessage.classList.remove("error");
}

function setMode(mode) {
  const isLogin = mode === "login";

  loginPanel.hidden = !isLogin;
  registerPanel.hidden = isLogin;

  loginTab.classList.toggle("active", isLogin);
  registerTab.classList.toggle("active", !isLogin);

  loginTab.setAttribute("aria-selected", String(isLogin));
  registerTab.setAttribute("aria-selected", String(!isLogin));

  clearMessage();
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

document.querySelectorAll("[data-switch]").forEach(button => {
  button.addEventListener("click", () => {
    setMode(button.dataset.switch);
  });
});

/* Show/hide password */
document.querySelectorAll("[data-toggle-password]").forEach(button => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const shouldShow = input.type === "password";

    input.type = shouldShow ? "text" : "password";
    button.textContent = shouldShow ? "Hide" : "Show";
    button.setAttribute(
      "aria-label",
      shouldShow ? "Hide password" : "Show password"
    );
  });
});

/* Password strength: helpful feedback, not a security check */
const registerPassword = $("#registerPassword");
const passwordStrength = $("#passwordStrength");

registerPassword.addEventListener("input", () => {
  const password = registerPassword.value;
  let score = 0;

  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  passwordStrength.className = "password-strength";

  if (!password) {
    passwordStrength.textContent = "Use at least 8 characters.";
  } else if (score <= 1) {
    passwordStrength.textContent = "Weak password — add length and variety.";
    passwordStrength.classList.add("weak");
  } else if (score <= 2) {
    passwordStrength.textContent = "Moderate password — consider adding more variety.";
    passwordStrength.classList.add("medium");
  } else {
    passwordStrength.textContent = "Good password strength.";
    passwordStrength.classList.add("strong");
  }
});


/* Demo session: stores only a display name, email and role. Never a password. */
function selectedRole() {
  const checked = document.querySelector('input[name="role"]:checked');
  return checked && checked.value === "owner" ? "owner" : "tenant";
}

function nameFromEmail(email) {
  const local = email.split("@")[0].replace(/[^A-Za-z]+/g, " ").trim();
  const stored = window.StayNest.readRaw(window.StayNest.KEYS.profile);
  if (stored.ok && stored.value && stored.value.email === email && stored.value.name) return stored.value.name;
  return local ? local.replace(/\b\w/g, c => c.toUpperCase()) : "StayNest Member";
}

function startDemoSession(name, email) {
  const S = window.StayNest;
  const role = selectedRole();
  if (!S.setSession({ name, email, role })) {
    showMessage("Could not start the demo session. Check your browser storage settings.", true);
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  const safeNext = next && /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(next) ? next : "";
  const target = role === "owner" ? "owner-dashboard.html" : (safeNext || "dashboard.html");
  showMessage(`Welcome, ${name}. Taking you to your ${role === "owner" ? "owner dashboard" : "account"}...`);
  setTimeout(() => { window.location.href = target; }, 700);
}

/* Login form */
$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();
  clearMessage();

  if (!event.currentTarget.reportValidity()) return;

  /*
   * Frontend demo only.
   * Do not save passwords in localStorage.
   * Connect this form to your Express login API later.
   */
  const email = $("#loginEmail").value.trim();
  startDemoSession(nameFromEmail(email), email);
});

/* Register form */
$("#registerForm").addEventListener("submit", event => {
  event.preventDefault();
  clearMessage();

  const form = event.currentTarget;

  if (!form.reportValidity()) return;

  const password = $("#registerPassword").value;
  const confirmPassword = $("#confirmPassword").value;
  const acceptedTerms = $("#acceptTerms").checked;

  if (password.length < 8) {
    showMessage("Your password must contain at least 8 characters.", true);
    $("#registerPassword").focus();
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match. Please try again.", true);
    $("#confirmPassword").focus();
    return;
  }

  if (!acceptedTerms) {
    showMessage("Please accept the terms and privacy policy.", true);
    $("#acceptTerms").focus();
    return;
  }

  /*
   * Frontend demo only.
   * No account is created and no password is stored.
   * Connect this form to your Express registration API later.
   */
  const name = $("#registerName").value.trim();
  const email = $("#registerEmail").value.trim();
  window.StayNest.writeJSON(window.StayNest.KEYS.profile, { name, email, phone: "", city: "Indore" });
  startDemoSession(name, email);
});

/* Forgot password: UI only until email/reset API is implemented */
$("#forgotPassword").addEventListener("click", () => {
  clearMessage();

  const emailInput = $("#loginEmail");
  const email = emailInput.value.trim();

  if (!email) {
    showMessage("Enter your email address first to request a password reset.", true);
    emailInput.focus();
    return;
  }

  if (!emailInput.checkValidity()) {
    showMessage("Please enter a valid email address.", true);
    emailInput.focus();
    return;
  }

  showMessage(
    `Password reset is not connected yet. A reset email would be requested for ${email} after the backend is implemented.`
  );
});

/* Google and Facebook are visual placeholders, not real OAuth */
document.querySelectorAll("[data-social]").forEach(button => {
  button.addEventListener("click", () => {
    const provider = button.dataset.social;

    showMessage(
      `${provider} sign-in is not configured yet. It requires OAuth setup and a backend authentication flow.`
    );
  });
});

window.StayNest.mountSiteShell("account");
window.StayNest.hydrateIcons();
