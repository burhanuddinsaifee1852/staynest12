"use strict";

/* =========================================
   TENANT DASHBOARD
   Saved stays: staynest_saved. Requests: staynest_demo_booking_requests.
   Visits: staynest_demo_visits. Profile: staynest_demo_profile.
   Frontend prototype only; there is no real login.
========================================= */

(function () {
  const S = window.StayNest;
  const { $, $$, escapeHTML, money, formatDate, icon, imageTag } = S;

  S.mountSiteShell("account");
  S.hydrateIcons();

  const VIEWS = ["overview", "saved", "visits", "requests", "account"];
  const STATUS = {
    pending: ["Awaiting owner approval", "badge-warn"], approved: ["Approved", "badge-ok"],
    rejected: ["Not accepted", "badge-bad"], cancelled: ["Cancelled", "badge-mute"]
  };

  function readProfile() {
    const result = S.readRaw(S.KEYS.profile);
    const p = result.ok && result.value && typeof result.value === "object" && !Array.isArray(result.value) ? result.value : {};
    const session = S.getSession();
    return {
      name: String(p.name || (session && session.name) || "").trim(),
      email: String(p.email || (session && session.email) || "").trim(),
      phone: String(p.phone || "").trim(),
      city: String(p.city || "Indore").trim()
    };
  }

  function myRequests() {
    return S.loadBookings().bookings.filter(b => !b.isSample)
      .sort((a, b) => Date.parse(b.submittedAt || 0) - Date.parse(a.submittedAt || 0));
  }

  function savedProperties() {
    const saved = S.readSaved();
    const all = S.loadProperties().properties;
    return saved.map(id => all.find(p => p.id === id)).filter(Boolean);
  }

  /* ---------- Side panel ---------- */

  function renderSide() {
    const profile = readProfile();
    const name = profile.name || "StayNest member";
    $("#sideName").textContent = name;
    $("#sideEmail").textContent = profile.email || "Demo account";
    $("#sideAvatar").textContent = S.initials(name === "StayNest member" ? "S" : name);

    const set = (id, n) => { const b = $(id); b.textContent = n; b.hidden = n === 0; };
    set("#sideSaved", savedProperties().length);
    set("#sideVisits", S.loadVisits().length);
    set("#sideRequests", myRequests().filter(b => b.ownerStatus === "pending" || b.ownerStatus === "approved").length);
  }

  /* ---------- Views ---------- */

  function requestRow(b) {
    const [label, badge] = STATUS[b.ownerStatus];
    return `<div class="mini-row"><div class="what"><strong>${escapeHTML(b.propertyName)}</strong>
      <span>${escapeHTML(b.plan || "Room")} · move-in ${escapeHTML(formatDate(b.moveInDate))} · ${money(b.price)}/${b.unit}</span></div>
      <span class="badge ${badge}">${label}</span></div>`;
  }

  function visitRow(v) {
    return `<div class="mini-row"><div class="what"><strong>${escapeHTML(v.propertyName)}</strong>
      <span>${escapeHTML(formatDate(v.date))} · ${escapeHTML(v.time)}</span></div>
      <span class="badge badge-warn">Waiting for owner</span></div>`;
  }

  function savedCard(p) {
    const unit = p.unit === "person" ? "person" : "room";
    return `
      <article class="stay-card">
        <div class="stay-media">${imageTag(p.image, p.name)}
          <button class="stay-heart" type="button" data-unsave="${escapeHTML(p.id)}" aria-pressed="true" aria-label="Remove ${escapeHTML(p.name)} from saved">${icon("heart", 18)}</button></div>
        <div class="stay-body">
          <h3 class="stay-title">${escapeHTML(p.name)}</h3>
          <p class="stay-loc">${icon("pin", 15)} ${escapeHTML(S.propertyLocation(p))}</p>
          <p class="stay-price" style="text-align:left">${money(p.price)} <small style="display:inline">/ ${unit} / month</small></p>
          ${S.isBookable(p) ? "" : '<span class="badge badge-mute">Not accepting requests</span>'}
          <div class="stay-foot"><a class="btn btn-block btn-sm" href="details.html?id=${encodeURIComponent(p.id)}">View stay ${icon("arrow", 15)}</a></div>
        </div>
      </article>`;
  }

  const empty = (iconName, title, text, href, label) => `
    <section class="empty-state"><span class="empty-icon">${icon(iconName, 30)}</span><h2>${title}</h2><p>${text}</p>
    <div class="empty-actions"><a class="btn btn-primary" href="${href}">${label}</a></div></section>`;

  const renderers = {
    overview() {
      const profile = readProfile();
      const requests = myRequests();
      const saved = savedProperties();
      const visits = S.loadVisits();
      const active = requests.filter(b => b.ownerStatus === "pending" || b.ownerStatus === "approved");
      return `
        ${S.getSession() ? "" : `<p class="login-banner">${icon("info", 18)} You are browsing without logging in. <a class="btn btn-sm btn-primary" href="login.html">Log in (demo)</a></p>`}
        <h1 class="dash-title">Hello, ${escapeHTML(profile.name.split(/\s+/)[0] || "there")}!</h1>
        <p class="dash-sub">Your stays, visits and requests at a glance.</p>
        <div class="stat-grid">
          <div class="stat"><span class="round">${icon("heart", 22)}</span><div><strong>${saved.length}</strong><span class="l">Saved stays</span></div></div>
          <div class="stat"><span class="round">${icon("file", 22)}</span><div><strong>${active.length}</strong><span class="l">Active requests</span></div></div>
          <div class="stat"><span class="round">${icon("calendar", 22)}</span><div><strong>${visits.length}</strong><span class="l">Scheduled visits</span></div></div>
        </div>
        <div class="block-head"><h2>Recent stay requests</h2><a class="link-arrow" href="my-bookings.html">Manage requests ${icon("arrow", 15)}</a></div>
        ${requests.length ? `<div class="mini-list">${requests.slice(0, 3).map(requestRow).join("")}</div>`
          : empty("file", "No stay requests yet", "Find a stay you like and send your first request.", "listings.html", "Explore stays")}
        <div class="block-head"><h2>Saved stays</h2><a class="link-arrow" href="#saved">View all ${icon("arrow", 15)}</a></div>
        ${saved.length ? `<div class="saved-grid">${saved.slice(0, 3).map(savedCard).join("")}</div>`
          : empty("heart", "Your shortlist starts here.", "Save stays you like and compare them here.", "listings.html", "Explore stays")}`;
    },
    saved() {
      const saved = savedProperties();
      return `<h1 class="dash-title">Your saved stays</h1><p class="dash-sub">${saved.length} saved ${saved.length === 1 ? "property" : "properties"}</p>
        ${saved.length ? `<div class="saved-grid">${saved.map(savedCard).join("")}</div>`
          : empty("heart", "Your shortlist starts here.", "Save stays you like with the heart icon.", "listings.html", "Explore stays")}`;
    },
    visits() {
      const visits = S.loadVisits();
      return `<h1 class="dash-title">My visits</h1><p class="dash-sub">Visits you asked owners for.</p>
        ${visits.length ? `<div class="mini-list">${visits.map(visitRow).join("")}</div>`
          : empty("calendar", "No visits scheduled", "Open any stay and choose Schedule a visit.", "listings.html", "Explore stays")}`;
    },
    requests() {
      const requests = myRequests();
      return `<h1 class="dash-title">My stay requests</h1><p class="dash-sub">Follow each request and the owner's decision.</p>
        ${requests.length ? `<div class="mini-list">${requests.map(requestRow).join("")}</div>
          <p style="margin-top:16px"><a class="btn btn-primary" href="my-bookings.html">Open full request view</a></p>`
          : empty("file", "No stay requests yet", "Your requests will appear here.", "listings.html", "Explore stays")}`;
    },
    account() {
      const p = readProfile();
      return `<h1 class="dash-title">My account</h1><p class="dash-sub">Demo details stored only in this browser.</p>
        <form class="account-card" id="profileForm" novalidate>
          <div class="form-grid">
            <div class="field span-2" data-field="name"><label for="pfName">Full name</label>
              <input class="input" id="pfName" value="${escapeHTML(p.name)}" maxlength="80" autocomplete="name"><p class="field-error" hidden></p></div>
            <div class="field" data-field="email"><label for="pfEmail">Email address</label>
              <input class="input" id="pfEmail" type="email" value="${escapeHTML(p.email)}" autocomplete="email"><p class="field-error" hidden></p></div>
            <div class="field" data-field="phone"><label for="pfPhone">Mobile number</label>
              <input class="input" id="pfPhone" type="tel" value="${escapeHTML(p.phone)}" placeholder="+91 98765 43210" autocomplete="tel"><p class="field-error" hidden></p></div>
            <div class="field span-2" data-field="city"><label for="pfCity">City</label>
              <input class="input" id="pfCity" value="${escapeHTML(p.city)}" maxlength="60"></div>
          </div>
          <div class="actions"><button class="btn btn-primary" type="submit">Save changes</button></div>
        </form>`;
    }
  };

  function currentView() {
    const hash = window.location.hash.replace("#", "");
    return VIEWS.includes(hash) ? hash : "overview";
  }

  function render() {
    const view = currentView();
    $("#panel").innerHTML = renderers[view]();
    $$("#dashNav [data-view]").forEach(a => {
      const active = a.dataset.view === view;
      a.classList.toggle("is-active", active);
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    renderSide();
    S.updateSavedCount();
    document.title = `${{ overview: "My account", saved: "Saved stays", visits: "My visits", requests: "My stay requests", account: "Account settings" }[view]} | StayNest`;
  }

  /* ---------- Events ---------- */

  $("#panel").addEventListener("click", event => {
    const unsave = event.target.closest("[data-unsave]");
    if (unsave) {
      S.toggleSaved(unsave.dataset.unsave);
      S.showToast("Removed from your shortlist.", "info");
      render();
    }
  });

  $("#panel").addEventListener("submit", event => {
    if (event.target.id !== "profileForm") return;
    event.preventDefault();
    const form = event.target;
    const name = $("#pfName").value.trim();
    const email = $("#pfEmail").value.trim();
    const phone = $("#pfPhone").value.trim();

    const fail = (field, message) => {
      const wrap = $(`[data-field="${field}"]`, form);
      wrap.classList.toggle("has-error", Boolean(message));
      const err = $(".field-error", wrap);
      if (err) { err.textContent = message; err.hidden = !message; }
      return Boolean(message);
    };
    const errors = [
      fail("name", name.length < 2 ? "Enter your full name." : ""),
      fail("email", email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "Enter a valid email address." : ""),
      fail("phone", phone && !/^(\+91|91|0)?[6-9]\d{9}$/.test(phone.replace(/[\s\-()]/g, "")) ? "Enter a valid 10-digit Indian mobile number." : "")
    ];
    if (errors.some(Boolean)) return;

    const ok = S.writeJSON(S.KEYS.profile, { name, email, phone, city: $("#pfCity").value.trim() || "Indore" });
    if (!ok) { S.showToast("Could not save your details.", "error"); return; }
    const session = S.getSession();
    if (session) S.setSession({ ...session, name, email });
    S.showToast("Profile updated.");
    S.mountSiteShell("account");
    S.hydrateIcons();
    render();
  });

  $("#logoutBtn").addEventListener("click", () => {
    S.setSession(null);
    S.showToast("You have been logged out.", "info");
    setTimeout(() => { window.location.href = "index.html"; }, 700);
  });

  window.addEventListener("hashchange", () => { render(); $("#panel").focus({ preventScroll: true }); });
  window.addEventListener("storage", render);

  render();
})();
