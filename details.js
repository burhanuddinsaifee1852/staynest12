"use strict";

/* =========================================
   PROPERTY DETAILS
   Reads one property from the shared catalog (owner-data.js).
   "Request to stay" hands the chosen room to booking.html through the
   existing key staynest_pending_booking. "Schedule a visit" saves to
   staynest_demo_visits. Frontend prototype only: nothing is sent.
========================================= */

(function () {
  const S = window.StayNest;
  const { $, $$, escapeHTML, money, icon, imageTag } = S;

  const root = $("#detailRoot");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "";

  const state = { property: null, optionId: null, photoIndex: 0 };

  S.mountSiteShell("find");
  S.hydrateIcons();

  /* ---------- Not found ---------- */

  function renderNotFound() {
    document.title = "Stay not found | StayNest";
    root.innerHTML = `
      <section class="empty-state" style="margin-top:40px">
        <span class="empty-icon">${icon("search", 30)}</span>
        <h1 style="font-size:1.4rem;color:var(--navy)">We couldn't find that stay</h1>
        <p>It may have been removed by the owner, or the link is incomplete.</p>
        <div class="empty-actions"><a class="btn btn-primary" href="listings.html">Explore stays</a></div>
      </section>`;
  }

  /* ---------- Helpers ---------- */

  function selectedOption() {
    const { property, optionId } = state;
    return property.roomOptions.find(o => o.id === optionId) || property.roomOptions[0];
  }

  function perUnit(unit) { return unit === "person" ? "person" : "room"; }

  function unavailableReason(property) {
    if (property.status === "draft") return "This listing is still a draft and is not open for requests.";
    if (property.status === "inactive") return "The owner has paused this listing, so new requests are closed.";
    if (property.availableRooms <= 0) return "All rooms are currently taken. Please check back later.";
    return "";
  }

  /* ---------- Rendering ---------- */

  function galleryMarkup(property) {
    const photos = property.images.length ? property.images : [""];
    const alt = n => `${property.name} photo ${n}`;
    const tile = (url, n, cls = "") => `<button type="button" class="g-tile ${cls}" data-photo="${n}" aria-label="Open photo ${n + 1} of ${photos.length}">${imageTag(url, alt(n + 1))}</button>`;

    return `
      <div class="gallery ${photos.length < 3 ? "gallery-small" : ""}">
        ${tile(photos[0], 0, "g-main")}
        ${photos.length > 1 ? tile(photos[1], 1) : ""}
        ${photos.length > 2 ? tile(photos[2], 2) : ""}
        <button type="button" class="btn btn-sm view-photos" data-photo="0">${icon("grid", 16)} View all photos</button>
      </div>`;
  }

  function optionMarkup(option, selected) {
    return `
      <label class="room-option ${selected ? "is-selected" : ""}">
        <input type="radio" name="roomOption" value="${escapeHTML(option.id)}" ${selected ? "checked" : ""}>
        <span class="room-thumb">${icon(option.unit === "person" ? "bed" : "door", 26)}</span>
        <span class="room-copy">
          <strong>${escapeHTML(option.name)}</strong>
          <b>${money(option.price)} <small>/ ${perUnit(option.unit)} / month</small></b>
          <span>${escapeHTML(option.description)}</span>
        </span>
      </label>`;
  }

  function amenityTile(name) {
    const detail = {
      "Wi-Fi": "Available", "Study Room": "In every room", "Mess": "Included", "Laundry": "Available",
      "Security": "24x7", "CCTV": "Common areas", "AC": "In rooms", "Parking": "Available", "Power Backup": "Available"
    }[name] || "Available";
    return `<li><span class="amenity-icon">${S.amenityIcon(name, 22)}</span><span><strong>${escapeHTML(name)}</strong><small>${detail}</small></span></li>`;
  }

  function render() {
    const property = state.property;
    const option = selectedOption();
    const saved = S.readSaved().includes(property.id);
    const blocked = unavailableReason(property);
    const rules = property.rules;
    const location = S.propertyLocation(property);

    document.title = `${property.name} | StayNest`;

    const costRows = [
      ["Monthly rent", `${money(option.price)} / ${perUnit(option.unit)} / month`],
      ["Meals", property.mealsNote],
      ["Electricity", rules.electricity],
      ["Security deposit", money(property.deposit)],
      ["Deposit return", "Subject to property terms"]
    ];
    const ruleRows = [
      ["calendar", "Minimum stay", rules.minStay],
      ["hourglass", "Notice period", rules.notice],
      ["users", "Guests", rules.guests],
      ["x", "Smoking", rules.smoking],
      ["shield", "Pets", rules.pets]
    ];

    root.innerHTML = `
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a> / <a href="listings.html">${escapeHTML(property.city)}</a> / <span aria-current="page">${escapeHTML(property.name)}</span>
      </nav>

      ${blocked ? `<p class="notice notice-warn" role="status">${icon("info", 18)} ${escapeHTML(blocked)}</p>` : ""}

      <div class="detail-head">
        <div>
          <h1>${escapeHTML(property.name)}</h1>
          <p class="stay-loc">${icon("pin", 16)} ${escapeHTML(location)}
            ${property.rating ? `<span class="rating-pill" style="margin-left:10px">${icon("star", 14)} ${property.rating.toFixed(1)}</span>` : ""}
            <span class="badge badge-blue" style="margin-left:10px">${escapeHTML(property.type)}</span></p>
        </div>
        <div class="detail-tools">
          <button class="btn btn-sm" type="button" id="saveBtn" aria-pressed="${saved}">${icon("heart", 16)} <span>${saved ? "Saved" : "Save"}</span></button>
          <button class="btn btn-sm" type="button" id="shareBtn">${icon("share", 16)} Share</button>
        </div>
      </div>

      ${galleryMarkup(property)}

      <div class="detail-layout">
        <div class="detail-main">
          <nav class="detail-tabs" aria-label="Sections">
            <a href="#overview" class="is-active">Overview</a>
            <a href="#rooms">Rooms</a>
            <a href="#amenities">Amenities</a>
            <a href="#costs">Costs</a>
            <a href="#rules">House rules</a>
          </nav>

          <section id="overview" class="detail-block">
            <h2>About this property</h2>
            <p class="about">${escapeHTML(property.description || "The owner has not added a description yet.")}</p>
            ${property.address ? `<p class="stay-loc" style="margin-top:10px">${icon("pin", 15)} ${escapeHTML(property.address)}</p>` : ""}
          </section>

          <section id="rooms" class="detail-block">
            <h2>Room options</h2>
            <p class="muted">Select a room type to see details and pricing.</p>
            <div class="room-options" id="roomOptions" role="radiogroup" aria-label="Room options">
              ${property.roomOptions.map(o => optionMarkup(o, o.id === option.id)).join("")}
            </div>
          </section>

          <section id="amenities" class="detail-block">
            <h2>Amenities</h2>
            ${property.amenities.length
              ? `<ul class="amenity-grid">${property.amenities.map(amenityTile).join("")}</ul>`
              : '<p class="muted">The owner has not listed amenities yet.</p>'}
          </section>

          <div class="two-col">
            <section id="costs" class="detail-block panel">
              <h2>Cost breakdown</h2>
              <dl class="cost-table">
                ${costRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHTML(v)}</dd></div>`).join("")}
              </dl>
            </section>
            <section id="rules" class="detail-block panel">
              <h2>House rules</h2>
              <ul class="rule-list">
                ${ruleRows.map(([i, k, v]) => `<li>${icon(i, 20)}<span>${k}</span><b>${escapeHTML(v)}<small>(example term)</small></b></li>`).join("")}
              </ul>
            </section>
          </div>

          <p class="report"><button class="text-btn" type="button" id="reportBtn">${icon("flag", 15)} Report this listing</button></p>
        </div>

        <aside class="book-card" aria-label="Booking">
          <p class="book-price" id="bookPrice">${money(option.price)} <small>/ ${perUnit(option.unit)} / month</small></p>
          <div class="book-room" id="bookRoom">
            <span class="room-thumb sm">${icon(option.unit === "person" ? "bed" : "door", 22)}</span>
            <div><strong>${escapeHTML(option.name)}</strong><p>${escapeHTML(option.description)}</p></div>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="button" id="visitBtn" ${blocked ? "disabled" : ""}>${icon("calendar", 18)} Schedule a visit</button>
          <button class="btn btn-lg btn-block" type="button" id="requestBtn" ${blocked ? "disabled" : ""}>${icon("mail", 18)} Request to stay</button>
          <p class="book-note">Subject to owner confirmation.</p>
          <div class="owner-info">
            <h3>Owner information</h3>
            <div class="owner-row"><span class="avatar-lg">${icon("user", 24)}</span>
              <div><strong>${escapeHTML(property.ownerName)}</strong><p>Property owner · Responds to enquiries</p></div></div>
          </div>
        </aside>
      </div>`;
  }

  /* ---------- Photo viewer ---------- */

  const photoDialog = $("#photoDialog");

  function showPhoto(index) {
    const photos = state.property.images.length ? state.property.images : [""];
    state.photoIndex = (index + photos.length) % photos.length;
    $("#photoFrame").innerHTML = imageTag(photos[state.photoIndex], `${state.property.name} photo ${state.photoIndex + 1}`);
    $("#photoCount").textContent = `${state.photoIndex + 1} of ${photos.length}`;
    $("#photoThumbs").innerHTML = photos.map((url, i) =>
      `<button type="button" class="${i === state.photoIndex ? "is-current" : ""}" data-thumb="${i}" aria-label="Show photo ${i + 1}">${imageTag(url, "")}</button>`).join("");
    const many = photos.length > 1;
    $("#photoPrev").hidden = !many;
    $("#photoNext").hidden = !many;
  }

  function openPhotos(index) {
    showPhoto(index);
    if (!photoDialog.open) photoDialog.showModal();
  }

  $("#photoPrev").addEventListener("click", () => showPhoto(state.photoIndex - 1));
  $("#photoNext").addEventListener("click", () => showPhoto(state.photoIndex + 1));
  $("#photoThumbs").addEventListener("click", event => {
    const button = event.target.closest("[data-thumb]");
    if (button) showPhoto(Number(button.dataset.thumb));
  });
  photoDialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") showPhoto(state.photoIndex - 1);
    if (event.key === "ArrowRight") showPhoto(state.photoIndex + 1);
  });

  /* ---------- Visit dialog ---------- */

  const visitDialog = $("#visitDialog");

  function dateValue(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function openVisit() {
    $("#visitSub").textContent = `${state.property.name} · ${selectedOption().name}`;
    const dateInput = $("#visitDate");
    dateInput.min = dateValue(1);
    dateInput.max = dateValue(60);
    dateInput.value = dateValue(2);
    $("#visitNote").value = "";
    $("#noteCount").textContent = "0/300";
    clearVisitError();
    visitDialog.showModal();
    dateInput.focus();
  }

  function clearVisitError() {
    $("#visitDateField").classList.remove("has-error");
    $("#visitDateError").hidden = true;
    $("#visitDate").removeAttribute("aria-invalid");
  }

  $("#visitNote").addEventListener("input", event => {
    $("#noteCount").textContent = `${event.target.value.length}/300`;
  });
  $("#visitDate").addEventListener("input", clearVisitError);

  $("#visitForm").addEventListener("submit", event => {
    event.preventDefault();
    const dateInput = $("#visitDate");
    const value = dateInput.value;
    let message = "";
    if (!value) message = "Choose a date for your visit.";
    else if (value < dateInput.min) message = "Choose a date from tomorrow onwards.";
    else if (value > dateInput.max) message = "Visits can be requested up to 60 days ahead.";

    if (message) {
      $("#visitDateField").classList.add("has-error");
      $("#visitDateError").textContent = message;
      $("#visitDateError").hidden = false;
      dateInput.setAttribute("aria-invalid", "true");
      dateInput.focus();
      return;
    }

    const submit = $("#visitSubmit");
    if (submit.disabled) return;
    submit.disabled = true;

    const visit = {
      id: `visit-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      propertyId: state.property.id,
      propertyName: state.property.name,
      roomName: selectedOption().name,
      date: value,
      time: $('input[name="visitTime"]:checked').value,
      note: $("#visitNote").value.trim(),
      status: "requested",
      createdAt: new Date().toISOString()
    };

    const ok = S.addVisit(visit);
    submit.disabled = false;
    if (!ok) {
      S.showToast("Could not save your visit request. Check your browser storage settings.", "error");
      return;
    }
    visitDialog.close();
    S.showToast("Visit requested. Waiting for owner confirmation.");
  });

  /* ---------- Page events ---------- */

  root.addEventListener("click", event => {
    const photo = event.target.closest("[data-photo]");
    if (photo) { openPhotos(Number(photo.dataset.photo)); return; }

    if (event.target.closest("#saveBtn")) {
      const result = S.toggleSaved(state.property.id);
      if (!result.ok) { S.showToast("Could not save. Check your browser storage settings.", "error"); return; }
      const button = $("#saveBtn");
      button.setAttribute("aria-pressed", String(result.saved));
      $("span", button).textContent = result.saved ? "Saved" : "Save";
      S.updateSavedCount();
      S.showToast(result.saved ? "Saved to your shortlist." : "Removed from your shortlist.", result.saved ? "success" : "info");
      return;
    }

    if (event.target.closest("#shareBtn")) { shareStay(); return; }
    if (event.target.closest("#reportBtn")) {
      S.showToast("Thanks. Reporting is a demo feature, so nothing was sent.", "info");
      return;
    }
    if (event.target.closest("#visitBtn")) { openVisit(); return; }
    if (event.target.closest("#requestBtn")) { requestToStay(); return; }

    const tab = event.target.closest(".detail-tabs a");
    if (tab) {
      $$(".detail-tabs a").forEach(a => a.classList.toggle("is-active", a === tab));
    }
  });

  root.addEventListener("change", event => {
    if (event.target.name !== "roomOption") return;
    state.optionId = event.target.value;
    const option = selectedOption();
    $$(".room-option").forEach(label => {
      label.classList.toggle("is-selected", $("input", label).value === option.id);
    });
    $("#bookPrice").innerHTML = `${money(option.price)} <small>/ ${perUnit(option.unit)} / month</small>`;
    $("#bookRoom").innerHTML = `
      <span class="room-thumb sm">${icon(option.unit === "person" ? "bed" : "door", 22)}</span>
      <div><strong>${escapeHTML(option.name)}</strong><p>${escapeHTML(option.description)}</p></div>`;
  });

  async function shareStay() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: state.property.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      S.showToast("Link copied to your clipboard.");
    } catch (error) {
      if (error && error.name === "AbortError") return;
      S.showToast("Copy this page's address from your browser bar to share it.", "info");
    }
  }

  function requestToStay() {
    const property = state.property;
    if (unavailableReason(property)) return;
    const option = selectedOption();

    const ok = S.writeJSON(S.TENANT_KEYS.selection, {
      propertyId: property.id,
      propertyName: property.name,
      plan: option.name,
      optionId: option.id,
      price: option.price,
      unit: option.unit,
      createdAt: new Date().toISOString()
    });
    if (!ok) {
      S.showToast("Could not start your request. Check your browser storage settings.", "error");
      return;
    }
    window.location.href = "booking.html";
  }

  $$("dialog [data-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  [photoDialog, visitDialog].forEach(S.closeOnBackdrop);

  /* ---------- Init ---------- */

  state.property = id ? S.getProperty(id) : null;
  if (!state.property) {
    renderNotFound();
  } else {
    state.optionId = state.property.roomOptions[0].id;
    render();
  }
  S.hydrateIcons(document);
})();
