"use strict";

/* =========================================
   STAYNEST HOMEPAGE
   Frontend prototype: stays come from the shared localStorage catalog
   (owner-data.js). No backend is used.
========================================= */

(function () {
  const S = window.StayNest;
  const { $, $$, escapeHTML, money, icon, imageTag } = S;

  S.mountSiteShell("home");
  S.hydrateIcons();

  /* ---------- Search form -> listings.html ---------- */

  const form = $("#homeSearch");

  function goToListings(overrides = {}) {
    const params = new URLSearchParams();
    const location = (overrides.location ?? $("#homeLocation").value).trim();
    const type = overrides.type ?? $("#homeType").value;
    const budget = overrides.budget ?? $("#homeBudget").value;

    // "Indore" is the only city, so it needs no filter.
    if (location && location.toLowerCase() !== "indore") params.set("location", location);
    if (type && type !== "All") params.set("type", type);
    if (budget && Number(budget) < 20000) params.set("budget", budget);

    const query = params.toString();
    window.location.href = `listings.html${query ? `?${query}` : ""}`;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    goToListings();
  });

  $$("[data-locality]").forEach(button => {
    button.addEventListener("click", () => goToListings({ location: button.dataset.locality }));
  });

  /* ---------- Featured stays ---------- */

  function featuredCard(property) {
    const saved = S.readSaved().includes(property.id);
    const perUnit = property.unit === "person" ? "person" : "room";
    const sharingLabel = property.sharing === "Private" ? "Private room" : `${property.sharing} sharing`;
    const feats = [
      [property.sharing === "Private" ? "door" : "bed", sharingLabel],
      ["wifi", property.amenities.includes("Wi-Fi") ? "Wi-Fi" : "Furnished"],
      property.meals ? ["meals", property.mealsNote.startsWith("Optional") ? "Meals optional" : "Food available"] : ["home", property.furnishing]
    ];

    return `
      <article class="stay-card">
        <div class="stay-media">
          <a href="details.html?id=${encodeURIComponent(property.id)}" tabindex="-1" aria-hidden="true">${imageTag(property.image, property.name)}</a>
          <button class="stay-heart" type="button" data-save="${escapeHTML(property.id)}" aria-pressed="${saved}" aria-label="${saved ? "Remove" : "Save"} ${escapeHTML(property.name)}">${icon("heart", 18)}</button>
        </div>
        <div class="stay-body">
          <h3 class="stay-title">${escapeHTML(property.name)}</h3>
          <p class="stay-loc">${icon("pin", 15)} ${escapeHTML(S.propertyLocation(property))}</p>
          <p class="stay-price" style="text-align:left;font-size:1.25rem">${money(property.price)} <small style="display:inline">/ ${perUnit} / month</small></p>
          <div class="stay-feats">${feats.map(([i, label]) => `<span class="feature-pill">${icon(i, 15)} ${escapeHTML(label)}</span>`).join("")}</div>
          <div class="stay-foot" style="margin-top:6px">
            <a class="btn btn-block" href="details.html?id=${encodeURIComponent(property.id)}">View stay ${icon("arrow", 16)}</a>
          </div>
        </div>
      </article>`;
  }

  function renderFeatured() {
    const grid = $("#featuredGrid");
    const stays = S.listBookableProperties()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    if (!stays.length) {
      grid.outerHTML = `
        <div class="empty-state" id="featuredGrid">
          <span class="empty-icon">${icon("home", 30)}</span>
          <h3>No stays are open right now</h3>
          <p>Check back soon, or list your own property if you are an owner.</p>
          <div class="empty-actions"><a class="btn btn-primary" href="owner-properties.html?add=1">List your property</a></div>
        </div>`;
      return;
    }
    grid.innerHTML = stays.map(featuredCard).join("");
  }

  $("#main").addEventListener("click", event => {
    const button = event.target.closest("[data-save]");
    if (!button) return;
    const result = S.toggleSaved(button.dataset.save);
    if (!result.ok) {
      S.showToast("Could not save. Check your browser storage settings.", "error");
      return;
    }
    button.setAttribute("aria-pressed", String(result.saved));
    S.updateSavedCount();
    S.showToast(result.saved ? "Saved to your shortlist." : "Removed from your shortlist.", result.saved ? "success" : "info");
  });

  renderFeatured();
})();
