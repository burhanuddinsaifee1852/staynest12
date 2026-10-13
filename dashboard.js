
"use strict";

/* =========================================
   STAYNEST DASHBOARD
   Frontend demo only — no backend required
========================================= */

const $ = selector => document.querySelector(selector);

const STORAGE = {
  saved: "staynest_saved",
  profile: "staynest_demo_profile",
  selection: "staynest_pending_booking"
};

const properties = [
  {
    id: "green-valley",
    name: "Green Valley PG",
    locality: "Vijay Nagar, Indore",
    price: 5000,
    unit: "person",
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "sunrise-hostel",
    name: "Sunrise Hostel",
    locality: "Rajendra Nagar, Indore",
    price: 4500,
    unit: "person",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "maple-residency",
    name: "Maple Residency",
    locality: "Bhawarkua, Indore",
    price: 7500,
    unit: "room",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "orchid-flats",
    name: "Orchid Flats",
    locality: "Palasia, Indore",
    price: 12000,
    unit: "room",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "comfort-pg",
    name: "Comfort Living PG",
    locality: "Vijay Nagar, Indore",
    price: 8500,
    unit: "person",
    image: "https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "urban-nest",
    name: "Urban Nest Rooms",
    locality: "Palasia, Indore",
    price: 6500,
    unit: "room",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "scholar-hostel",
    name: "Scholar's Hostel",
    locality: "Bhawarkua, Indore",
    price: 3800,
    unit: "person",
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "lakeview-flat",
    name: "Lakeview Flat",
    locality: "Rau, Indore",
    price: 15000,
    unit: "room",
    image: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=700&q=80"
  }
];

const viewConfig = {
  overview: {
    title: "Dashboard Overview",
    subtitle: "Manage your saved stays and accommodation plans."
  },
  bookings: {
    title: "My Bookings",
    subtitle: "Review the accommodation plans you have selected."
  },
  saved: {
    title: "Saved Properties",
    subtitle: "Keep the stays you like in one place."
  },
  profile: {
    title: "My Profile",
    subtitle: "Manage your basic profile information."
  }
};

/* =========================================
   STORAGE HELPERS
========================================= */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read ${key}.`, error);
    return fallback;
  }
}

function readSaved() {
  const value = readJSON(STORAGE.saved, []);

  return Array.isArray(value)
    ? [...new Set(value.filter(id => typeof id === "string"))]
    : [];
}

function readProfile() {
  const value = readJSON(STORAGE.profile, {});

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function readSelection() {
  const value = readJSON(STORAGE.selection, null);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

function saveSaved(ids) {
  try {
    localStorage.setItem(STORAGE.saved, JSON.stringify(ids));
    return true;
  } catch (error) {
    showToast("Could not update saved properties. Check browser storage.");
    return false;
  }
}

/* =========================================
   HELPERS
========================================= */

function money(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getInitial(name) {
  return String(name || "S").trim().charAt(0).toUpperCase() || "S";
}

function findProperty(id) {
  return properties.find(property => property.id === id);
}

function detailsURL(id) {
  const url = new URL("details.html", window.location.href);
  url.searchParams.set("id", id);
  return url.href;
}

let toastTimer;

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

/* =========================================
   PROFILE DISPLAY
========================================= */

function updateProfileDisplay() {
  const profile = readProfile();
  const name = profile.name || "StayNest Member";
  const initial = getInitial(name);

  $("#sidebarName").textContent = name;
  $("#sidebarAvatar").textContent = initial;
  $("#profileAvatar").textContent = initial;
  $("#welcomeName").textContent = profile.name
    ? profile.name.trim().split(/\s+/)[0]
    : "there";

  $("#profileStat").textContent =
    profile.name && profile.email ? "Complete" : "Basic";

  $("#profileName").value = profile.name || "";
  $("#profileEmail").value = profile.email || "";
  $("#profilePhone").value = profile.phone || "";
  $("#profileCity").value = profile.city || "";
}

/* =========================================
   DASHBOARD STATISTICS
========================================= */

function updateStats() {
  const saved = readSaved();
  const selection = readSelection();

  $("#savedStat").textContent = saved.length;
  $("#bookingStat").textContent = selection ? "1" : "0";
}

/* =========================================
   VIEW NAVIGATION
========================================= */

function showView(viewName) {
  if (!viewConfig[viewName]) return;

  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.hidden = panel.id !== `${viewName}View`;
    panel.classList.toggle(
      "active",
      panel.id === `${viewName}View`
    );
  });

  document.querySelectorAll(".dashboard-nav-button").forEach(button => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  $("#pageTitle").textContent = viewConfig[viewName].title;
  $("#pageSubtitle").textContent = viewConfig[viewName].subtitle;

  if (viewName === "saved") renderSavedProperties();
  if (viewName === "bookings") renderBookings();

  $("#sidebar").scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-view]");
  if (!button) return;

  event.preventDefault();
  showView(button.dataset.view);
});

/* =========================================
   SAVED PROPERTIES
========================================= */

function renderSavedProperties() {
  const savedIds = readSaved();
  const savedProperties = savedIds
    .map(findProperty)
    .filter(Boolean);

  const grid = $("#savedGrid");
  const empty = $("#savedEmpty");

  empty.hidden = savedProperties.length !== 0;
  grid.hidden = savedProperties.length === 0;

  grid.innerHTML = savedProperties.map(property => `
    <article class="saved-card">
      <img
        src="${property.image}"
        alt="${escapeHTML(property.name)}"
        loading="lazy"
      >

      <div class="saved-card-body">
        <h3>${escapeHTML(property.name)}</h3>
        <p>📍 ${escapeHTML(property.locality)}</p>

        <div class="saved-rent">
          ${money(property.price)} / ${property.unit}/month
        </div>

        <div class="saved-card-actions">
          <a class="button button-primary"
             href="${detailsURL(property.id)}">
            View property
          </a>

          <button type="button"
                  class="button remove-save"
                  data-remove-saved="${escapeHTML(property.id)}">
            ♥ Remove saved
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

$("#savedGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-saved]");
  if (!button) return;

  const id = button.dataset.removeSaved;
  const updated = readSaved().filter(savedId => savedId !== id);

  if (!saveSaved(updated)) return;

  renderSavedProperties();
  updateStats();
  renderRecentActivity();
  showToast("Property removed from saved stays.");
});

/* =========================================
   PENDING SELECTION / BOOKING DEMO
========================================= */

function renderBookings() {
  const selection = readSelection();
  const container = $("#bookingList");
  const empty = $("#bookingEmpty");

  if (!selection) {
    container.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  const property = findProperty(selection.propertyId);
  const propertyName = selection.propertyName ||
    (property ? property.name : "Selected property");

  const unit = selection.unit === "room" ? "room" : "person";
  const price = money(selection.price);

  let selectedDate = "";

  if (selection.createdAt) {
    const date = new Date(selection.createdAt);

    if (!Number.isNaN(date.getTime())) {
      selectedDate = date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
  }

  container.innerHTML = `
    <article class="booking-card">
      <div class="booking-card-top">
        <div>
          <span class="activity-status">NOT CONFIRMED</span>
          <h3>${escapeHTML(propertyName)}</h3>
          <p>Selected plan: ${escapeHTML(selection.plan || "Plan not specified")}</p>
          ${selectedDate ? `<p>Selection date: ${escapeHTML(selectedDate)}</p>` : ""}
        </div>

        <div class="booking-price">
          ${price}
          <small> / ${unit}/month</small>
        </div>
      </div>

      <div class="booking-actions">
        ${property ? `
          <a class="button button-primary"
             href="${detailsURL(property.id)}">
            View property
          </a>
        ` : ""}

        <button class="button" type="button" id="removeSelection">
          Remove selection
        </button>
      </div>
    </article>
  `;

  $("#removeSelection").addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE.selection);
    } catch (error) {
      showToast("Could not remove the selection.");
      return;
    }

    renderBookings();
    renderRecentActivity();
    updateStats();
    showToast("Demo selection removed.");
  });
}

/* =========================================
   RECENT ACTIVITY
========================================= */

function renderRecentActivity() {
  const container = $("#recentActivity");
  const selection = readSelection();

  if (!selection) {
    container.innerHTML = `
      <div class="activity-empty">
        <strong>No recent selections</strong>
        Your selected accommodation plans will appear here.
        <p><a class="text-link" href="listings.html">Browse available stays →</a></p>
      </div>
    `;
    return;
  }

  const property = findProperty(selection.propertyId);
  const propertyName = selection.propertyName ||
    (property ? property.name : "Selected property");

  const unit = selection.unit === "room" ? "room" : "person";

  container.innerHTML = `
    <div class="activity-row">
      <div>
        <strong>${escapeHTML(propertyName)}</strong>
        <p>
          ${escapeHTML(selection.plan || "Selected plan")}
          · ${money(selection.price)} / ${unit}/month
        </p>
        <span class="activity-status">NOT CONFIRMED</span>
      </div>

      <button class="button button-primary"
              type="button"
              data-view="bookings">
        View selection
      </button>
    </div>
  `;
}

/* =========================================
   EDIT PROFILE
========================================= */

$("#profileForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("#profileName").value.trim();
  const email = $("#profileEmail").value.trim();
  const phone = $("#profilePhone").value.trim();
  const city = $("#profileCity").value.trim();

  if (name.length < 2) {
    showToast("Please enter a name with at least 2 characters.");
    $("#profileName").focus();
    return;
  }

  const profile = { name, email, phone, city };

  try {
    localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
  } catch (error) {
    showToast("Could not save profile. Check browser storage.");
    return;
  }

  updateProfileDisplay();
  showToast("Profile saved on this device.");
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
   INITIALIZE
========================================= */

$("#year").textContent = new Date().getFullYear();

updateProfileDisplay();
updateStats();
renderSavedProperties();
renderBookings();
renderRecentActivity();
