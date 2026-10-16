"use strict";

/* =========================================
   OWNER BOOKING MANAGEMENT
   Reads the existing key "staynest_demo_booking_requests" (written by
   booking.js) through owner-data.js. Only ownerStatus / ownerUpdatedAt
   are added to a record; nothing else is changed or removed.
   Replace the StayNestOwner data calls with fetch() to Express later.
========================================= */

(function () {
  const O = window.StayNestOwner;
  const { $, $$, escapeHTML, money, formatDate, icon, showToast } = O;

  const STATUS_LABELS = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled"
  };

  const state = {
    bookings: [],
    properties: [],
    readable: true,
    filters: { search: "", status: "all", type: "all", sort: "newest" },
    busy: new Set(),
    detailsId: null
  };

  const el = {
    list: $("#bookingList"),
    resultsLine: $("#resultsLine"),
    emptyNone: $("#emptyNone"),
    emptySearch: $("#emptySearch"),
    emptyFiltered: $("#emptyFiltered"),
    warning: $("#storageWarning"),
    details: $("#detailsDialog"),
    contact: $("#contactDialog")
  };

  /* ---------- Data ---------- */

  function refresh() {
    const bookingResult = O.loadBookings();
    state.bookings = bookingResult.bookings;
    state.readable = bookingResult.readable;
    state.properties = O.loadProperties().properties;
  }

  // Combines a booking with its property (if the owner still lists it).
  function view(booking) {
    const property = state.properties.find(p => p.id === booking.propertyId) || null;
    return {
      booking,
      property,
      propertyName: property ? property.name : booking.propertyName,
      location: property ? O.propertyLocation(property) : "Location unavailable",
      type: property ? property.type : "",
      deposit: property ? property.deposit : null
    };
  }

  function findView(id) {
    const booking = state.bookings.find(b => b.id === id);
    return booking ? view(booking) : null;
  }

  function timestamp(booking) {
    const time = Date.parse(booking.submittedAt);
    return Number.isFinite(time) ? time : 0;
  }

  function visibleViews() {
    const { search, status, type, sort } = state.filters;
    const query = search.trim().toLowerCase();

    const list = state.bookings.map(view).filter(item => {
      const text = `${item.booking.guest.name} ${item.propertyName}`.toLowerCase();
      return (!query || text.includes(query)) &&
        (status === "all" || item.booking.ownerStatus === status) &&
        (type === "all" || item.type === type);
    });

    list.sort((a, b) => sort === "oldest"
      ? timestamp(a.booking) - timestamp(b.booking)
      : timestamp(b.booking) - timestamp(a.booking));

    return list;
  }

  /* ---------- Rendering ---------- */

  function renderStats() {
    const all = state.bookings;
    const count = status => all.filter(b => b.ownerStatus === status).length;
    const approved = all.filter(b => b.ownerStatus === "approved");

    $("#statTotal").textContent = all.length;
    $("#statPending").textContent = count("pending");
    $("#statApproved").textContent = approved.length;
    $("#statRejected").textContent = count("rejected");
    $("#statRent").textContent = money(approved.reduce((sum, b) => sum + O.monthlyRentFor(b), 0));
  }

  function actionButtons(item, small) {
    const status = item.booking.ownerStatus;
    const id = escapeHTML(item.booking.id);
    const size = small ? " btn-small" : "";
    const busy = state.busy.has(item.booking.id) ? " disabled" : "";
    const guest = escapeHTML(item.booking.guest.name);
    const buttons = [];

    if (status === "pending") {
      buttons.push(`<button class="btn btn-success${size}" type="button" data-action="approve" data-id="${id}"${busy} aria-label="Approve booking for ${guest}">${icon("check", 16)} Approve</button>`);
      buttons.push(`<button class="btn btn-danger-outline${size}" type="button" data-action="reject" data-id="${id}"${busy} aria-label="Reject booking for ${guest}">${icon("x", 16)} Reject</button>`);
    }
    if (status === "approved") {
      buttons.push(`<button class="btn btn-danger-outline${size}" type="button" data-action="cancel" data-id="${id}"${busy} aria-label="Cancel booking for ${guest}">${icon("close", 16)} Cancel booking</button>`);
    }
    return buttons.join("");
  }

  function cardMarkup(item) {
    const { booking } = item;
    const status = booking.ownerStatus;
    const id = escapeHTML(booking.id);
    const guest = escapeHTML(booking.guest.name);
    const unit = booking.unit === "person" ? "person" : "room";

    return `
      <article class="booking-card" data-status="${status}" data-id="${id}">
        <div class="guest-block">
          <span class="avatar" aria-hidden="true">${escapeHTML(O.initials(booking.guest.name))}</span>
          <div>
            <h2 class="guest-name">${guest}</h2>
            <p class="contact-line">${icon("mail", 14)} ${escapeHTML(booking.guest.email || "No email")}</p>
            <p class="contact-line">${icon("phone", 14)} ${escapeHTML(booking.guest.phone || "No phone")}</p>
          </div>
        </div>

        <div class="property-block">
          <h3>${escapeHTML(item.propertyName)}</h3>
          <p class="meta">${icon("pin", 14)} ${item.property ? escapeHTML(item.location) : '<span class="removed">No longer listed</span>'}</p>
          ${item.type ? `<span class="type-tag">${escapeHTML(item.type)}</span>` : ""}
        </div>

        <dl class="terms">
          <div><dt>Move-in</dt><dd>${escapeHTML(formatDate(booking.moveInDate))}</dd></div>
          <div><dt>Duration</dt><dd>${escapeHTML(booking.duration)}</dd></div>
          <div><dt>Monthly rent</dt><dd>${money(booking.price)} / ${unit}</dd></div>
          <div><dt>Security deposit</dt><dd>${item.deposit === null ? "Not set" : money(item.deposit)}</dd></div>
          <div><dt>Requested on</dt><dd>${escapeHTML(formatDate(booking.submittedAt))}</dd></div>
        </dl>

        <div class="card-side">
          <span class="badge badge-${status}">${STATUS_LABELS[status]}</span>
          <div class="card-actions">
            <button class="btn btn-small" type="button" data-action="view" data-id="${id}" aria-label="View details of booking by ${guest}">${icon("eye", 16)} View details</button>
            ${actionButtons(item, true)}
            <button class="btn btn-small" type="button" data-action="contact" data-id="${id}" aria-label="Contact ${guest}">${icon("phone", 16)} Contact guest</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    renderStats();
    O.renderHeader();
    el.warning.hidden = state.readable;

    const total = state.bookings.length;
    const list = visibleViews();
    const searching = Boolean(state.filters.search.trim());

    el.list.innerHTML = list.map(cardMarkup).join("");
    el.list.hidden = list.length === 0;

    const empty = list.length === 0;
    el.emptyNone.hidden = !(empty && total === 0);
    el.emptySearch.hidden = !(empty && total > 0 && searching);
    el.emptyFiltered.hidden = !(empty && total > 0 && !searching);

    if (!el.emptySearch.hidden) {
      $("#emptySearchText").textContent =
        `Nothing matches "${state.filters.search.trim()}". Check the spelling of the guest or property name.`;
    }

    el.resultsLine.textContent = total === 0
      ? ""
      : `Showing ${list.length} of ${total} ${total === 1 ? "request" : "requests"}`;

    if (el.details.open && state.detailsId) renderDetails(state.detailsId);
  }

  /* ---------- Details ---------- */

  function renderDetails(id) {
    const item = findView(id);
    if (!item) {
      el.details.close();
      return;
    }
    const { booking, property } = item;
    const status = booking.ownerStatus;
    const row = (label, value, wide) =>
      `<div${wide ? ' class="wide"' : ""}><dt>${label}</dt><dd>${value}</dd></div>`;
    const unit = booking.unit === "person" ? "person" : "room";

    $("#detailsTitle").textContent = `Booking request from ${booking.guest.name}`;
    $("#detailsSubtitle").textContent = `Reference ${booking.id}`;

    $("#detailsBody").innerHTML = `
      <div class="detail-status">
        <span class="badge badge-${status}">${STATUS_LABELS[status]}</span>
        ${booking.ownerUpdatedAt ? `<span class="field-hint">Updated ${escapeHTML(formatDate(booking.ownerUpdatedAt))}</span>` : ""}
      </div>

      <section class="detail-section">
        <h3>Guest</h3>
        <div class="detail-guest">
          <span class="avatar" aria-hidden="true">${escapeHTML(O.initials(booking.guest.name))}</span>
          <div><strong>${escapeHTML(booking.guest.name)}</strong></div>
        </div>
        <dl class="detail-grid">
          ${row("Email", escapeHTML(booking.guest.email || "Not provided"))}
          ${row("Phone", escapeHTML(booking.guest.phone || "Not provided"))}
          ${row("Occupants", escapeHTML(booking.occupants))}
          ${row("Message to owner", escapeHTML(booking.message || "No message."), true)}
        </dl>
      </section>

      <section class="detail-section">
        <h3>Property</h3>
        <dl class="detail-grid">
          ${row("Name", escapeHTML(item.propertyName))}
          ${row("Type", escapeHTML(item.type || "Not available"))}
          ${row("Location", escapeHTML(property ? item.location : "No longer listed"))}
          ${row("Address", escapeHTML(property && property.address ? property.address : "Not available"))}
          ${row("Property status", property ? escapeHTML(property.status.charAt(0).toUpperCase() + property.status.slice(1)) : "Removed from your listings")}
          ${row("Rooms available", property ? `${property.availableRooms} of ${property.totalRooms}` : "Not available")}
        </dl>
      </section>

      <section class="detail-section">
        <h3>Rental and booking</h3>
        <dl class="detail-grid">
          ${row("Plan", escapeHTML(booking.plan || "Not specified"))}
          ${row("Monthly rent", `${money(booking.price)} / ${unit}`)}
          ${row("Security deposit", item.deposit === null ? "Not set" : money(item.deposit))}
          ${row("Requested move-in", escapeHTML(formatDate(booking.moveInDate)))}
          ${row("Duration", escapeHTML(booking.duration))}
          ${row("Request date", escapeHTML(formatDate(booking.submittedAt)))}
        </dl>
      </section>`;

    $("#detailsFoot").innerHTML = `
      <button class="btn" type="button" data-close>Close</button>
      <button class="btn" type="button" data-action="contact" data-id="${escapeHTML(booking.id)}">${icon("phone", 16)} Contact guest</button>
      ${actionButtons(item, false)}`;
  }

  function openDetails(id) {
    state.detailsId = id;
    renderDetails(id);
    if (!el.details.open) el.details.showModal();
  }

  /* ---------- Contact ---------- */

  function openContact(id) {
    const item = findView(id);
    if (!item) return;
    const { guest } = item.booking;
    const digits = guest.phone.replace(/\D/g, "");
    const whatsapp = digits.length === 10 ? `91${digits}` : digits;
    const subject = encodeURIComponent(`Your StayNest request for ${item.propertyName}`);

    $("#contactSubtitle").textContent = guest.name;
    const buttons = [];
    if (guest.email) {
      buttons.push(`<a class="btn" href="mailto:${escapeHTML(guest.email)}?subject=${subject}">${icon("mail", 16)} Email ${escapeHTML(guest.email)}</a>`);
    }
    if (digits.length >= 7) {
      buttons.push(`<a class="btn" href="tel:+${whatsapp}">${icon("phone", 16)} Call ${escapeHTML(guest.phone)}</a>`);
      buttons.push(`<a class="btn" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">${icon("phone", 16)} WhatsApp ${escapeHTML(guest.phone)}</a>`);
    }
    if (!buttons.length) buttons.push('<p class="contact-note">This guest did not share an email or phone number.</p>');
    else buttons.push('<p class="contact-note">Opens your email, phone or WhatsApp app. StayNest does not send anything for you.</p>');

    $("#contactBody").innerHTML = buttons.join("");
    el.contact.showModal();
  }

  /* ---------- Status actions ---------- */

  const ACTIONS = {
    approve: { next: "approved", from: ["pending"], done: "approved" },
    reject: { next: "rejected", from: ["pending"], done: "rejected" },
    cancel: { next: "cancelled", from: ["approved"], done: "cancelled" }
  };

  async function changeStatus(action, id) {
    const config = ACTIONS[action];
    const item = findView(id);
    if (!config || !item) return;
    if (state.busy.has(id)) return; // ignore double clicks

    state.busy.add(id);
    try {
      if (action === "reject" || action === "cancel") {
        const guest = item.booking.guest.name;
        const confirmed = await O.confirmAction(action === "reject"
          ? {
            title: "Reject this booking request?",
            message: `${guest}'s request for ${item.propertyName} will be marked as rejected. The guest is not notified automatically.`,
            confirmLabel: "Reject request",
            danger: true
          }
          : {
            title: "Cancel this approved booking?",
            message: `${guest}'s approved booking for ${item.propertyName} will be cancelled and removed from your expected rent.`,
            confirmLabel: "Cancel booking",
            danger: true
          });
        if (!confirmed) return;
      }

      const result = O.setBookingStatus(id, config.next, config.from);
      if (!result.ok) {
        if (result.reason === "stale") {
          showToast(`This request is already ${result.current}. The list has been refreshed.`, "error");
        } else if (result.reason === "missing") {
          showToast("This request no longer exists.", "error");
        } else {
          showToast("Could not save the change. Check your browser storage settings.", "error");
        }
        refresh();
        return;
      }

      refresh();
      showToast(`Booking for ${item.booking.guest.name} ${config.done}.`);

      if (action === "approve") {
        const property = state.properties.find(p => p.id === item.booking.propertyId);
        if (!property) {
          showToast("Approved. Note: this property is no longer in your listings.", "info");
        } else if (property.status !== "active") {
          showToast(`Approved. Note: ${property.name} is ${property.status}, so new requests are paused.`, "info");
        } else if (property.availableRooms === 0) {
          showToast(`Approved. Note: ${property.name} shows no free rooms - update room counts in Property Management.`, "info");
        }
      }
    } finally {
      state.busy.delete(id);
      render();
    }
  }

  /* ---------- Events ---------- */

  function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const { action, id } = button.dataset;

    if (action === "clear") clearFilters();
    else if (action === "view") openDetails(id);
    else if (action === "contact") openContact(id);
    else if (ACTIONS[action]) changeStatus(action, id);
  }

  el.list.addEventListener("click", handleAction);
  el.details.addEventListener("click", handleAction);
  $$('[data-action="clear"]').forEach(b => b.addEventListener("click", clearFilters));

  el.details.addEventListener("click", event => {
    if (event.target.closest("[data-close]")) el.details.close();
  });
  el.details.addEventListener("close", () => { state.detailsId = null; });

  $$("dialog [data-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  [el.details, el.contact].forEach(O.closeOnBackdrop);

  $("#loadSamples").addEventListener("click", () => {
    if (O.loadSampleBookings()) {
      refresh();
      render();
      showToast("Sample booking requests added.");
    } else {
      showToast("Could not add sample requests. Saved data is unreadable.", "error");
    }
  });

  /* ---------- Filters ---------- */

  function syncFilters() {
    state.filters.search = $("#searchInput").value;
    state.filters.status = $("#statusFilter").value;
    state.filters.type = $("#typeFilter").value;
    state.filters.sort = $("#sortSelect").value;
    render();
  }

  function clearFilters() {
    $("#searchInput").value = "";
    $("#statusFilter").value = "all";
    $("#typeFilter").value = "all";
    $("#sortSelect").value = "newest";
    syncFilters();
    $("#searchInput").focus();
  }

  $("#filterForm").addEventListener("submit", event => event.preventDefault());
  $("#searchInput").addEventListener("input", syncFilters);
  ["#statusFilter", "#typeFilter", "#sortSelect"].forEach(s => $(s).addEventListener("change", syncFilters));
  $("#clearFilters").addEventListener("click", clearFilters);

  window.addEventListener("storage", event => {
    if (event.key === O.KEYS.bookings || event.key === O.KEYS.properties) {
      refresh();
      render();
    }
  });

  /* ---------- Init ---------- */

  function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const query = params.get("q");
    if (status && O.BOOKING_STATUSES.includes(status)) $("#statusFilter").value = status;
    if (query) $("#searchInput").value = query.slice(0, 80);
    syncFilters();
  }

  O.hydrateIcons();
  $("#year").textContent = new Date().getFullYear();
  refresh();
  applyUrlFilters();
})();
