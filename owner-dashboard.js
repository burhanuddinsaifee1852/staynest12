"use strict";

/* =========================================
   OWNER DASHBOARD HOME
   Summary of data owned by owner-properties and owner-booking.
   Reads through owner-data.js only (localStorage prototype).
========================================= */

(function () {
  const O = window.StayNestOwner;
  const { $, escapeHTML, money, formatDate } = O;

  function render() {
    const properties = O.loadProperties().properties;
    const bookings = O.loadBookings().bookings;

    const active = properties.filter(p => p.status === "active");
    const pending = bookings.filter(b => b.ownerStatus === "pending");
    const approved = bookings.filter(b => b.ownerStatus === "approved");
    const drafts = properties.filter(p => p.status === "draft").length;

    $("#statProperties").textContent = properties.length;
    $("#statPropertiesHint").textContent = `${active.length} active, ${drafts} draft`;
    $("#statRooms").textContent = active.reduce((sum, p) => sum + p.availableRooms, 0);
    $("#statPending").textContent = pending.length;
    $("#statRent").textContent = money(approved.reduce((sum, b) => sum + O.monthlyRentFor(b), 0));

    const profile = O.ownerProfile();
    $("#welcomeName").textContent = profile.name === "Property Owner" ? "owner" : profile.name.split(/\s+/)[0];

    const recent = [...pending]
      .sort((a, b) => Date.parse(b.submittedAt || 0) - Date.parse(a.submittedAt || 0))
      .slice(0, 4);

    $("#recentList").innerHTML = recent.map(b => `
      <li>
        <span class="avatar" aria-hidden="true">${escapeHTML(O.initials(b.guest.name))}</span>
        <div class="who">
          <strong>${escapeHTML(b.guest.name)}</strong>
          <span class="sub">${escapeHTML(b.propertyName)} &middot; move-in ${escapeHTML(formatDate(b.moveInDate))}</span>
        </div>
        <span class="badge badge-pending">Pending</span>
      </li>`).join("");
    $("#recentEmpty").hidden = recent.length !== 0;

    O.renderHeader();
  }

  window.addEventListener("storage", event => {
    if (event.key === O.KEYS.bookings || event.key === O.KEYS.properties) render();
  });

  O.hydrateIcons();
  $("#year").textContent = new Date().getFullYear();
  render();
})();
