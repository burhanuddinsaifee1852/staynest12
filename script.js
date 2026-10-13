"use strict";

/* =========================
   SAMPLE PROPERTY DATA
========================= */

const properties = [
  {
    id: "nest-house",
    name: "Nest House",
    type: "pg",
    locality: "Bhawarkuan",
    city: "Indore",
    rent: 8500,
    unit: "person",
    deposit: 8500,
    meals: "Included",
    image:
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=900&q=85",
    alt: "Illustrative furnished bedroom",
    amenities: [
      ["bed", "Twin sharing"],
      ["wifi", "Wi-Fi"],
      ["food", "Meals included"],
    ],
  },
  {
    id: "campus-corner",
    name: "Campus Corner",
    type: "hostel",
    locality: "Vijay Nagar",
    city: "Indore",
    rent: 8000,
    unit: "person",
    deposit: 8000,
    meals: "Optional, charged separately",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85",
    alt: "Illustrative bright bedroom with soft bedding",
    amenities: [
      ["users", "Shared room"],
      ["wifi", "Wi-Fi"],
      ["food", "Meals optional"],
    ],
  },
  {
    id: "urban-nest",
    name: "Urban Nest",
    type: "room",
    locality: "Palasia",
    city: "Indore",
    rent: 9500,
    unit: "room",
    deposit: 9500,
    meals: "Not included",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=85",
    alt: "Illustrative apartment living area",
    amenities: [
      ["door", "Private room"],
      ["wifi", "Wi-Fi"],
      ["home", "Furnished"],
    ],
  },
  {
    id: "study-square",
    name: "Study Square",
    type: "pg",
    locality: "Rau",
    city: "Indore",
    rent: 7000,
    unit: "person",
    deposit: 7000,
    meals: "Included",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85",
    alt: "Illustrative furnished room",
    amenities: [
      ["users", "Triple sharing"],
      ["wifi", "Wi-Fi"],
      ["food", "Meals included"],
    ],
  },
  {
    id: "the-courtyard",
    name: "The Courtyard",
    type: "flat",
    locality: "Vijay Nagar",
    city: "Indore",
    rent: 18000,
    unit: "flat",
    deposit: 18000,
    meals: "Not included",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85",
    alt: "Illustrative furnished apartment",
    amenities: [
      ["home", "Entire flat"],
      ["door", "2 bedrooms"],
      ["wifi", "Wi-Fi ready"],
    ],
  },
  {
    id: "city-corner",
    name: "City Corner",
    type: "hostel",
    locality: "Bhawarkuan",
    city: "Indore",
    rent: 6500,
    unit: "person",
    deposit: 6500,
    meals: "Optional, charged separately",
    image:
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=900&q=85",
    alt: "Illustrative room with a neatly made bed",
    amenities: [
      ["users", "Triple sharing"],
      ["wifi", "Wi-Fi"],
      ["food", "Meals optional"],
    ],
  },
];

const typeLabels = {
  pg: "PG",
  hostel: "Hostel",
  room: "Room",
  flat: "Flat",
};

/* =========================
   ELEMENTS AND STATE
========================= */

const searchForm = document.getElementById("search-form");
const locationInput = document.getElementById("location");
const typeInput = document.getElementById("stay-type");
const budgetInput = document.getElementById("budget");
const sortInput = document.getElementById("sort");

const propertyGrid = document.getElementById("property-grid");
const resultsMessage = document.getElementById("results-message");
const emptyState = document.getElementById("empty-state");

const savedButton = document.getElementById("saved-button");
const savedCount = document.getElementById("saved-count");

const dialog = document.getElementById("preview-dialog");
const dialogContent = document.getElementById("dialog-content");
const closeDialogButton = document.getElementById("close-dialog");

const state = {
  location: "",
  type: "all",
  budget: "all",
  sort: "featured",
  savedOnly: false,
  showAll: false,
};

const storageKey = "staynest-homepage-saved";
let savedProperties = new Set();
let lastDialogTrigger = null;
let toastTimer;

/* Restore valid property IDs only */
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");

  if (Array.isArray(stored)) {
    savedProperties = new Set(
      stored.filter((id) => properties.some((property) => property.id === id)),
    );
  }
} catch {
  // The homepage still works when browser storage is unavailable.
}

/* =========================
   HELPERS
========================= */

function icon(name) {
  return `
    <svg class="icon" aria-hidden="true">
      <use href="#icon-${name}"></use>
    </svg>
  `;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function showToast(message) {
  const toast = document.getElementById("toast");

  clearTimeout(toastTimer);

  toast.textContent = message;
  toast.hidden = false;

  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

function scrollToStays() {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  document.getElementById("stays").scrollIntoView({
    behavior: reducedMotion ? "instant" : "smooth",
  });
}

/* =========================
   FILTER AND RENDER STAYS
========================= */

function getFilteredProperties() {
  const query = state.location.trim().toLowerCase();

  const filtered = properties.filter((property) => {
    const searchableText = [property.name, property.locality, property.city]
      .join(" ")
      .toLowerCase();

    const matchesLocation = !query || searchableText.includes(query);

    const matchesType = state.type === "all" || property.type === state.type;

    const matchesBudget =
      state.budget === "all" || property.rent <= Number(state.budget);

    const matchesSaved = !state.savedOnly || savedProperties.has(property.id);

    return matchesLocation && matchesType && matchesBudget && matchesSaved;
  });

  if (state.sort === "low") {
    filtered.sort((a, b) => a.rent - b.rent);
  }

  if (state.sort === "high") {
    filtered.sort((a, b) => b.rent - a.rent);
  }

  return filtered;
}

function createPropertyCard(property) {
  const isSaved = savedProperties.has(property.id);

  return `
    <article class="property-card">
      <div class="property-photo">
        <img
          src="${escapeHTML(property.image)}"
          alt="${escapeHTML(property.alt)}"
          width="900"
          height="600"
          loading="lazy"
        >

        <span class="property-type">
          ${typeLabels[property.type]}
        </span>

        <button
          class="icon-button save-property"
          type="button"
          data-save="${property.id}"
          aria-pressed="${isSaved}"
          aria-label="${isSaved ? "Unsave" : "Save"} ${escapeHTML(property.name)}"
        >
          ${icon("heart")}
        </button>
      </div>

      <div class="property-content">
        <div class="property-title">
          <h3>${escapeHTML(property.name)}</h3>
          <span class="demo-badge">Demo listing</span>
        </div>

        <p class="property-location">
          ${icon("pin")}
          ${escapeHTML(property.locality)}, ${escapeHTML(property.city)}
        </p>

        <p class="property-price">
          <strong>${formatMoney(property.rent)}</strong>
          <span>/ ${escapeHTML(property.unit)} / month</span>
        </p>

        <div class="property-amenities">
          ${property.amenities
            .map(
              ([iconName, label]) => `
            <span class="amenity">
              ${icon(iconName)}
              ${escapeHTML(label)}
            </span>
          `,
            )
            .join("")}
        </div>

        <button
          class="button button-outline"
          type="button"
          data-view="${property.id}"
        >
          View stay
          ${icon("arrow")}
        </button>
      </div>
    </article>
  `;
}

function renderProperties() {
  const filtered = getFilteredProperties();

  const visibleProperties =
    state.showAll || state.savedOnly ? filtered : filtered.slice(0, 3);

  propertyGrid.innerHTML = visibleProperties.map(createPropertyCard).join("");

  emptyState.hidden = visibleProperties.length > 0;

  if (state.savedOnly) {
    resultsMessage.textContent = `${filtered.length} saved ${filtered.length === 1 ? "stay" : "stays"} found.`;
  } else if (state.showAll) {
    resultsMessage.textContent = `${filtered.length} sample ${filtered.length === 1 ? "stay matches" : "stays match"} your search.`;
  } else {
    resultsMessage.textContent =
      "Thoughtfully picked spaces. A little something for everyone.";
  }

  const emptyTitle = document.getElementById("empty-title");
  const emptyDescription = document.getElementById("empty-description");

  if (state.savedOnly && savedProperties.size === 0) {
    emptyTitle.textContent = "Your shortlist starts here.";
    emptyDescription.textContent =
      "Tap the heart on a stay to save it for later.";
  } else {
    emptyTitle.textContent = "No stays match your search.";
    emptyDescription.textContent = "Try another locality or a wider budget.";
  }

  savedCount.textContent = savedProperties.size;

  savedButton.setAttribute("aria-pressed", String(state.savedOnly));

  savedButton.setAttribute(
    "aria-label",
    state.savedOnly ? "Show all stays" : "Show saved stays",
  );

  document.querySelectorAll("[data-type]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.type === state.type),
    );
  });
}

function applySearch() {
  state.location = locationInput.value.trim();
  state.type = typeInput.value;
  state.budget = budgetInput.value;
  state.savedOnly = false;
  state.showAll = true;

  renderProperties();
  scrollToStays();
}

function resetFilters() {
  state.location = "";
  state.type = "all";
  state.budget = "all";
  state.sort = "featured";
  state.savedOnly = false;
  state.showAll = true;

  locationInput.value = "Indore";
  typeInput.value = "all";
  budgetInput.value = "all";
  sortInput.value = "featured";

  renderProperties();
}

/* =========================
   SEARCH EVENTS
========================= */

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  applySearch();
});

sortInput.addEventListener("change", () => {
  state.sort = sortInput.value;
  state.showAll = true;

  renderProperties();
});

document.getElementById("view-all").addEventListener("click", () => {
  resetFilters();
  scrollToStays();
});

document
  .getElementById("reset-filters")
  .addEventListener("click", resetFilters);

document.getElementById("empty-reset").addEventListener("click", () => {
  resetFilters();

  document.getElementById("reset-filters").focus({
    preventScroll: true,
  });
});

document.querySelectorAll("[data-location]").forEach((button) => {
  button.addEventListener("click", () => {
    locationInput.value = button.dataset.location;
    applySearch();
  });
});

document.querySelectorAll("[data-type]").forEach((button) => {
  button.addEventListener("click", () => {
    typeInput.value = button.dataset.type;
    applySearch();
  });
});

/* =========================
   SAVED STAYS
========================= */

function toggleSavedProperty(id, button) {
  const property = properties.find((item) => item.id === id);

  if (!property) return;

  const wasSaved = savedProperties.has(id);

  if (wasSaved) {
    savedProperties.delete(id);
  } else {
    savedProperties.add(id);
  }

  let storageAvailable = true;

  try {
    localStorage.setItem(storageKey, JSON.stringify([...savedProperties]));
  } catch {
    storageAvailable = false;
  }

  savedCount.textContent = savedProperties.size;

  if (state.savedOnly) {
    renderProperties();
    savedButton.focus({ preventScroll: true });
  } else {
    button.setAttribute("aria-pressed", String(savedProperties.has(id)));

    button.setAttribute(
      "aria-label",
      `${savedProperties.has(id) ? "Unsave" : "Save"} ${property.name}`,
    );
  }

  const message = wasSaved
    ? "Removed from saved stays."
    : "Saved to your shortlist.";

  showToast(
    storageAvailable
      ? message
      : `${message} Changes will last for this session only.`,
  );
}

savedButton.addEventListener("click", () => {
  const shouldShowSaved = !state.savedOnly;

  resetFilters();

  state.savedOnly = shouldShowSaved;
  renderProperties();
  scrollToStays();
});

/* =========================
   PROPERTY PREVIEW DIALOG
========================= */

function openDialog(content, trigger) {
  lastDialogTrigger = trigger || document.activeElement;

  dialogContent.innerHTML = content;
  document.body.classList.add("dialog-open");

  dialog.showModal();
  closeDialogButton.focus();
}

function openPropertyPreview(id, trigger) {
  const property = properties.find((item) => item.id === id);

  if (!property) return;

  openDialog(
    `
    <img
      class="dialog-photo"
      src="${escapeHTML(property.image)}"
      alt="${escapeHTML(property.alt)}"
    >

    <p class="eyebrow">ILLUSTRATIVE DEMO LISTING</p>

    <h2 id="dialog-title">${escapeHTML(property.name)}</h2>

    <p>
      ${escapeHTML(property.locality)},
      ${escapeHTML(property.city)}
    </p>

    <dl class="dialog-costs">
      <div>
        <dt>Monthly rent</dt>
        <dd>
          ${formatMoney(property.rent)} /
          ${escapeHTML(property.unit)}
        </dd>
      </div>

      <div>
        <dt>Security deposit</dt>
        <dd>${formatMoney(property.deposit)}</dd>
      </div>

      <div>
        <dt>Meals</dt>
        <dd>${escapeHTML(property.meals)}</dd>
      </div>

      <div>
        <dt>Electricity</dt>
        <dd>As billed</dd>
      </div>

      <div>
        <dt>Deposit return</dt>
        <dd>Subject to property terms</dd>
      </div>
    </dl>

    <p class="dialog-notice">
      This is a homepage preview with sample information.
      Visit scheduling and stay requests are not available here.
      No accommodation is reserved.
    </p>
  `,
    trigger,
  );
}

propertyGrid.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save]");

  if (saveButton) {
    toggleSavedProperty(saveButton.dataset.save, saveButton);
    return;
  }

  const viewButton = event.target.closest("[data-view]");

  if (viewButton) {
    openPropertyPreview(viewButton.dataset.view, viewButton);
  }
});

closeDialogButton.addEventListener("click", () => {
  dialog.close();
});

/* Close only when clicking outside the dialog rectangle */
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;

  const bounds = dialog.getBoundingClientRect();

  const clickedOutside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (clickedOutside) {
    dialog.close();
  }
});

dialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");

  if (lastDialogTrigger?.isConnected) {
    lastDialogTrigger.focus({ preventScroll: true });
  }
});

/* =========================
   HOMEPAGE INFORMATION
========================= */

const information = {
  login: {
    title: "Your next chapter starts here.",
    text: "Sign-in is not available in this homepage preview. You can explore sample properties and save your favourites on this device.",
  },
  owner: {
    title: "Make room for better management.",
    text: "StayNest is designed to help owners manage properties, rooms and everyday requests. Property registration is not available in this homepage preview.",
  },
  about: {
    title: "Find a stay. Feel at home.",
    text: "StayNest helps people explore monthly accommodation, compare listed costs and find a space that fits their everyday life. The listings shown here are fictional examples.",
  },
  help: {
    title: "A little help for your next move.",
    text: "The homepage FAQs explain visits, monthly charges and deposits. A support contact service is not available in this preview.",
  },
  privacy: {
    title: "Your privacy in this preview.",
    text: "Saved property IDs stay in this browser using localStorage. This page has no account service or analytics. Photos load from Unsplash, which receives image requests from your browser. You can remove saved properties using their heart buttons or clear this site's browser data.",
  },
};

document.querySelectorAll("[data-info]").forEach((button) => {
  button.addEventListener("click", () => {
    const item = information[button.dataset.info];

    if (!item) return;

    openDialog(
      `
      <p class="eyebrow">STAYNEST</p>
      <h2 id="dialog-title">${escapeHTML(item.title)}</h2>
      <p>${escapeHTML(item.text)}</p>
    `,
      button,
    );
  });
});

/* =========================
   MOBILE NAVIGATION
========================= */

const menuButton = document.getElementById("menu-button");
const mobileNav = document.getElementById("mobile-nav");

function setMenuOpen(open) {
  mobileNav.hidden = !open;

  menuButton.setAttribute("aria-expanded", String(open));

  menuButton.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );

  menuButton.innerHTML = icon(open ? "close" : "menu");
}

menuButton.addEventListener("click", () => {
  setMenuOpen(mobileNav.hidden);
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    setMenuOpen(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden && !dialog.open) {
    setMenuOpen(false);
    menuButton.focus();
  }
});

window.matchMedia("(min-width: 801px)").addEventListener("change", (event) => {
  if (event.matches) {
    setMenuOpen(false);
  }
});

/* =========================
   START HOMEPAGE
========================= */

document.getElementById("year").textContent = new Date().getFullYear();

renderProperties();
