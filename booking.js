"use strict";

/* =========================================
   BOOKING REQUEST (3 steps)
   Input: staynest_pending_booking (set by details.js).
   Output: one new record appended to the EXISTING key
   staynest_demo_booking_requests, which the owner's Booking Management
   page reads. Frontend prototype: no server, no payment.
========================================= */

(function () {
  const S = window.StayNest;
  const { $, $$, escapeHTML, money, formatDate, icon, imageTag } = S;

  S.mountSiteShell("find");
  S.hydrateIcons();

  const state = { step: 1, property: null, option: null, submitting: false, done: false };

  const el = {
    flow: $("#flow"),
    none: $("#noSelection"),
    form: $("#requestForm"),
    summary: $("#formSummary"),
    next: $("#nextBtn"),
    back: $("#backBtn"),
    success: $("#success")
  };

  /* ---------- Selection ---------- */

  function loadSelection() {
    const result = S.readRaw(S.TENANT_KEYS.selection);
    const selection = result.ok && result.value && typeof result.value === "object" ? result.value : null;
    // Also allow ?id= so a direct link works.
    const params = new URLSearchParams(window.location.search);
    const id = (selection && selection.propertyId) || params.get("id");
    if (!id) return { reason: "none" };

    const property = S.getProperty(id);
    if (!property) return { reason: "missing" };
    if (!S.isBookable(property)) return { reason: "closed", property };

    const option = property.roomOptions.find(o => o.id === (selection && selection.optionId)) || property.roomOptions[0];
    return { property, option };
  }

  function showNone(reason, property) {
    el.flow.hidden = true;
    el.none.hidden = false;
    const copy = {
      none: ["No stay selected yet", "Choose a property and room before continuing."],
      missing: ["That stay is no longer listed", "The owner may have removed it. Explore other stays instead."],
      closed: [`${property ? property.name : "This stay"} is not taking requests`, "The owner has paused this listing or all rooms are taken. Explore other stays instead."]
    }[reason] || ["No stay selected yet", "Choose a property and room before continuing."];
    $("#noSelectionTitle").textContent = copy[0];
    $("#noSelectionText").textContent = copy[1];
  }

  /* ---------- Summary ---------- */

  function renderSummary() {
    const { property, option } = state;
    const unit = option.unit === "person" ? "person" : "room";
    $("#summary").innerHTML = `
      <div class="summary-photo">${imageTag(property.image, property.name)}</div>
      <div class="summary-body">
        <div>
          <h2>${escapeHTML(property.name)}</h2>
          <p class="stay-loc">${icon("pin", 15)} ${escapeHTML(S.propertyLocation(property))}</p>
        </div>
        <dl class="cost-mini">
          <div><dt>Room</dt><dd>${escapeHTML(option.name)}</dd></div>
          <div><dt>Monthly rent</dt><dd>${money(option.price)} / ${unit}</dd></div>
          <div><dt>Security deposit</dt><dd>${money(property.deposit)} (one time)</dd></div>
          <div><dt>Electricity</dt><dd>${escapeHTML(property.rules.electricity)}</dd></div>
          <div><dt>Meals</dt><dd>${escapeHTML(property.mealsNote)}</dd></div>
        </dl>
        <p class="field-hint">Subject to owner confirmation. Nothing is charged now.</p>
      </div>`;
    $("#backToStay").href = `details.html?id=${encodeURIComponent(property.id)}`;
  }

  /* ---------- Validation ---------- */

  function setError(name, message) {
    const wrapper = $(`[data-field="${name}"]`, el.form);
    if (!wrapper) return;
    const error = $(".field-error", wrapper) || $(`#err-${name}`);
    const control = $("input, select, textarea", wrapper);
    wrapper.classList.toggle("has-error", Boolean(message));
    if (error) { error.textContent = message || ""; error.hidden = !message; }
    if (control) {
      if (message) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
    }
  }

  function clearErrors() {
    ["moveIn", "name", "email", "phone", "consent"].forEach(n => setError(n, ""));
    el.summary.hidden = true;
  }

  function dayValue(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function validPhone(value) {
    const digits = value.replace(/[\s\-()]/g, "");
    return /^(\+91|91|0)?[6-9]\d{9}$/.test(digits);
  }

  function validateStep(step) {
    const errors = {};
    if (step === 1) {
      const date = $("#moveIn").value;
      if (!date) errors.moveIn = "Choose your move-in date.";
      else if (date < dayValue(0)) errors.moveIn = "Move-in date cannot be in the past.";
      else if (date > dayValue(365)) errors.moveIn = "Choose a date within the next 12 months.";
    }
    if (step === 2) {
      const name = $("#guestName").value.trim();
      const email = $("#guestEmail").value.trim();
      const phone = $("#guestPhone").value.trim();
      if (name.length < 2) errors.name = "Enter your full name.";
      if (!email) errors.email = "Enter your email address.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email address.";
      if (!phone) errors.phone = "Enter your mobile number.";
      else if (!validPhone(phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }
    if (step === 3 && !$("#consent").checked) {
      errors.consent = "Please confirm that you understand this is a request.";
    }
    return errors;
  }

  function showErrors(errors) {
    Object.entries(errors).forEach(([k, v]) => setError(k, v));
    const count = Object.keys(errors).length;
    el.summary.textContent = `Fix ${count} ${count === 1 ? "field" : "fields"} to continue.`;
    el.summary.hidden = false;
    const first = Object.keys(errors)[0];
    const wrapper = $(`[data-field="${first}"]`, el.form);
    const control = wrapper && $("input, select, textarea", wrapper);
    if (control) control.focus();
  }

  /* ---------- Steps ---------- */

  function renderReview() {
    const { property, option } = state;
    const unit = option.unit === "person" ? "person" : "room";
    const rows = [
      ["Stay", property.name],
      ["Room", option.name],
      ["Move-in date", formatDate($("#moveIn").value)],
      ["Duration", $("#duration").value],
      ["Occupants", $("#occupants").value],
      ["Monthly rent", `${money(option.price)} / ${unit}`],
      ["Security deposit", money(property.deposit)],
      ["Name", $("#guestName").value.trim()],
      ["Email", $("#guestEmail").value.trim()],
      ["Mobile", $("#guestPhone").value.trim()]
    ];
    const message = $("#guestMessage").value.trim();
    if (message) rows.push(["Message", message]);
    $("#reviewList").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHTML(v)}</dd></div>`).join("");
  }

  function goToStep(step) {
    state.step = step;
    [1, 2, 3].forEach(n => { $(`#step${n}`).hidden = n !== step; });
    $$("#stepper li").forEach(li => {
      const n = Number(li.dataset.step);
      li.classList.toggle("is-current", n === step);
      li.classList.toggle("is-done", n < step);
      if (n === step) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    el.back.hidden = step === 1;
    el.next.textContent = step === 3 ? "Send request" : "Continue";
    if (step === 3) renderReview();
    clearErrors();
    const target = $(`#step${step} input, #step${step} select`);
    if (target) target.focus();
  }

  /* ---------- Submit ---------- */

  function submit() {
    if (state.submitting) return;
    state.submitting = true;
    el.next.disabled = true;
    el.next.textContent = "Sending...";

    const { property, option } = state;
    const email = $("#guestEmail").value.trim();

    // One pending request per guest per property avoids accidental duplicates.
    const duplicate = S.loadBookings().bookings.some(b =>
      b.propertyId === property.id && b.guest.email.toLowerCase() === email.toLowerCase() && b.ownerStatus === "pending");
    if (duplicate) {
      state.submitting = false;
      el.next.disabled = false;
      el.next.textContent = "Send request";
      S.showToast("You already have a pending request for this stay.", "error");
      return;
    }

    const request = {
      id: `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      propertyId: property.id,
      propertyName: property.name,
      plan: option.name,
      optionId: option.id,
      price: option.price,
      unit: option.unit,
      deposit: property.deposit,
      guest: {
        name: $("#guestName").value.trim(),
        email,
        phone: $("#guestPhone").value.trim()
      },
      moveInDate: $("#moveIn").value,
      duration: $("#duration").value,
      occupants: $("#occupants").value,
      message: $("#guestMessage").value.trim(),
      status: "Demo request — not confirmed",
      ownerStatus: "pending",
      submittedAt: new Date().toISOString()
    };

    if (!S.addBookingRequest(request)) {
      state.submitting = false;
      el.next.disabled = false;
      el.next.textContent = "Send request";
      S.showToast("Could not save your request. Check your browser storage settings.", "error");
      return;
    }

    try { localStorage.removeItem(S.TENANT_KEYS.selection); } catch (error) { /* ignore */ }
    state.done = true;
    el.flow.hidden = true;
    el.success.hidden = false;
    $("#successText").textContent = `${property.name} (${option.name}) will review your request. You will see the decision under My requests.`;
    el.success.scrollIntoView({ block: "start" });
  }

  el.form.addEventListener("submit", event => {
    event.preventDefault();
    if (state.done) return;
    const errors = validateStep(state.step);
    if (Object.keys(errors).length) { showErrors(errors); return; }
    if (state.step < 3) goToStep(state.step + 1);
    else submit();
  });
  el.back.addEventListener("click", () => goToStep(state.step - 1));

  el.form.addEventListener("input", event => {
    const wrapper = event.target.closest("[data-field]");
    if (wrapper) setError(wrapper.dataset.field, "");
  });

  $("#roomSelect").addEventListener("change", event => {
    const option = state.property.roomOptions.find(o => o.id === event.target.value);
    if (option) { state.option = option; renderSummary(); }
  });

  /* ---------- Init ---------- */

  const selection = loadSelection();
  if (!selection.property || !selection.option) {
    showNone(selection.reason, selection.property);
  } else {
    state.property = selection.property;
    state.option = selection.option;
    el.flow.hidden = false;

    $("#roomSelect").innerHTML = state.property.roomOptions.map(o =>
      `<option value="${escapeHTML(o.id)}">${escapeHTML(o.name)} - ${money(o.price)} / ${o.unit}</option>`).join("");
    $("#roomSelect").value = state.option.id;

    const moveIn = $("#moveIn");
    moveIn.min = dayValue(0);
    moveIn.max = dayValue(365);
    moveIn.value = dayValue(7);

    const session = S.getSession();
    if (session) {
      $("#guestName").value = session.name;
      $("#guestEmail").value = session.email;
    }
    renderSummary();
    goToStep(1);
    window.scrollTo(0, 0);
  }
})();
