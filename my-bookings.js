"use strict";

/* =========================================
   MY STAY REQUESTS
   Reads the same key the owner's Booking Management page uses
   (staynest_demo_booking_requests), so an owner's decision shows here.
   Demo requests seeded for the owner pages (isSample) are not shown.
   Frontend prototype: localStorage only.
========================================= */

(function () {
  const S = window.StayNest;
  const { $, $$, escapeHTML, money, formatDate, icon, imageTag } = S;

  S.mountSiteShell("requests");
  S.hydrateIcons();

  const STATUS = {
    pending: { label: "Awaiting owner approval", badge: "badge-warn", icon: "hourglass" },
    approved: { label: "Approved", badge: "badge-ok", icon: "check" },
    rejected: { label: "Not accepted", badge: "badge-bad", icon: "x" },
    cancelled: { label: "Cancelled", badge: "badge-mute", icon: "close" }
  };

  const state = { filter: "all", requests: [], busy: new Set(), detailsId: null };

  function mine() {
    const session = S.getSession();
    return S.loadBookings().bookings
      .filter(b => !b.isSample)
      .filter(b => !session || !session.email || !b.guest.email || b.guest.email.toLowerCase() === session.email.toLowerCase())
      .sort((a, b) => Date.parse(b.submittedAt || 0) - Date.parse(a.submittedAt || 0));
  }

  function inFilter(booking) {
    const s = booking.ownerStatus;
    if (state.filter === "all") return true;
    if (state.filter === "closed") return s === "rejected" || s === "cancelled";
    return s === state.filter;
  }

  function noteFor(b) {
    if (b.ownerStatus === "approved") return '<p class="request-note note-ok">The owner approved your request. Contact the owner to finalise move-in details.</p>';
    if (b.ownerStatus === "rejected") return '<p class="request-note note-bad">The owner could not accept this request. You can explore other stays.</p>';
    if (b.ownerStatus === "cancelled") return `<p class="request-note note-mute">${b.cancelledBy === "tenant" ? "You withdrew this request." : "This booking was cancelled by the owner."}</p>`;
    return "";
  }

  function cardMarkup(b) {
    const property = S.getProperty(b.propertyId);
    const status = STATUS[b.ownerStatus];
    const id = escapeHTML(b.id);
    const unit = b.unit === "person" ? "person" : "room";
    const deposit = b.deposit ?? (property ? property.deposit : null);
    const busy = state.busy.has(b.id) ? " disabled" : "";

    return `
      <article class="request-card" data-id="${id}">
        <div class="request-photo">${imageTag(property ? property.image : "", b.propertyName)}</div>
        <div>
          <div class="request-top">
            <div>
              <h2>${escapeHTML(b.propertyName)}</h2>
              <p class="sub">${icon("bed", 15)} ${escapeHTML(b.plan || "Room")} &nbsp;·&nbsp; ${icon("pin", 15)} ${escapeHTML(property ? S.propertyLocation(property) : "Location unavailable")}</p>
            </div>
            <div class="request-meta">
              <span class="badge ${status.badge}">${icon(status.icon, 14)} ${status.label}</span>
              <small>Requested on ${escapeHTML(formatDate(b.submittedAt))}</small>
            </div>
          </div>
          <div class="fact-row">
            <div class="fact">${icon("calendar", 18)}<div><small>Move-in date</small><strong>${escapeHTML(formatDate(b.moveInDate))}</strong></div></div>
            <div class="fact">${icon("rupee", 18)}<div><small>Monthly rent</small><strong>${money(b.price)} / ${unit}</strong></div></div>
            <div class="fact">${icon("shield", 18)}<div><small>Security deposit</small><strong>${deposit === null ? "Not set" : money(deposit)}</strong></div></div>
            <div class="fact">${icon("zap", 18)}<div><small>Electricity</small><strong>${escapeHTML(property ? property.rules.electricity : "As billed")}</strong></div></div>
          </div>
          ${noteFor(b)}
          <div class="request-actions">
            <button class="btn btn-sm" type="button" data-action="view" data-id="${id}">View details</button>
            ${["pending", "approved"].includes(b.ownerStatus)
              ? `<button class="btn btn-sm btn-danger" type="button" data-action="withdraw" data-id="${id}"${busy}>Withdraw request</button>` : ""}
            ${property ? `<a class="btn btn-sm btn-ghost" href="details.html?id=${encodeURIComponent(property.id)}">View stay</a>` : ""}
          </div>
        </div>
      </article>`;
  }

  function renderVisits() {
    const visits = S.loadVisits();
    $("#visitsSection").hidden = visits.length === 0;
    $("#visitList").innerHTML = visits.map(v => {
      const date = new Date(`${v.date}T00:00:00`);
      const valid = !Number.isNaN(date.getTime());
      return `
        <li data-id="${escapeHTML(v.id)}">
          <span class="when">${valid ? `<span>${date.getDate()}<small>${date.toLocaleString("en-IN", { month: "short" })}</small></span>` : icon("calendar", 22)}</span>
          <div class="what"><strong>${escapeHTML(v.propertyName)}</strong><span>${escapeHTML(formatDate(v.date))} · ${escapeHTML(v.time)}${v.roomName ? ` · ${escapeHTML(v.roomName)}` : ""}</span></div>
          <span class="badge badge-warn">Waiting for owner</span>
          <button class="btn btn-sm btn-danger" type="button" data-action="cancel-visit" data-id="${escapeHTML(v.id)}">Cancel visit</button>
        </li>`;
    }).join("");
  }

  function render() {
    state.requests = mine();
    const count = fn => state.requests.filter(fn).length;
    $("#countAll").textContent = state.requests.length;
    $("#countPending").textContent = count(b => b.ownerStatus === "pending");
    $("#countApproved").textContent = count(b => b.ownerStatus === "approved");
    $("#countClosed").textContent = count(b => b.ownerStatus === "rejected" || b.ownerStatus === "cancelled");

    const list = state.requests.filter(inFilter);
    $("#requestList").innerHTML = list.map(cardMarkup).join("");
    $("#requestList").hidden = list.length === 0;
    $("#emptyAll").hidden = state.requests.length !== 0;
    $("#emptyFilter").hidden = !(state.requests.length && list.length === 0);
    $("#tabs").hidden = state.requests.length === 0;
    renderVisits();
    S.renderHeader && S.renderHeader();
    if ($("#detailsDialog").open && state.detailsId) renderDetails(state.detailsId);
  }

  function renderDetails(id) {
    const b = state.requests.find(x => x.id === id);
    if (!b) { $("#detailsDialog").close(); return; }
    const property = S.getProperty(b.propertyId);
    const row = (k, v, wide) => `<div${wide ? ' class="wide"' : ""}><dt>${k}</dt><dd>${v}</dd></div>`;
    $("#detailsTitle").textContent = b.propertyName;
    $("#detailsSub").textContent = `Reference ${b.id}`;
    $("#detailsBody").innerHTML = `
      <p style="margin-bottom:16px"><span class="badge ${STATUS[b.ownerStatus].badge}">${STATUS[b.ownerStatus].label}</span></p>
      <dl class="detail-grid">
        ${row("Room", escapeHTML(b.plan || "Not specified"))}
        ${row("Location", escapeHTML(property ? S.propertyLocation(property) : "Location unavailable"))}
        ${row("Move-in date", escapeHTML(formatDate(b.moveInDate)))}
        ${row("Duration", escapeHTML(b.duration))}
        ${row("Occupants", escapeHTML(b.occupants))}
        ${row("Monthly rent", `${money(b.price)} / ${b.unit}`)}
        ${row("Requested on", escapeHTML(formatDate(b.submittedAt)))}
        ${row("Your details", `${escapeHTML(b.guest.name)}<br>${escapeHTML(b.guest.email)}<br>${escapeHTML(b.guest.phone)}`, true)}
        ${row("Your message", escapeHTML(b.message || "No message."), true)}
      </dl>`;
  }

  async function withdraw(id) {
    const b = state.requests.find(x => x.id === id);
    if (!b || state.busy.has(id)) return;
    state.busy.add(id);
    try {
      const ok = await S.confirmAction({
        title: "Withdraw this request?",
        message: `Your request for ${b.propertyName} will be cancelled. You can send a new request later.`,
        confirmLabel: "Withdraw request",
        danger: true
      });
      if (!ok) return;
      const result = S.setBookingStatus(id, "cancelled", ["pending", "approved"], { cancelledBy: "tenant" });
      if (!result.ok) {
        S.showToast(result.reason === "stale" ? `This request is already ${result.current}.` : "Could not update the request.", "error");
      } else {
        S.showToast("Request withdrawn.", "info");
      }
    } finally {
      state.busy.delete(id);
      render();
    }
  }

  $("#requestList").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "view") {
      state.detailsId = button.dataset.id;
      renderDetails(state.detailsId);
      $("#detailsDialog").showModal();
    } else if (button.dataset.action === "withdraw") {
      withdraw(button.dataset.id);
    }
  });

  $("#visitList").addEventListener("click", event => {
    const button = event.target.closest('[data-action="cancel-visit"]');
    if (!button) return;
    S.removeVisit(button.dataset.id);
    S.showToast("Visit cancelled.", "info");
    renderVisits();
  });

  $("#tabs").addEventListener("click", event => {
    const tab = event.target.closest("[data-filter]");
    if (!tab) return;
    state.filter = tab.dataset.filter;
    $$(".tab").forEach(t => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    render();
  });
  $("#showAll").addEventListener("click", () => {
    state.filter = "all";
    $$(".tab").forEach(t => {
      const active = t.dataset.filter === "all";
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    render();
  });

  $$("dialog [data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
  S.closeOnBackdrop($("#detailsDialog"));
  $("#detailsDialog").addEventListener("close", () => { state.detailsId = null; });

  window.addEventListener("storage", event => {
    if (event.key === S.KEYS.bookings || event.key === S.TENANT_KEYS.visits) render();
  });

  render();
})();
