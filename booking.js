"use strict";

const $ = selector => document.querySelector(selector);
const STORAGE = {
  selection: "staynest_pending_booking",
  requests: "staynest_demo_booking_requests"
};

const properties = [
  { id: "green-valley", name: "Green Valley PG", locality: "Vijay Nagar, Indore", type: "PG", rating: 4.5, image: "images/green-valley.jpg" },
  { id: "sunrise-hostel", name: "Sunrise Hostel", locality: "Rajendra Nagar, Indore", type: "Hostel", rating: 4.2, image: "images/sunrise-hostel.jpg" },
  { id: "maple-residency", name: "Maple Residency", locality: "Bhawarkua, Indore", type: "Room", rating: 4.3, image: "images/maple-residency.jpg" },
  { id: "orchid-flats", name: "Orchid Flats", locality: "Palasia, Indore", type: "Flat", rating: 4.6, image: "images/orchid-flats.jpg" },
  { id: "comfort-pg", name: "Comfort Living PG", locality: "Vijay Nagar, Indore", type: "PG", rating: 4.4, image: "images/comfort-pg.jpg" },
  { id: "urban-nest", name: "Urban Nest Rooms", locality: "Palasia, Indore", type: "Room", rating: 4.0, image: "images/urban-nest.jpg" },
  { id: "scholar-hostel", name: "Scholar's Hostel", locality: "Bhawarkua, Indore", type: "Hostel", rating: 4.1, image: "images/scholar-hostel.jpg" },
  { id: "lakeview-flat", name: "Lakeview Flat", locality: "Rau, Indore", type: "Flat", rating: 4.7, image: "images/lakeview-flat.jpg" }
];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key}`, error);
    return fallback;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return "Price unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(amount);
}

function propertyFor(selection) {
  if (!selection || typeof selection !== "object") return null;
  return properties.find(property => property.id === selection.propertyId) || null;
}

function showSection(id) {
  $("#noSelection").hidden = id !== "noSelection";
  $("#bookingLayout").hidden = id !== "bookingLayout";
  $("#successState").hidden = id !== "successState";
}

function getValidSelection() {
  const selection = readJSON(STORAGE.selection, null);
  if (!selection || typeof selection !== "object") return null;
  const price = Number(selection.price);
  if (!Number.isFinite(price) || price < 0) return null;
  return { ...selection, price };
}

function renderSelection(selection) {
  const property = propertyFor(selection);
  const name = selection.propertyName || (property && property.name) || "Selected property";
  const locality = property ? property.locality : "Location details unavailable";
  const type = property ? property.type : "Accommodation";
  const unit = selection.unit === "room" ? "room" : "person";

  $("#propertyName").textContent = name;
  $("#propertyLocation").textContent = `📍 ${locality}`;
  $("#propertyType").textContent = type;
  $("#propertyRating").textContent = property ? `★ ${property.rating.toFixed(1)}` : "Demo selection";
  $("#planName").textContent = selection.plan || "Selected plan";
  $("#monthlyRent").textContent = `${money(selection.price)} / month`;
  $("#rentUnit").textContent = `Per ${unit}`;
  $("#summaryTotal").textContent = money(selection.price);
  $("#viewProperty").href = property
    ? `details.html?id=${encodeURIComponent(property.id)}`
    : "listings.html";

  const image = $("#propertyImage");
  image.alt = name;
  image.src = property ? property.image : "";
  image.onerror = () => {
    image.onerror = null;
    image.style.display = "none";
  };

  // Never require a future date to be hard-coded; the visitor picks one.
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
  $("#moveInDate").min = localDate;
}

function loadPrefill() {
  const profile = readJSON("staynest_demo_profile", {});
  if (!profile || typeof profile !== "object") return;
  $("#guestName").value = typeof profile.name === "string" ? profile.name : "";
  $("#guestEmail").value = typeof profile.email === "string" ? profile.email : "";
  $("#guestPhone").value = typeof profile.phone === "string" ? profile.phone : "";
}

function setError(message) {
  const error = $("#formError");
  error.textContent = message;
  error.hidden = !message;
}

function submitDemoRequest(event) {
  event.preventDefault();
  setError("");

  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const selection = getValidSelection();
  if (!selection) {
    showSection("noSelection");
    return;
  }

  const email = $("#guestEmail").value.trim();
  const phone = $("#guestPhone").value.trim();
  const moveInDate = $("#moveInDate").value;

  if (!email || !$("#guestEmail").checkValidity()) {
    setError("Please enter a valid email address.");
    $("#guestEmail").focus();
    return;
  }
  if (phone.replace(/\D/g, "").length < 7) {
    setError("Please enter a valid phone number.");
    $("#guestPhone").focus();
    return;
  }
  if (!moveInDate) {
    setError("Please choose your expected move-in date.");
    $("#moveInDate").focus();
    return;
  }
  if (!$("#agreeDemo").checked) {
    setError("Please confirm that this is a demo request, not a confirmed booking.");
    $("#agreeDemo").focus();
    return;
  }

  const request = {
    id: `demo-${Date.now()}`,
    propertyId: selection.propertyId || "",
    propertyName: selection.propertyName || "Selected property",
    plan: selection.plan || "Selected plan",
    price: selection.price,
    unit: selection.unit === "room" ? "room" : "person",
    guest: {
      name: $("#guestName").value.trim(),
      email,
      phone
    },
    moveInDate,
    duration: $("#duration").value,
    occupants: $("#occupants").value,
    message: $("#message").value.trim(),
    status: "Demo request — not confirmed",
    submittedAt: new Date().toISOString()
  };

  const requests = readJSON(STORAGE.requests, []);
  if (!Array.isArray(requests)) {
    setError("Browser storage contains unexpected data. Please clear the demo request data and retry.");
    return;
  }

  try {
    requests.unshift(request);
    localStorage.setItem(STORAGE.requests, JSON.stringify(requests));
    localStorage.setItem(STORAGE.selection, JSON.stringify({ ...selection, status: "Not confirmed" }));
  } catch (error) {
    setError("Could not save the request in browser storage. Check your browser settings.");
    return;
  }

  $("#successText").textContent = `Your request for ${request.propertyName} was saved in this browser. Request reference: ${request.id}.`;
  showSection("successState");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#bookingForm").addEventListener("submit", submitDemoRequest);

$("#menuToggle").addEventListener("click", () => {
  const nav = $("#navLinks");
  const open = nav.classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(open));
});

$("#year").textContent = new Date().getFullYear();

const selection = getValidSelection();
if (selection) {
  showSection("bookingLayout");
  renderSelection(selection);
  loadPrefill();
} else {
  showSection("noSelection");
}
