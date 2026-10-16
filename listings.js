"use strict";

/* =========================================
   LISTINGS PAGE
   Reads the shared catalog (staynest_owner_properties) through
   owner-data.js. Only ACTIVE properties with a free room are listed,
   so anything an owner pauses, drafts or deletes disappears here.
========================================= */

(function () {
  const S = window.StayNest;
  const { $, $$, escapeHTML, money, icon, imageTag } = S;

  const BUDGET_MIN = 2000;
  const BUDGET_MAX = 20000;

  const state = {
    query: "",
    types: [],
    sharing: [],
    meals: false,
    furnished: false,
    min: BUDGET_MIN,
    max: BUDGET_MAX,
    sort: "recommended",
    savedOnly: false
  };

  const el = {
    grid: $("#listingGrid"),
    chips: $("#chipRow"),
    count: $("#resultsCount"),
    empty: $("#emptyState"),
    panel: $("#filterPanel"),
    overlay: $("#sheetOverlay")
  };

  S.mountSiteShell("find");
  S.hydrateIcons();

  /* ---------- URL <-> state ---------- */

  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    state.query = (params.get("location") || params.get("q") || "").slice(0, 60);
    state.types = (params.get("type") || "").split(",").filter(t => S.PROPERTY_TYPES.includes(t));
    state.sharing = (params.get("sharing") || "").split(",").filter(t => S.SHARING_OPTIONS.includes(t));
    state.meals = params.get("meals") === "1";
    state.furnished = params.get("furnished") === "1";
    const budget = Number(params.get("budget"));
    if (Number.isFinite(budget) && budget >= BUDGET_MIN && budget < BUDGET_MAX) state.max = budget;
    const sort = params.get("sort");
    if (["recommended", "low", "high", "rating"].includes(sort)) state.sort = sort;
    state.savedOnly = params.get("view") === "saved";
  }

  function writeUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set("location", state.query);
    if (state.types.length) params.set("type", state.types.join(","));
    if (state.sharing.length) params.set("sharing", state.sharing.join(","));
    if (state.meals) params.set("meals", "1");
    if (state.furnished) params.set("furnished", "1");
    if (state.max < BUDGET_MAX) params.set("budget", state.max);
    if (state.sort !== "recommended") params.set("sort", state.sort);
    if (state.savedOnly) params.set("view", "saved");
    const query = params.toString();
    try {
      history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    } catch (error) { /* file:// or blocked: ignore */ }
  }

  /* ---------- Form <-> state ---------- */

  function syncFormFromState() {
    $("#locationSearch").value = state.query;
    $$('input[name="type"]').forEach(b => { b.checked = state.types.includes(b.value); });
    $$('input[name="sharing"]').forEach(b => { b.checked = state.sharing.includes(b.value); });
    $("#mealsFilter").checked = state.meals;
    $("#furnishedFilter").checked = state.furnished;
    $("#budgetMin").value = state.min;
    $("#budgetMax").value = state.max;
    $("#sortSelect").value = state.sort;
    updateBudgetRead();
  }

  function updateBudgetRead() {
    const maxText = state.max >= BUDGET_MAX ? "₹20,000+" : money(state.max);
    $("#budgetRead").textContent = `${money(state.min)} – ${maxText}`;
  }

  function readFiltersFromForm() {
    state.types = $$('input[name="type"]:checked').map(b => b.value);
    state.sharing = $$('input[name="sharing"]:checked').map(b => b.value);
    state.meals = $("#mealsFilter").checked;
    state.furnished = $("#furnishedFilter").checked;

    let min = Number($("#budgetMin").value);
    let max = Number($("#budgetMax").value);
    if (min > max) { [min, max] = [max, min]; }
    state.min = min;
    state.max = max;
    $("#budgetMin").value = min;
    $("#budgetMax").value = max;
    state.sort = $("#sortSelect").value;
  }

  function resetFilters() {
    Object.assign(state, {
      query: "", types: [], sharing: [], meals: false, furnished: false,
      min: BUDGET_MIN, max: BUDGET_MAX, savedOnly: false
    });
    syncFormFromState();
    render();
  }

  /* ---------- Filtering ---------- */

  function matches(property, saved) {
    const query = state.query.trim().toLowerCase();
    if (query && query !== "indore") {
      const text = `${property.name} ${property.locality} ${property.address}`.toLowerCase();
      if (!text.includes(query)) return false;
    }
    if (query === "indore" && property.city.toLowerCase() !== "indore") return false;
    if (state.types.length && !state.types.includes(property.type)) return false;
    if (state.sharing.length && !state.sharing.includes(property.sharing)) return false;
    if (state.meals && !property.meals) return false;
    if (state.furnished && property.furnishing === "Unfurnished") return false;
    if (property.price < state.min) return false;
    if (state.max < BUDGET_MAX && property.price > state.max) return false;
    if (state.savedOnly && !saved.includes(property.id)) return false;
    return true;
  }

  function sortList(list) {
    const sorted = [...list];
    if (state.sort === "low") sorted.sort((a, b) => a.price - b.price);
    else if (state.sort === "high") sorted.sort((a, b) => b.price - a.price);
    else sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.price - b.price);
    return sorted;
  }

  /* ---------- Rendering ---------- */

  function cardMarkup(property, saved) {
    const isSaved = saved.includes(property.id);
    const unit = property.unit === "person" ? "person" : "room";
    const sharing = property.sharing === "Private" ? "Private room" : `${property.sharing} sharing`;
    const feats = [
      [property.sharing === "Private" ? "door" : "bed", sharing],
      property.meals ? ["meals", property.mealsNote.startsWith("Optional") ? "Meals optional" : "Meals included"] : ["home", property.furnishing],
      property.amenities.includes("Study Room") ? ["desk", "Study desk"] : ["wifi", property.amenities.includes("Wi-Fi") ? "Wi-Fi" : "Furnished"]
    ];
    const left = property.availableRooms;
    const href = `details.html?id=${encodeURIComponent(property.id)}`;

    return `
      <article class="stay-card">
        <div class="stay-media">
          <a href="${href}" tabindex="-1" aria-hidden="true">${imageTag(property.image, property.name)}</a>
          <button class="stay-heart" type="button" data-save="${escapeHTML(property.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove" : "Save"} ${escapeHTML(property.name)}">${icon("heart", 18)}</button>
        </div>
        <div class="stay-body">
          <div class="stay-title-row">
            <h2 class="stay-title"><a href="${href}">${escapeHTML(property.name)}</a></h2>
            <p class="stay-price">${money(property.price)}<small>per ${unit}/month</small></p>
          </div>
          <div class="listing-meta">
            <p class="stay-loc">${icon("pin", 15)} ${escapeHTML(S.propertyLocation(property))}</p>
            ${property.rating ? `<span class="rating-pill">${icon("star", 14)} ${property.rating.toFixed(1)}</span>` : ""}
            <span class="badge badge-blue">${escapeHTML(property.type)}</span>
          </div>
          <div class="stay-feats">${feats.map(([i, label]) => `<span>${icon(i, 15)} ${escapeHTML(label)}</span>`).join("")}</div>
          <div class="stay-foot">
            <span class="badge ${left <= 2 ? "badge-warn" : "badge-ok"}">${left <= 2 ? `Only ${left} left` : "Available"}</span>
            <a class="btn btn-primary btn-sm" href="${href}">View stay ${icon("arrow", 15)}</a>
          </div>
        </div>
      </article>`;
  }

  function chipMarkup(label, key, value = "") {
    return `<span class="chip chip-removable">${escapeHTML(label)}
      <button type="button" data-remove="${key}" data-value="${escapeHTML(value)}" aria-label="Remove filter ${escapeHTML(label)}">${icon("close", 14)}</button></span>`;
  }

  function renderChips() {
    const chips = [];
    if (state.query) chips.push(chipMarkup(state.query, "query"));
    state.types.forEach(t => chips.push(chipMarkup(t, "type", t)));
    state.sharing.forEach(t => chips.push(chipMarkup(`${t} sharing`, "sharing", t)));
    if (state.max < BUDGET_MAX) chips.push(chipMarkup(`Under ${money(state.max)}`, "max"));
    if (state.min > BUDGET_MIN) chips.push(chipMarkup(`From ${money(state.min)}`, "min"));
    if (state.meals) chips.push(chipMarkup("Meals included", "meals"));
    if (state.furnished) chips.push(chipMarkup("Furnished", "furnished"));
    if (state.savedOnly) chips.push(chipMarkup("Saved stays", "saved"));
    el.chips.innerHTML = chips.join("");

    const dot = $("#filterCount");
    const count = chips.length;
    dot.textContent = count;
    dot.hidden = count === 0;
  }

  function render() {
    const saved = S.readSaved();
    const all = S.listBookableProperties();
    const list = sortList(all.filter(p => matches(p, saved)));

    updateBudgetRead();
    renderChips();
    writeUrl();

    el.grid.innerHTML = list.map(p => cardMarkup(p, saved)).join("");
    el.grid.hidden = list.length === 0;
    el.empty.hidden = list.length !== 0;
    el.count.textContent = list.length
      ? `${list.length} ${list.length === 1 ? "stay" : "stays"} found`
      : "";

    if (!list.length) {
      const noStays = all.length === 0;
      $("#emptyTitle").textContent = noStays
        ? "No stays are open right now"
        : state.savedOnly && !saved.length ? "Your shortlist starts here." : "No stays match these filters";
      $("#emptyText").textContent = noStays
        ? "Owners have not opened any rooms yet. Please check back soon."
        : state.savedOnly && !saved.length
          ? "Save stays you like with the heart icon and compare them here."
          : "Try adjusting your location, budget or room type.";
      $("#emptyClear").textContent = state.savedOnly ? "Explore all stays" : "Clear filters";
      $("#emptyClear").hidden = noStays;
    }
  }

  /* ---------- Events ---------- */

  $("#filterForm").addEventListener("input", () => { readFiltersFromForm(); render(); });
  $("#filterForm").addEventListener("submit", event => event.preventDefault());
  $("#sortSelect").addEventListener("change", () => { state.sort = $("#sortSelect").value; render(); });

  $("#locateForm").addEventListener("submit", event => {
    event.preventDefault();
    state.query = $("#locationSearch").value.trim();
    render();
    el.panel.classList.remove("is-open");
    $("#results").focus();
  });
  $("#locationSearch").addEventListener("input", event => {
    if (!event.target.value.trim() && state.query) { state.query = ""; render(); }
  });

  $("#clearAll").addEventListener("click", resetFilters);
  $("#clearFilters").addEventListener("click", resetFilters);
  $("#emptyClear").addEventListener("click", resetFilters);

  el.chips.addEventListener("click", event => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    const { remove, value } = button.dataset;
    if (remove === "query") state.query = "";
    if (remove === "type") state.types = state.types.filter(t => t !== value);
    if (remove === "sharing") state.sharing = state.sharing.filter(t => t !== value);
    if (remove === "max") state.max = BUDGET_MAX;
    if (remove === "min") state.min = BUDGET_MIN;
    if (remove === "meals") state.meals = false;
    if (remove === "furnished") state.furnished = false;
    if (remove === "saved") state.savedOnly = false;
    syncFormFromState();
    render();
  });

  el.grid.addEventListener("click", event => {
    const button = event.target.closest("[data-save]");
    if (!button) return;
    const result = S.toggleSaved(button.dataset.save);
    if (!result.ok) {
      S.showToast("Could not save. Check your browser storage settings.", "error");
      return;
    }
    S.updateSavedCount();
    S.showToast(result.saved ? "Saved to your shortlist." : "Removed from your shortlist.", result.saved ? "success" : "info");
    if (state.savedOnly && !result.saved) render();
    else {
      button.setAttribute("aria-pressed", String(result.saved));
      button.setAttribute("aria-label", `${result.saved ? "Remove" : "Save"} stay`);
    }
  });

  /* Mobile bottom sheet */
  function openSheet() {
    el.panel.classList.add("is-open");
    el.overlay.hidden = false;
    document.body.style.overflow = "hidden";
    $("#closeSheet").focus();
  }
  function closeSheet() {
    el.panel.classList.remove("is-open");
    el.overlay.hidden = true;
    document.body.style.overflow = "";
  }
  $("#openSheet").addEventListener("click", openSheet);
  $("#closeSheet").addEventListener("click", closeSheet);
  $("#applySheet").addEventListener("click", () => { closeSheet(); $("#results").focus(); });
  el.overlay.addEventListener("click", closeSheet);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeSheet(); });

  window.addEventListener("storage", event => {
    if (event.key === S.KEYS.properties || event.key === S.TENANT_KEYS.saved) render();
  });

  /* ---------- Init ---------- */

  const localities = [...new Set(S.loadProperties().properties.map(p => p.locality).filter(Boolean))];
  $("#localityOptions").innerHTML = ["Indore", ...localities].map(l => `<option value="${escapeHTML(l)}"></option>`).join("");

  readUrl();
  syncFormFromState();
  render();
})();
