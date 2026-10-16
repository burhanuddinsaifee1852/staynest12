"use strict";

/* =========================================
   OWNER PROPERTY MANAGEMENT
   Frontend prototype: data lives in localStorage via owner-data.js.
   Replace StayNestOwner.loadProperties / saveProperties with API calls
   when the Express + MongoDB backend exists.
========================================= */

(function () {
  const O = window.StayNestOwner;
  const { $, $$, escapeHTML, money, formatDate, icon, showToast } = O;

  const MAX_CARD_AMENITIES = 4;

  const state = {
    properties: [],
    readable: true,
    filters: { search: "", type: "all", status: "all", sort: "recent" },
    editingId: null,
    submitting: false,
    unitTouched: false
  };

  const STATUS_LABELS = { active: "Active", draft: "Draft", inactive: "Inactive" };

  const el = {
    grid: $("#propertyGrid"),
    resultsLine: $("#resultsLine"),
    emptyNone: $("#emptyNone"),
    emptyFiltered: $("#emptyFiltered"),
    warning: $("#storageWarning"),
    form: $("#propertyForm"),
    formDialog: $("#propertyDialog"),
    detailsDialog: $("#detailsDialog"),
    summary: $("#formSummary"),
    saveButton: $("#saveButton")
  };

  /* ---------- Data ---------- */

  function refresh() {
    const result = O.loadProperties();
    state.properties = result.properties;
    state.readable = result.readable;
  }

  // Re-read storage, apply a change, save. Keeps two open tabs from
  // overwriting each other with stale lists.
  function mutate(change) {
    const result = O.loadProperties();
    const next = change([...result.properties]);
    if (!O.saveProperties(next)) {
      showToast("Could not save. Check your browser storage settings.", "error");
      return false;
    }
    state.properties = next;
    state.readable = true;
    return true;
  }

  function findProperty(id) {
    return state.properties.find(item => item.id === id) || null;
  }

  function newId() {
    let id;
    do {
      id = `prop-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    } while (findProperty(id));
    return id;
  }

  /* ---------- Filtering ---------- */

  function visibleProperties() {
    const { search, type, status, sort } = state.filters;
    const query = search.trim().toLowerCase();

    const list = state.properties.filter(item => {
      const haystack = `${item.name} ${item.locality} ${item.city} ${item.address}`.toLowerCase();
      return (!query || haystack.includes(query)) &&
        (type === "all" || item.type === type) &&
        (status === "all" || item.status === status);
    });

    if (sort === "rent-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "rent-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

    return list;
  }

  /* ---------- Rendering ---------- */

  function renderStats() {
    const list = state.properties;
    const active = list.filter(p => p.status === "active");
    $("#statTotal").textContent = list.length;
    $("#statActive").textContent = active.length;
    $("#statDraft").textContent = list.filter(p => p.status === "draft").length;
    $("#statRooms").textContent = active.reduce((sum, p) => sum + p.availableRooms, 0);
  }

  function imageMarkup(property) {
    const fallback = `<div class="media-fallback">${icon("image", 40)}</div>`;
    if (!/^https?:\/\//i.test(property.image)) return fallback;
    return `<img src="${escapeHTML(property.image)}" alt="${escapeHTML(property.name)}" loading="lazy" referrerpolicy="no-referrer">`;
  }

  function badgesFor(property) {
    const badges = [`<span class="badge badge-${property.status}">${STATUS_LABELS[property.status]}</span>`];
    if (property.status === "active" && property.availableRooms === 0) {
      badges.push('<span class="badge badge-full">Fully occupied</span>');
    }
    return badges.join("");
  }

  function cardMarkup(property) {
    const total = property.totalRooms || 0;
    const free = property.availableRooms;
    const percentFree = total ? Math.round((free / total) * 100) : 0;
    const occupied = Math.max(0, 100 - percentFree);
    const shown = property.amenities.slice(0, MAX_CARD_AMENITIES);
    const extra = property.amenities.length - shown.length;
    const toggleLabel = property.status === "active" ? "Deactivate" : "Activate";
    const name = escapeHTML(property.name);

    return `
      <article class="property-card ${property.status === "active" ? "" : "is-paused"}" data-id="${escapeHTML(property.id)}">
        <div class="property-media">
          ${imageMarkup(property)}
          <div class="badge-row">
            <span class="type-pill">${escapeHTML(property.type)}</span>
            <span>${badgesFor(property)}</span>
          </div>
        </div>

        <div class="property-body">
          <div>
            <h2 class="property-title">${name}</h2>
            <p class="property-location">${icon("pin", 16)} ${escapeHTML(O.propertyLocation(property))}</p>
          </div>

          <p class="property-rent">${money(property.price)}
            <small>/ ${property.unit === "person" ? "person" : "room"} / month</small></p>

          <div class="occupancy">
            <div class="occupancy-text">
              <span><strong>${free}</strong> of ${total} rooms available</span>
              <span>${percentFree}% free</span>
            </div>
            <div class="occupancy-bar" role="img" aria-label="${free} of ${total} rooms available">
              <span style="width:${occupied}%"></span>
            </div>
          </div>

          ${shown.length ? `
            <ul class="amenity-list" aria-label="Amenities">
              ${shown.map(a => `<li>${escapeHTML(a)}</li>`).join("")}
              ${extra > 0 ? `<li class="more">+${extra} more</li>` : ""}
            </ul>` : ""}

          <div class="property-actions">
            <button class="btn btn-small" type="button" data-action="view" aria-label="View details of ${name}">
              ${icon("eye", 16)} Details</button>
            <button class="btn btn-small" type="button" data-action="edit" aria-label="Edit ${name}">
              ${icon("edit", 16)} Edit</button>
            <button class="btn btn-small" type="button" data-action="toggle" aria-label="${toggleLabel} ${name}">
              ${icon("power", 16)} ${toggleLabel}</button>
            <button class="btn btn-small btn-danger-outline" type="button" data-action="delete" aria-label="Delete ${name}">
              ${icon("trash", 16)} Delete</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    renderStats();
    O.renderHeader();
    el.warning.hidden = state.readable;

    const total = state.properties.length;
    const list = visibleProperties();

    el.grid.innerHTML = list.map(cardMarkup).join("");
    el.grid.hidden = list.length === 0;
    el.emptyNone.hidden = total !== 0;
    el.emptyFiltered.hidden = total === 0 || list.length !== 0;

    el.resultsLine.textContent = total === 0
      ? ""
      : `Showing ${list.length} of ${total} ${total === 1 ? "property" : "properties"}`;
  }

  /* ---------- Form helpers ---------- */

  function renderAmenityOptions() {
    $("#amenityOptions").innerHTML = O.AMENITY_OPTIONS.map((name, index) => `
      <label class="amenity-check" for="amenity-${index}">
        <input type="checkbox" id="amenity-${index}" name="amenity" value="${escapeHTML(name)}">
        <span>${escapeHTML(name)}</span>
      </label>`).join("");
  }

  function field(name) { return $(`[data-field="${name}"]`, el.form); }

  function showFieldError(name, message) {
    const wrapper = field(name);
    if (!wrapper) return;
    const error = $(".field-error", wrapper);
    const control = $("input, select, textarea", wrapper);
    wrapper.classList.toggle("has-error", Boolean(message));
    if (error) {
      error.textContent = message || "";
      error.hidden = !message;
    }
    if (control) {
      if (message) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
    }
  }

  function clearErrors() {
    ["name", "type", "status", "description", "address", "locality", "city",
      "price", "deposit", "image", "totalRooms", "availableRooms"].forEach(n => showFieldError(n, ""));
    el.summary.hidden = true;
    el.summary.textContent = "";
  }

  function readForm() {
    const checked = $$('input[name="amenity"]:checked', el.form).map(i => i.value);
    const others = $("#pAmenitiesOther").value.split(",").map(s => s.trim()).filter(Boolean);
    const amenities = [];
    [...checked, ...others].forEach(a => {
      if (!amenities.some(x => x.toLowerCase() === a.toLowerCase())) amenities.push(a);
    });

    return {
      name: $("#pName").value.trim(),
      type: $("#pType").value,
      status: $("#pStatus").value,
      description: $("#pDescription").value.trim(),
      address: $("#pAddress").value.trim(),
      locality: $("#pLocality").value.trim(),
      city: $("#pCity").value.trim(),
      priceRaw: $("#pRent").value.trim(),
      unit: $("#pUnit").value,
      sharing: $("#pSharing").value,
      furnishing: $("#pFurnishing").value,
      meals: $("#pMeals").value,
      depositRaw: $("#pDeposit").value.trim(),
      image: $("#pImage").value.trim(),
      totalRaw: $("#pTotal").value.trim(),
      availableRaw: $("#pAvailable").value.trim(),
      amenities
    };
  }

  function isWholeNumber(raw) { return /^\d+$/.test(raw); }

  function validate(values) {
    const errors = {};

    if (!values.name) errors.name = "Enter the property name.";
    else if (values.name.length < 3) errors.name = "Property name must be at least 3 characters.";
    else {
      const duplicate = state.properties.some(p =>
        p.id !== state.editingId &&
        p.name.toLowerCase() === values.name.toLowerCase() &&
        p.locality.toLowerCase() === values.locality.toLowerCase());
      if (duplicate) errors.name = "A property with this name already exists in this location.";
    }

    if (!O.PROPERTY_TYPES.includes(values.type)) errors.type = "Choose PG, Hostel, Room or Flat.";
    if (!O.PROPERTY_STATUSES.includes(values.status)) errors.status = "Choose an availability status.";
    if (!values.locality) errors.locality = "Enter the location (area) of the property.";
    if (!values.city) errors.city = "Enter the city.";

    const price = Number(values.priceRaw);
    if (!values.priceRaw) errors.price = "Enter the monthly rent.";
    else if (!Number.isFinite(price) || price <= 0) errors.price = "Monthly rent must be greater than zero.";

    if (values.depositRaw) {
      const deposit = Number(values.depositRaw);
      if (!Number.isFinite(deposit) || deposit < 0) errors.deposit = "Security deposit cannot be negative.";
    }

    let total = NaN;
    if (!values.totalRaw) errors.totalRooms = "Enter the total number of rooms.";
    else if (!isWholeNumber(values.totalRaw) || Number(values.totalRaw) < 1) {
      errors.totalRooms = "Total rooms must be a whole number of 1 or more.";
    } else total = Number(values.totalRaw);

    if (!values.availableRaw) errors.availableRooms = "Enter the number of available rooms.";
    else if (!isWholeNumber(values.availableRaw)) {
      errors.availableRooms = "Available rooms must be a whole number, 0 or more.";
    } else if (!errors.totalRooms && Number(values.availableRaw) > total) {
      errors.availableRooms = `Available rooms cannot be more than total rooms (${total}).`;
    }

    if (values.image && !/^https?:\/\/\S+$/i.test(values.image)) {
      errors.image = "Enter a full image link starting with http:// or https://.";
    }

    return errors;
  }

  function showErrors(errors) {
    Object.entries(errors).forEach(([name, message]) => showFieldError(name, message));
    const count = Object.keys(errors).length;
    el.summary.textContent = `Fix ${count} ${count === 1 ? "field" : "fields"} before saving.`;
    el.summary.hidden = false;

    const order = ["name", "type", "status", "locality", "city", "price", "deposit", "image", "totalRooms", "availableRooms"];
    const first = order.find(n => errors[n]);
    const control = first && $("input, select, textarea", field(first));
    if (control) control.focus();
  }

  function fillForm(property) {
    const known = new Set(O.AMENITY_OPTIONS);
    $("#pName").value = property ? property.name : "";
    $("#pType").value = property ? property.type : "";
    $("#pStatus").value = property ? property.status : "draft";
    $("#pDescription").value = property ? property.description : "";
    $("#pAddress").value = property ? property.address : "";
    $("#pLocality").value = property ? property.locality : "";
    $("#pCity").value = property ? property.city : "Indore";
    $("#pRent").value = property ? property.price : "";
    $("#pUnit").value = property ? property.unit : "person";
    $("#pSharing").value = property ? property.sharing : "Private";
    $("#pFurnishing").value = property ? property.furnishing : "Furnished";
    $("#pMeals").value = !property || !property.meals ? "none"
      : property.mealsNote.startsWith("Optional") ? "optional" : "included";
    $("#pDeposit").value = property ? property.deposit : "";
    $("#pImage").value = property ? property.image : "";
    $("#pTotal").value = property ? property.totalRooms : "";
    $("#pAvailable").value = property ? property.availableRooms : "";

    $$('input[name="amenity"]', el.form).forEach(box => {
      box.checked = Boolean(property) && property.amenities.includes(box.value);
    });
    $("#pAmenitiesOther").value = property
      ? property.amenities.filter(a => !known.has(a)).join(", ")
      : "";
  }

  function openForm(id) {
    const property = id ? findProperty(id) : null;
    if (id && !property) {
      showToast("That property no longer exists.", "error");
      refresh();
      render();
      return;
    }

    state.editingId = property ? property.id : null;
    state.unitTouched = Boolean(property);
    state.submitting = false;
    el.saveButton.disabled = false;
    el.saveButton.textContent = property ? "Save changes" : "Save property";

    clearErrors();
    fillForm(property);
    $("#formTitle").textContent = property ? "Edit property" : "Add property";

    if (el.detailsDialog.open) el.detailsDialog.close();
    el.formDialog.showModal();
    $("#pName").focus();
  }

  function submitForm(event) {
    event.preventDefault();
    if (state.submitting) return;

    clearErrors();
    const values = readForm();
    const errors = validate(values);
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }

    state.submitting = true;
    el.saveButton.disabled = true;
    el.saveButton.textContent = "Saving...";

    const now = new Date().toISOString();
    const editingId = state.editingId;
    let savedName = values.name;

    const ok = mutate(list => {
      const fields = {
        name: values.name,
        type: values.type,
        status: values.status,
        description: values.description,
        address: values.address,
        locality: values.locality,
        city: values.city,
        price: Number(values.priceRaw),
        unit: values.unit,
        sharing: values.sharing,
        furnishing: values.furnishing,
        meals: values.meals !== "none",
        mealsNote: { none: "Not included", included: "Included", optional: "Optional, charged separately" }[values.meals] || "Not included",
        deposit: values.depositRaw ? Number(values.depositRaw) : 0,
        image: values.image,
        totalRooms: Number(values.totalRaw),
        availableRooms: Number(values.availableRaw),
        amenities: values.amenities,
        updatedAt: now
      };

      const index = editingId ? list.findIndex(p => p.id === editingId) : -1;
      if (index >= 0) {
        // Keep fields this form doesn't edit (rating, sharing, meals, ...)
        list[index] = { ...list[index], ...fields };
      } else {
        list.unshift({ id: newId(), createdAt: now, ...fields });
      }
      return list;
    });

    if (!ok) {
      state.submitting = false;
      el.saveButton.disabled = false;
      el.saveButton.textContent = editingId ? "Save changes" : "Save property";
      return;
    }

    el.formDialog.close();
    render();
    showToast(editingId ? `Updated ${savedName}.` : `Added ${savedName}.`);
    if (!editingId && values.status === "active" && Number(values.availableRaw) === 0) {
      showToast(`Added ${savedName}. It has no free rooms, so tenants can't request it yet.`, "info");
    }
    state.submitting = false;
  }

  /* ---------- Actions ---------- */

  function detailsMarkup(property) {
    const counts = O.countBookingsForProperty(property.id);
    const requestsLink = `owner-booking.html?q=${encodeURIComponent(property.name)}`;
    const row = (label, value, wide) =>
      `<div${wide ? ' class="wide"' : ""}><dt>${label}</dt><dd>${value}</dd></div>`;

    return `
      <div class="detail-hero">${imageMarkup(property)}</div>
      <div class="detail-badges">
        <span class="type-pill">${escapeHTML(property.type)}</span>
        ${badgesFor(property)}
      </div>
      <dl class="detail-grid">
        ${row("Location", escapeHTML(O.propertyLocation(property)))}
        ${row("Address", escapeHTML(property.address || "Not provided"))}
        ${row("Monthly rent", `${money(property.price)} / ${property.unit}`)}
        ${row("Security deposit", money(property.deposit))}
        ${row("Total rooms", property.totalRooms)}
        ${row("Available rooms", property.availableRooms)}
        ${row("Last updated", escapeHTML(formatDate(property.updatedAt)))}
        ${row("Added on", escapeHTML(formatDate(property.createdAt)))}
        ${row("Booking requests",
          counts.total
            ? `${counts.total} total (${counts.pending} pending, ${counts.approved} approved) &middot; <a class="detail-link" href="${requestsLink}">View requests</a>`
            : "None yet", true)}
        ${row("Amenities", property.amenities.length ? escapeHTML(property.amenities.join(", ")) : "None listed", true)}
        ${row("Description", escapeHTML(property.description || "No description added."), true)}
      </dl>`;
  }

  function openDetails(id) {
    const property = findProperty(id);
    if (!property) return;
    $("#detailsTitle").textContent = property.name;
    $("#detailsSubtitle").textContent = O.propertyLocation(property);
    $("#detailsBody").innerHTML = detailsMarkup(property);
    $("#detailsEdit").dataset.id = property.id;
    el.detailsDialog.showModal();
  }

  function toggleStatus(id) {
    const property = findProperty(id);
    if (!property) return;

    const activating = property.status !== "active";
    if (activating && (!property.locality || property.price <= 0 || property.totalRooms < 1)) {
      showToast("Complete the location, rent and room count before activating.", "error");
      openForm(id);
      return;
    }

    const next = activating ? "active" : "inactive";
    const ok = mutate(list => list.map(p =>
      p.id === id ? { ...p, status: next, updatedAt: new Date().toISOString() } : p));
    if (!ok) return;

    render();
    if (!activating) {
      const pending = O.countBookingsForProperty(id).pending;
      showToast(pending
        ? `${property.name} deactivated. ${pending} pending ${pending === 1 ? "request is" : "requests are"} still waiting for you.`
        : `${property.name} deactivated. Tenants can no longer request it.`);
    } else if (property.availableRooms === 0) {
      showToast(`${property.name} is active but has no free rooms, so tenants can't request it.`, "info");
    } else {
      showToast(`${property.name} is active and open for booking requests.`);
    }
  }

  async function deleteProperty(id) {
    const property = findProperty(id);
    if (!property) return;

    const counts = O.countBookingsForProperty(id);
    const bookingNote = counts.total
      ? ` Its ${counts.total} booking ${counts.total === 1 ? "request stays" : "requests stay"} in Booking Management.`
      : "";

    const confirmed = await O.confirmAction({
      title: `Delete ${property.name}?`,
      message: `This removes the property from your list and can't be undone.${bookingNote}`,
      confirmLabel: "Delete property",
      danger: true
    });
    if (!confirmed) return;

    const ok = mutate(list => list.filter(p => p.id !== id));
    if (!ok) return;
    render();
    showToast(`Deleted ${property.name}.`);
  }

  /* ---------- Events ---------- */

  el.grid.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest("[data-id]");
    if (!card) return;
    const id = card.dataset.id;

    if (button.dataset.action === "view") openDetails(id);
    else if (button.dataset.action === "edit") openForm(id);
    else if (button.dataset.action === "toggle") toggleStatus(id);
    else if (button.dataset.action === "delete") deleteProperty(id);
  });

  // Broken image links fall back to the placeholder.
  document.addEventListener("error", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.closest(".property-media, .detail-hero")) return;
    const holder = document.createElement("div");
    holder.className = "media-fallback";
    holder.innerHTML = icon("image", 40);
    img.replaceWith(holder);
  }, true);

  $("#addPropertyButton").addEventListener("click", () => openForm(null));
  $$('[data-action="add"]').forEach(b => b.addEventListener("click", () => openForm(null)));
  $$('[data-action="clear"]').forEach(b => b.addEventListener("click", clearFilters));
  $("#detailsEdit").addEventListener("click", event => openForm(event.currentTarget.dataset.id));

  el.form.addEventListener("submit", submitForm);

  $$("[data-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  [el.formDialog, el.detailsDialog].forEach(O.closeOnBackdrop);

  // Clear a field's error as soon as the owner edits it.
  el.form.addEventListener("input", event => {
    const wrapper = event.target.closest("[data-field]");
    if (wrapper) showFieldError(wrapper.dataset.field, "");
    if (event.target.id === "pUnit") state.unitTouched = true;
  });

  $("#pType").addEventListener("change", event => {
    if (state.unitTouched) return;
    const type = event.target.value;
    if (type === "PG" || type === "Hostel") $("#pUnit").value = "person";
    else if (type === "Room" || type === "Flat") $("#pUnit").value = "room";
  });

  /* ---------- Filters ---------- */

  function syncFilters() {
    state.filters.search = $("#searchInput").value;
    state.filters.type = $("#typeFilter").value;
    state.filters.status = $("#statusFilter").value;
    state.filters.sort = $("#sortSelect").value;
    render();
  }

  function clearFilters() {
    $("#searchInput").value = "";
    $("#typeFilter").value = "all";
    $("#statusFilter").value = "all";
    $("#sortSelect").value = "recent";
    syncFilters();
    $("#searchInput").focus();
  }

  $("#filterForm").addEventListener("submit", event => event.preventDefault());
  $("#searchInput").addEventListener("input", syncFilters);
  ["#typeFilter", "#statusFilter", "#sortSelect"].forEach(s => $(s).addEventListener("change", syncFilters));
  $("#clearFilters").addEventListener("click", clearFilters);

  // Keep the page current when another tab changes the data.
  window.addEventListener("storage", event => {
    if (event.key === O.KEYS.properties || event.key === O.KEYS.bookings) {
      refresh();
      render();
    }
  });

  /* ---------- Init ---------- */

  O.hydrateIcons();
  renderAmenityOptions();
  $("#year").textContent = new Date().getFullYear();
  refresh();
  render();

  // Linked from the homepage "List your property" button.
  if (new URLSearchParams(window.location.search).get("add") === "1") openForm(null);
})();
