
"use strict";

/* =========================================
   STAYNEST - SEARCH & LISTINGS
   Frontend demo data; no backend required.
========================================= */

const properties = [
  {
    id: "green-valley",
    name: "Green Valley PG",
    city: "Indore",
    locality: "Vijay Nagar",
    type: "PG",
    sharing: "Double",
    price: 5000,
    unit: "person",
    meals: true,
    furnishing: "Furnished",
    rating: 4.5,
    amenities: ["Wi-Fi", "AC", "Mess", "Security"],
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "sunrise-hostel",
    name: "Sunrise Hostel",
    city: "Indore",
    locality: "Rajendra Nagar",
    type: "Hostel",
    sharing: "Triple",
    price: 4500,
    unit: "person",
    meals: true,
    furnishing: "Furnished",
    rating: 4.2,
    amenities: ["Wi-Fi", "Mess", "Laundry", "Security"],
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "maple-residency",
    name: "Maple Residency",
    city: "Indore",
    locality: "Bhawarkua",
    type: "Room",
    sharing: "Private",
    price: 7500,
    unit: "room",
    meals: false,
    furnishing: "Semi-Furnished",
    rating: 4.3,
    amenities: ["Wi-Fi", "Parking", "Laundry"],
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "orchid-flats",
    name: "Orchid Flats",
    city: "Indore",
    locality: "Palasia",
    type: "Flat",
    sharing: "Private",
    price: 12000,
    unit: "room",
    meals: false,
    furnishing: "Furnished",
    rating: 4.6,
    amenities: ["AC", "Parking", "Security", "Power Backup"],
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "comfort-pg",
    name: "Comfort Living PG",
    city: "Indore",
    locality: "Vijay Nagar",
    type: "PG",
    sharing: "Single",
    price: 8500,
    unit: "person",
    meals: true,
    furnishing: "Furnished",
    rating: 4.4,
    amenities: ["Wi-Fi", "AC", "Mess", "CCTV"],
    image: "https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "urban-nest",
    name: "Urban Nest Rooms",
    city: "Indore",
    locality: "Palasia",
    type: "Room",
    sharing: "Private",
    price: 6500,
    unit: "room",
    meals: false,
    furnishing: "Unfurnished",
    rating: 4.0,
    amenities: ["Parking", "Security"],
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "scholar-hostel",
    name: "Scholar's Hostel",
    city: "Indore",
    locality: "Bhawarkua",
    type: "Hostel",
    sharing: "Double",
    price: 3800,
    unit: "person",
    meals: true,
    furnishing: "Semi-Furnished",
    rating: 4.1,
    amenities: ["Wi-Fi", "Mess", "Study Room"],
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "lakeview-flat",
    name: "Lakeview Flat",
    city: "Indore",
    locality: "Rau",
    type: "Flat",
    sharing: "Private",
    price: 15000,
    unit: "room",
    meals: false,
    furnishing: "Semi-Furnished",
    rating: 4.7,
    amenities: ["Parking", "Security", "Power Backup"],
    image: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=900&q=80"
  }
];

/* =========================================
   ELEMENTS AND INITIAL STATE
========================================= */

const $ = selector => document.querySelector(selector);

const params = new URLSearchParams(window.location.search);

const validTypes = ["All", "PG", "Hostel", "Room", "Flat"];
const requestedType = params.get("type") || "All";

const state = {
  location: params.get("location") || "",
  type: validTypes.includes(requestedType) ? requestedType : "All",
  sharing: "All",
  maxBudget: 20000,
  meals: false,
  furnishing: "All",
  sort: "recommended",
  savedOnly: params.get("view") === "saved"
};

/* =========================================
   HELPERS
========================================= */

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function readSaved() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("staynest_saved") || "[]"
    );

    return Array.isArray(saved)
      ? saved.filter(id => typeof id === "string")
      : [];
  } catch (error) {
    console.warn("Could not read saved properties.", error);
    return [];
  }
}

function writeSaved(saved) {
  try {
    localStorage.setItem("staynest_saved", JSON.stringify(saved));
    return true;
  } catch (error) {
    alert("Your browser could not save this property. Check local storage settings.");
    return false;
  }
}

function updateSavedCount() {
  $("#savedCount").textContent = readSaved().length;
}

function createDetailsUrl(propertyId) {
  const url = new URL("details.html", window.location.href);

  url.searchParams.set("id", propertyId);
  url.searchParams.set("from", window.location.href);

  return url.href;
}

/* =========================================
   FILTERING AND SORTING
========================================= */

function getFilteredProperties() {
  const query = state.location.trim().toLowerCase();
  const saved = readSaved();

  let results = properties.filter(property => {
    const searchableText =
      `${property.name} ${property.city} ${property.locality}`.toLowerCase();

    const matchesLocation =
      !query || searchableText.includes(query);

    const matchesType =
      state.type === "All" || property.type === state.type;

    const matchesSharing =
      state.sharing === "All" || property.sharing === state.sharing;

    const matchesBudget =
      property.price <= state.maxBudget;

    const matchesMeals =
      !state.meals || property.meals;

    const matchesFurnishing =
      state.furnishing === "All" ||
      property.furnishing === state.furnishing;

    const matchesSaved =
      !state.savedOnly || saved.includes(property.id);

    return matchesLocation &&
      matchesType &&
      matchesSharing &&
      matchesBudget &&
      matchesMeals &&
      matchesFurnishing &&
      matchesSaved;
  });

  if (state.sort === "low") {
    results.sort((a, b) => a.price - b.price);
  } else if (state.sort === "high") {
    results.sort((a, b) => b.price - a.price);
  } else if (state.sort === "rating") {
    results.sort((a, b) => b.rating - a.rating);
  }

  return results;
}

/* =========================================
   PROPERTY CARDS
========================================= */

function renderProperties() {
  const results = getFilteredProperties();
  const grid = $("#propertyGrid");

  $("#resultsCount").textContent =
    `${results.length} ${results.length === 1 ? "stay" : "stays"} found`;

  $("#resultsTitle").textContent =
    state.savedOnly ? "Your saved stays" : "Available stays";

  $("#emptyState").hidden = results.length !== 0;
  grid.hidden = results.length === 0;

  grid.innerHTML = results.map(property => {
    const saved = readSaved().includes(property.id);
    const detailsUrl = createDetailsUrl(property.id);
    const unitLabel = property.unit === "person" ? "person" : "room";

    return `
      <article class="property-card" data-id="${escapeHTML(property.id)}">

        <a class="card-image-link" href="${detailsUrl}"
           aria-label="View ${escapeHTML(property.name)} details">

          <img class="card-image"
               src="${property.image}"
               alt="${escapeHTML(property.name)}"
               loading="lazy">

          <span class="card-badge">
            ${escapeHTML(property.type)}
          </span>
        </a>

        <button
          class="favorite-button ${saved ? "is-saved" : ""}"
          type="button"
          data-favorite="${escapeHTML(property.id)}"
          aria-label="${saved ? "Remove saved property" : "Save property"}"
          aria-pressed="${saved}">
          ${saved ? "♥" : "♡"}
        </button>

        <div class="card-body">

          <div class="card-title-row">
            <h3 class="card-title">${escapeHTML(property.name)}</h3>
            <span class="rating">★ ${property.rating.toFixed(1)}</span>
          </div>

          <p class="card-location">
            📍 ${escapeHTML(property.locality)}, ${escapeHTML(property.city)}
          </p>

          <div class="card-tags">
            ${property.amenities.slice(0, 4).map(amenity => `
              <span class="card-tag">${escapeHTML(amenity)}</span>
            `).join("")}

            <span class="card-tag">
              ${escapeHTML(property.sharing)} sharing
            </span>

            <span class="card-tag">
              ${property.meals ? "Meals included" : "No meals"}
            </span>

            <span class="card-tag">
              ${escapeHTML(property.furnishing)}
            </span>
          </div>

          <div class="card-bottom">
            <div class="rent">
              ${money(property.price)}
              <small>/ ${unitLabel}/month</small>
            </div>

            <a class="details-link" href="${detailsUrl}">
              View details →
            </a>
          </div>

        </div>
      </article>
    `;
  }).join("");
}

/* =========================================
   SYNC UI WITH STATE
========================================= */

function syncControls() {
  $("#locationSearch").value = state.location;
  $("#typeFilter").value = state.type;
  $("#sharingFilter").value = state.sharing;
  $("#budgetRange").value = state.maxBudget;
  $("#mealsFilter").checked = state.meals;
  $("#furnishedFilter").value = state.furnishing;
  $("#sortFilter").value = state.sort;

  $("#budgetValue").textContent =
    state.maxBudget >= 20000
      ? "Up to ₹20,000+"
      : `Up to ${money(state.maxBudget)}`;

  document.querySelectorAll(".category").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.type === state.type
    );
  });
}

function render() {
  syncControls();
  renderProperties();
  updateSavedCount();
}

function readFilterControls() {
  state.type = $("#typeFilter").value;
  state.sharing = $("#sharingFilter").value;
  state.maxBudget = Number($("#budgetRange").value);
  state.meals = $("#mealsFilter").checked;
  state.furnishing = $("#furnishedFilter").value;
  state.sort = $("#sortFilter").value;
}

/* =========================================
   CLEAR FILTERS
========================================= */

function clearFilters() {
  state.location = "";
  state.type = "All";
  state.sharing = "All";
  state.maxBudget = 20000;
  state.meals = false;
  state.furnishing = "All";
  state.sort = "recommended";
  state.savedOnly = false;

  const url = new URL(window.location.href);
  url.search = "";

  history.replaceState({}, "", url);
  closeDrawer();
  render();
}

/* =========================================
   MOBILE FILTER DRAWER
========================================= */

function openDrawer() {
  $("#filterSidebar").classList.add("open");
  $("#filterOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("#filterSidebar").classList.remove("open");
  $("#filterOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

/* =========================================
   SEARCH
========================================= */

$("#searchForm").addEventListener("submit", event => {
  event.preventDefault();

  state.location = $("#locationSearch").value.trim();
  state.savedOnly = false;

  render();
});

$("#locationSearch").addEventListener("input", () => {
  state.location = $("#locationSearch").value.trim();
  state.savedOnly = false;
  renderProperties();
  $("#resultsTitle").textContent = "Available stays";
});

document.querySelectorAll("[data-location]").forEach(button => {
  button.addEventListener("click", () => {
    state.location = button.dataset.location;
    state.savedOnly = false;
    render();
  });
});

/* =========================================
   CATEGORY BUTTONS
========================================= */

$("#categoryRow").addEventListener("click", event => {
  const button = event.target.closest("[data-type]");

  if (!button) return;

  state.type = button.dataset.type;
  state.savedOnly = false;

  render();
});

/* =========================================
   FILTERS AND SORTING
========================================= */

[
  "#typeFilter",
  "#sharingFilter",
  "#budgetRange",
  "#mealsFilter",
  "#furnishedFilter",
  "#sortFilter"
].forEach(selector => {
  $(selector).addEventListener("change", () => {
    readFilterControls();
    state.savedOnly = false;
    renderProperties();
    updateSavedCount();

    $("#resultsTitle").textContent = "Available stays";

    document.querySelectorAll(".category").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.type === state.type
      );
    });
  });
});

$("#budgetRange").addEventListener("input", () => {
  state.maxBudget = Number($("#budgetRange").value);

  $("#budgetValue").textContent =
    state.maxBudget >= 20000
      ? "Up to ₹20,000+"
      : `Up to ${money(state.maxBudget)}`;

  state.savedOnly = false;
  renderProperties();
  $("#resultsTitle").textContent = "Available stays";
});

$("#clearFilters").addEventListener("click", clearFilters);
$("#resetEmpty").addEventListener("click", clearFilters);

$("#openFilters").addEventListener("click", openDrawer);
$("#closeFilters").addEventListener("click", closeDrawer);
$("#filterOverlay").addEventListener("click", closeDrawer);

$("#applyFilters").addEventListener("click", () => {
  readFilterControls();
  state.savedOnly = false;
  closeDrawer();
  render();
});

/* Close the mobile drawer with Escape */
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeDrawer();
});

/* =========================================
   SAVE / UNSAVE PROPERTIES
   Shared key: staynest_saved
========================================= */

$("#propertyGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-favorite]");

  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  const id = button.dataset.favorite;
  const saved = readSaved();
  const alreadySaved = saved.includes(id);

  const updated = alreadySaved
    ? saved.filter(savedId => savedId !== id)
    : [...saved, id];

  if (writeSaved(updated)) {
    render();
  }
});

/* =========================================
   MOBILE NAVIGATION
========================================= */

$("#menuToggle").addEventListener("click", () => {
  const nav = $("#navLinks");
  const isOpen = nav.classList.toggle("open");

  $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
});

/* =========================================
   INITIALIZE PAGE
========================================= */

$("#year").textContent = new Date().getFullYear();

if (state.savedOnly) {
  state.location = "";
}

render();