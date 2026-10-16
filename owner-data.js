"use strict";

/* =========================================
   STAYNEST OWNER DATA LAYER
   Shared by owner-dashboard, owner-booking and owner-properties.
   Frontend prototype only: localStorage, no backend.

   Storage keys
   - staynest_demo_booking_requests  EXISTING key written by booking.js.
     Owner pages only ADD optional fields (ownerStatus, ownerUpdatedAt);
     the tenant-facing "status" text is never changed.
   - staynest_owner_properties       NEW key. The project had no shared
     property store (each page hard-codes its own list), so owners need one.
     Seeded from the same 8 properties and ids used by listings.js, so
     booking requests keep matching their property.
   - staynest_demo_profile           EXISTING key, read-only (owner name).

   Future backend: replace the read/write functions with fetch() calls to
   Express endpoints; page code only talks to these functions.
========================================= */

(function () {
  const KEYS = {
    bookings: "staynest_demo_booking_requests",
    properties: "staynest_owner_properties",
    profile: "staynest_demo_profile"
  };

  const PROPERTY_TYPES = ["PG", "Hostel", "Room", "Flat"];
  const PROPERTY_STATUSES = ["active", "draft", "inactive"];
  const SHARING_OPTIONS = ["Private", "Twin", "Triple"];
  const FURNISHING_OPTIONS = ["Furnished", "Semi-Furnished", "Unfurnished"];
  const BOOKING_STATUSES = ["pending", "approved", "rejected", "cancelled"];

  const AMENITY_OPTIONS = [
    "Wi-Fi", "AC", "Mess", "Laundry", "Parking", "Security",
    "CCTV", "Power Backup", "Study Room", "Geyser", "Housekeeping", "Lift"
  ];

  /* ---------- Generic helpers ---------- */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function money(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return "Not set";
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0
    }).format(amount);
  }

  function formatDate(value) {
    if (!value) return "Not provided";
    const text = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
      ? new Date(`${text}T00:00:00`)
      : new Date(text);
    if (Number.isNaN(date.getTime())) return "Not provided";
    return date.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /* ---------- Safe storage ---------- */

  // Returns { ok, exists, value }. Never throws.
  function readRaw(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return { ok: true, exists: false, value: null, raw: null };
      return { ok: true, exists: true, value: JSON.parse(raw), raw };
    } catch (error) {
      console.warn(`StayNest: could not read "${key}".`, error);
      let raw = null;
      try { raw = localStorage.getItem(key); } catch (ignored) { /* storage blocked */ }
      return { ok: false, exists: raw !== null, value: null, raw };
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`StayNest: could not save "${key}".`, error);
      return false;
    }
  }

  // Keep a copy of unreadable data once, so a later save never destroys it.
  function backupCorrupt(key, raw) {
    if (raw === null) return;
    try {
      const backupKey = `${key}_corrupt_backup`;
      if (localStorage.getItem(backupKey) === null) {
        localStorage.setItem(backupKey, raw);
      }
    } catch (error) {
      console.warn("StayNest: could not back up unreadable data.", error);
    }
  }

  /* ---------- Property catalog (same ids as listings.js) ---------- */

  const IMG = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;
  const ROOM_PHOTOS = [
    "photo-1540518614846-7eded433c457", "photo-1505693416388-ac5ce068fe85",
    "photo-1502672260266-1c1ef2d93688", "photo-1522708323590-d24dbb6b0267",
    "photo-1611892440504-42a792e24d32", "photo-1616486338812-3dadae4b4ace"
  ];
  const gallery = (...ids) => ids.map(IMG);

  const DEFAULT_RULES = {
    minStay: "3 months", notice: "30 days", guests: "Not allowed",
    smoking: "Not allowed", pets: "Not allowed", electricity: "As billed"
  };

  const SEED_PROPERTIES = [
    { id: "nest-house", name: "Nest House", type: "PG", locality: "Bhawarkuan", price: 8500, unit: "person", sharing: "Twin", meals: true, mealsNote: "Included", furnishing: "Furnished", rating: 4.6, amenities: ["Wi-Fi", "Study Room", "Mess", "Laundry", "Security", "Power Backup"], totalRooms: 12, availableRooms: 3, deposit: 8500, address: "Near Bhawarkuan Square, Khandwa Road", ownerName: "Mr. S. Verma",
      description: "Nest House is a well-maintained PG in the heart of Bhawarkuan, Indore. It offers comfortable rooms, a clean and homely environment, and easy access to nearby colleges, coaching centres and markets. Suitable for students and working professionals.",
      image: IMG(ROOM_PHOTOS[0]), images: gallery(ROOM_PHOTOS[0], ROOM_PHOTOS[1], ROOM_PHOTOS[2], ROOM_PHOTOS[3]),
      roomOptions: [
        { id: "twin", name: "Twin sharing", price: 8500, unit: "person", description: "Spacious twin sharing room with study desks and storage." },
        { id: "private", name: "Private room", price: 12000, unit: "room", description: "Single occupancy room with study table and wardrobe." }
      ] },
    { id: "campus-corner", name: "Campus Corner", type: "PG", locality: "Vijay Nagar", price: 8000, unit: "person", sharing: "Twin", meals: true, mealsNote: "Optional, charged separately", furnishing: "Furnished", rating: 4.4, amenities: ["Wi-Fi", "Study Room", "Mess", "CCTV", "Geyser"], totalRooms: 18, availableRooms: 5, deposit: 8000, address: "Scheme 78, Vijay Nagar", ownerName: "Mrs. R. Joshi",
      description: "Campus Corner is a bright PG close to coaching hubs and the Vijay Nagar market. Twin-sharing rooms come with study desks, and meals are available as an optional add-on.",
      image: IMG(ROOM_PHOTOS[1]), images: gallery(ROOM_PHOTOS[1], ROOM_PHOTOS[0], ROOM_PHOTOS[4], ROOM_PHOTOS[2]),
      roomOptions: [
        { id: "twin", name: "Twin sharing", price: 8000, unit: "person", description: "Twin sharing room with two study desks." },
        { id: "triple", name: "Triple sharing", price: 6500, unit: "person", description: "Budget-friendly triple sharing with shared storage." }
      ] },
    { id: "urban-nest", name: "Urban Nest", type: "Room", locality: "Palasia", price: 9500, unit: "room", sharing: "Private", meals: false, mealsNote: "Not included", furnishing: "Furnished", rating: 4.3, amenities: ["Wi-Fi", "AC", "Parking", "Security"], totalRooms: 10, availableRooms: 4, deposit: 9500, address: "Near Industry House, Palasia", ownerName: "Mr. A. Sethi",
      description: "Urban Nest offers private furnished rooms with attached bathrooms in Palasia, well connected to offices, cafes and public transport.",
      image: IMG(ROOM_PHOTOS[2]), images: gallery(ROOM_PHOTOS[2], ROOM_PHOTOS[3], ROOM_PHOTOS[0], ROOM_PHOTOS[5]),
      roomOptions: [ { id: "private", name: "Private room", price: 9500, unit: "room", description: "Furnished private room with attached bathroom." } ] },
    { id: "study-square", name: "Study Square", type: "PG", locality: "Near DAVV", price: 8500, unit: "person", sharing: "Twin", meals: true, mealsNote: "Included", furnishing: "Furnished", rating: 4.5, amenities: ["Wi-Fi", "Study Room", "Mess", "Laundry"], totalRooms: 16, availableRooms: 6, deposit: 8500, address: "Khandwa Road, near DAVV campus", ownerName: "Mr. P. Rathore",
      description: "Study Square is built around quiet study spaces, a few minutes from the DAVV campus. Meals and laundry are included in the monthly rent.",
      image: IMG(ROOM_PHOTOS[3]), images: gallery(ROOM_PHOTOS[3], ROOM_PHOTOS[1], ROOM_PHOTOS[0], ROOM_PHOTOS[4]),
      roomOptions: [ { id: "twin", name: "Twin sharing", price: 8500, unit: "person", description: "Twin sharing room with study desks and storage." } ] },
    { id: "green-valley", name: "Green Valley PG", type: "PG", locality: "Vijay Nagar", price: 5000, unit: "person", sharing: "Triple", meals: true, mealsNote: "Included", furnishing: "Furnished", rating: 4.2, amenities: ["Wi-Fi", "AC", "Mess", "Security"], totalRooms: 24, availableRooms: 6, deposit: 5000, address: "Scheme 54, near Vijay Nagar Square", ownerName: "Mr. K. Patidar",
      description: "An affordable triple-sharing PG with home-style meals, close to Vijay Nagar's coaching and IT corridor.",
      image: IMG(ROOM_PHOTOS[4]), images: gallery(ROOM_PHOTOS[4], ROOM_PHOTOS[0], ROOM_PHOTOS[1]) },
    { id: "sunrise-hostel", name: "Sunrise Hostel", type: "Hostel", locality: "Rajendra Nagar", price: 4500, unit: "person", sharing: "Triple", meals: true, mealsNote: "Included", furnishing: "Furnished", rating: 4.1, amenities: ["Wi-Fi", "Mess", "Laundry", "Security"], totalRooms: 30, availableRooms: 9, deposit: 4500, address: "Sector B, Rajendra Nagar", ownerName: "Mrs. D. Mehta",
      description: "Budget hostel with shared rooms, a common mess and laundry, ideal for students starting out in Indore.",
      image: IMG(ROOM_PHOTOS[5]), images: gallery(ROOM_PHOTOS[5], ROOM_PHOTOS[2], ROOM_PHOTOS[3]) },
    { id: "orchid-flats", name: "Orchid Flats", type: "Flat", locality: "Palasia", price: 12000, unit: "room", sharing: "Private", meals: false, mealsNote: "Not included", furnishing: "Furnished", rating: 4.6, amenities: ["AC", "Parking", "Security", "Power Backup", "Wi-Fi"], totalRooms: 8, availableRooms: 2, deposit: 24000, address: "Janjeerwala Square, Palasia", ownerName: "Mr. N. Kapoor",
      description: "Fully furnished 1BHK flats for working professionals, with parking and power backup near Palasia's business district.",
      image: IMG("photo-1600607687939-ce8a6c25118c"), images: gallery("photo-1600607687939-ce8a6c25118c", "photo-1600210492486-724fe5c67fb0", ROOM_PHOTOS[3]) },
    { id: "lakeview-flat", name: "Lakeview Flat", type: "Flat", locality: "Rau", price: 15000, unit: "room", sharing: "Private", meals: false, mealsNote: "Not included", furnishing: "Semi-Furnished", rating: 4.7, amenities: ["Parking", "Security", "Power Backup", "Lift"], totalRooms: 6, availableRooms: 1, deposit: 30000, address: "Pithampur Road, Rau", ownerName: "Mrs. S. Bhatia",
      description: "A spacious semi-furnished 2BHK flat with a lift, parking and quick access to Pithampur Road.",
      image: IMG("photo-1600210491892-03d54c0aaf87"), images: gallery("photo-1600210491892-03d54c0aaf87", "photo-1600607687644-c7171b42498f", ROOM_PHOTOS[2]) }
  ];

  function seedProperties() {
    const now = new Date().toISOString();
    return SEED_PROPERTIES.map(item => ({
      ...item,
      city: "Indore",
      rules: { ...DEFAULT_RULES },
      status: "active",
      createdAt: now,
      updatedAt: now
    }));
  }

  // Turns any stored object into a safe property, or null if unusable.
  function normalizeProperty(item) {
    if (!isPlainObject(item)) return null;
    const id = typeof item.id === "string" || typeof item.id === "number" ? String(item.id).trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!id || !name) return null;

    const price = Number(item.price);
    const total = Math.max(0, Math.floor(Number(item.totalRooms)) || 0);
    let available = Math.max(0, Math.floor(Number(item.availableRooms)) || 0);
    if (available > total) available = total;

    const rating = Number(item.rating);
    const unit = item.unit === "person" ? "person" : "room";
    const base = Number.isFinite(price) && price >= 0 ? price : 0;
    const image = typeof item.image === "string" ? item.image.trim() : "";

    const options = Array.isArray(item.roomOptions)
      ? item.roomOptions
        .filter(o => isPlainObject(o) && typeof o.name === "string" && Number(o.price) > 0)
        .map((o, i) => ({
          id: typeof o.id === "string" && o.id ? o.id : `option-${i + 1}`,
          name: o.name.trim(),
          price: Number(o.price),
          unit: o.unit === "person" ? "person" : "room",
          description: typeof o.description === "string" ? o.description : ""
        }))
      : [];

    const images = Array.isArray(item.images)
      ? item.images.filter(u => typeof u === "string" && /^https?:\/\//i.test(u))
      : [];
    if (image && !images.includes(image)) images.unshift(image);

    return {
      ...item,
      id,
      name,
      type: PROPERTY_TYPES.includes(item.type) ? item.type : "Room",
      city: typeof item.city === "string" && item.city.trim() ? item.city.trim() : "Indore",
      locality: typeof item.locality === "string" ? item.locality.trim() : "",
      address: typeof item.address === "string" ? item.address.trim() : "",
      description: typeof item.description === "string" ? item.description.trim() : "",
      price: base,
      deposit: Number.isFinite(Number(item.deposit)) && Number(item.deposit) >= 0 ? Number(item.deposit) : 0,
      unit,
      sharing: SHARING_OPTIONS.includes(item.sharing) ? item.sharing : "Private",
      meals: Boolean(item.meals),
      mealsNote: typeof item.mealsNote === "string" && item.mealsNote ? item.mealsNote : (item.meals ? "Included" : "Not included"),
      furnishing: FURNISHING_OPTIONS.includes(item.furnishing) ? item.furnishing : "Furnished",
      rating: Number.isFinite(rating) && rating > 0 ? Math.min(5, rating) : null,
      ownerName: typeof item.ownerName === "string" && item.ownerName ? item.ownerName : "Property owner",
      rules: { ...DEFAULT_RULES, ...(isPlainObject(item.rules) ? item.rules : {}) },
      totalRooms: total,
      availableRooms: available,
      amenities: Array.isArray(item.amenities)
        ? [...new Set(item.amenities.filter(a => typeof a === "string" && a.trim()).map(a => a.trim()))]
        : [],
      image: image || images[0] || "",
      images,
      roomOptions: options.length ? options : [{
        id: "standard",
        name: item.sharing && item.sharing !== "Private" ? `${item.sharing} sharing` : "Private room",
        price: base, unit,
        description: `${item.type || "Room"} accommodation at ${name}.`
      }],
      status: PROPERTY_STATUSES.includes(item.status) ? item.status : "draft"
    };
  }

  // Result: { properties, readable }. readable=false means stored data was
  // unusable; callers must not silently overwrite it.
  function loadProperties() {
    const result = readRaw(KEYS.properties);

    if (!result.exists) {
      const seeded = seedProperties();
      writeJSON(KEYS.properties, seeded);
      return { properties: seeded, readable: true };
    }

    if (!result.ok || !Array.isArray(result.value)) {
      backupCorrupt(KEYS.properties, result.raw);
      return { properties: [], readable: false };
    }

    const seen = new Set();
    const list = [];
    result.value.forEach(item => {
      const property = normalizeProperty(item);
      if (property && !seen.has(property.id)) {
        seen.add(property.id);
        list.push(property);
      }
    });
    return { properties: list, readable: true };
  }

  function saveProperties(list) {
    return writeJSON(KEYS.properties, list);
  }

  function getProperty(id) {
    return loadProperties().properties.find(p => p.id === String(id)) || null;
  }

  function propertyLocation(property) {
    if (!property) return "Location unavailable";
    return [property.locality, property.city].filter(Boolean).join(", ") || "Location unavailable";
  }

  // A property can take new booking requests only when it is active
  // and still has a room free.
  function isBookable(property) {
    return Boolean(property) && property.status === "active" && property.availableRooms > 0;
  }

  /* ---------- Booking requests ---------- */

  function sampleBookings() {
    const day = offset => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const ago = days => new Date(Date.now() - days * 86400000).toISOString();
    const make = (n, guest, propertyId, propertyName, price, unit, moveIn, duration, occupants, message, ownerStatus, daysAgo) => ({
      id: `demo-sample-${n}`,
      propertyId, propertyName,
      plan: unit === "person" ? "Monthly stay" : "Monthly room plan",
      price, unit,
      guest,
      moveInDate: day(moveIn),
      duration, occupants, message,
      status: "Demo request — not confirmed",
      ownerStatus,
      submittedAt: ago(daysAgo),
      isSample: true
    });
    return [
      make(1, { name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "+91 98270 41256" }, "green-valley", "Green Valley PG", 5000, "person", 12, "6 months", "1", "Joining IIPS for MBA. Need a double-sharing bed with meals.", "pending", 1),
      make(2, { name: "Priya Verma", email: "priya.verma@example.com", phone: "+91 98930 76412" }, "campus-corner", "Campus Corner", 8000, "person", 20, "12 months", "1", "Working at an IT firm in Super Corridor.", "pending", 2),
      make(3, { name: "Rohan Patidar", email: "rohan.patidar@example.com", phone: "+91 97550 18834" }, "sunrise-hostel", "Sunrise Hostel", 4500, "person", 8, "6 months", "1", "", "approved", 6),
      make(4, { name: "Neha Joshi", email: "neha.joshi@example.com", phone: "+91 94250 63091" }, "orchid-flats", "Orchid Flats", 12000, "room", 30, "12 months", "2", "Two working professionals looking for a furnished flat.", "approved", 9),
      make(5, { name: "Kunal Mehta", email: "kunal.mehta@example.com", phone: "+91 99810 22745" }, "urban-nest", "Urban Nest", 9500, "room", 15, "3 months", "1", "Short project posting in Indore.", "rejected", 11),
      make(6, { name: "Sneha Agrawal", email: "sneha.agrawal@example.com", phone: "+91 93000 57218" }, "study-square", "Study Square", 8500, "person", 5, "6 months", "1", "Preparing for competitive exams in Bhawarkua.", "pending", 0),
      make(7, { name: "Vikram Chouhan", email: "vikram.chouhan@example.com", phone: "+91 98260 90573" }, "lakeview-flat", "Lakeview Flat", 15000, "room", 25, "12 months", "3", "Family relocating to Rau.", "cancelled", 14),
      make(8, { name: "Ananya Tiwari", email: "ananya.tiwari@example.com", phone: "+91 96300 11482" }, "nest-house", "Nest House", 8500, "person", 18, "Flexible", "1", "", "pending", 3)
    ];
  }

  function normalizeBooking(item) {
    if (!isPlainObject(item)) return null;
    const id = typeof item.id === "string" || typeof item.id === "number" ? String(item.id) : "";
    if (!id) return null;

    const guest = isPlainObject(item.guest) ? item.guest : {};
    const price = Number(item.price);

    return {
      ...item,
      id,
      propertyId: typeof item.propertyId === "string" ? item.propertyId : "",
      propertyName: typeof item.propertyName === "string" && item.propertyName.trim()
        ? item.propertyName.trim() : "Selected property",
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      unit: item.unit === "room" ? "room" : "person",
      guest: {
        name: typeof guest.name === "string" && guest.name.trim() ? guest.name.trim() : "Guest",
        email: typeof guest.email === "string" ? guest.email.trim() : "",
        phone: typeof guest.phone === "string" ? guest.phone.trim() : ""
      },
      moveInDate: typeof item.moveInDate === "string" ? item.moveInDate : "",
      duration: typeof item.duration === "string" && item.duration ? item.duration : "Not specified",
      occupants: item.occupants === undefined || item.occupants === null ? "1" : String(item.occupants),
      message: typeof item.message === "string" ? item.message : "",
      submittedAt: typeof item.submittedAt === "string" ? item.submittedAt : "",
      // Requests made from booking.html have no ownerStatus yet: they are pending.
      ownerStatus: BOOKING_STATUSES.includes(item.ownerStatus) ? item.ownerStatus : "pending"
    };
  }

  function loadBookings() {
    const result = readRaw(KEYS.bookings);

    if (!result.exists) {
      const samples = sampleBookings();
      writeJSON(KEYS.bookings, samples);
      return { bookings: samples.map(normalizeBooking), readable: true };
    }

    if (!result.ok || !Array.isArray(result.value)) {
      backupCorrupt(KEYS.bookings, result.raw);
      return { bookings: [], readable: false };
    }

    return {
      bookings: result.value.map(normalizeBooking).filter(Boolean),
      readable: true
    };
  }

  // Updates only owner fields on ONE record and keeps every other stored
  // field exactly as it was (including records this page cannot display).
  function setBookingStatus(id, nextStatus, allowedFrom, extra = {}) {
    if (!BOOKING_STATUSES.includes(nextStatus)) return { ok: false, reason: "invalid" };

    const result = readRaw(KEYS.bookings);
    if (!result.ok || !Array.isArray(result.value)) return { ok: false, reason: "unreadable" };

    const index = result.value.findIndex(item => isPlainObject(item) && String(item.id) === String(id));
    if (index === -1) return { ok: false, reason: "missing" };

    const current = normalizeBooking(result.value[index]);
    if (!allowedFrom.includes(current.ownerStatus)) {
      return { ok: false, reason: "stale", current: current.ownerStatus };
    }

    result.value[index] = {
      ...result.value[index],
      ...extra,
      ownerStatus: nextStatus,
      ownerUpdatedAt: new Date().toISOString()
    };
    return writeJSON(KEYS.bookings, result.value) ? { ok: true } : { ok: false, reason: "storage" };
  }


  // Appends a tenant's request without touching existing records.
  // Seeds the demo requests first so owners see a realistic inbox.
  function addBookingRequest(request) {
    loadBookings();
    const result = readRaw(KEYS.bookings);
    if (!result.ok || !Array.isArray(result.value)) return false;
    return writeJSON(KEYS.bookings, [...result.value, request]);
  }

  function loadSampleBookings() {
    const result = readRaw(KEYS.bookings);
    const existing = result.ok && Array.isArray(result.value) ? result.value : [];
    if (!result.ok && result.exists) return false;
    const ids = new Set(existing.map(item => isPlainObject(item) ? String(item.id) : ""));
    const fresh = sampleBookings().filter(item => !ids.has(item.id));
    return writeJSON(KEYS.bookings, [...existing, ...fresh]);
  }

  function countBookingsForProperty(propertyId) {
    const counts = { total: 0, pending: 0, approved: 0 };
    loadBookings().bookings.forEach(booking => {
      if (booking.propertyId !== propertyId) return;
      counts.total += 1;
      if (booking.ownerStatus === "pending") counts.pending += 1;
      if (booking.ownerStatus === "approved") counts.approved += 1;
    });
    return counts;
  }

  // Monthly rent for an accepted booking. Per-person plans count once per
  // occupant listed; "4+" counts as 4.
  function monthlyRentFor(booking) {
    if (booking.unit !== "person") return booking.price;
    const people = parseInt(booking.occupants, 10);
    return booking.price * (Number.isFinite(people) && people > 0 ? people : 1);
  }

  /* ---------- Owner profile ---------- */

  function ownerProfile() {
    const result = readRaw(KEYS.profile);
    const profile = result.ok && isPlainObject(result.value) ? result.value : {};
    const name = typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : "Property Owner";
    return { name, initials: initials(name) };
  }

  /* ---------- Icons ---------- */

  const ICONS = {
    logo: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    power: '<path d="M12 3v8"/><path d="M6.8 6.8a7.5 7.5 0 1 0 10.4 0"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1.5 1.5 0 0 1-1.6 1.5C10.5 20 4 13.5 3.5 5.6A1.5 1.5 0 0 1 5 4Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    building: '<path d="M4 20V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M14 10h5a1 1 0 0 1 1 1v9M3 20h18"/><path d="M8 8h2M8 12h2M8 16h2"/>',
    door: '<path d="M6 20V4h12v16M4 20h16"/><circle cx="14.5" cy="12" r=".8" fill="currentColor"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 6.5"/><circle cx="16" cy="14" r="1" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    x: '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
    heart: '<path d="M12 20s-7.5-4.6-9-9.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 9 3.8C19.5 15.4 12 20 12 20Z"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5Z"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 16a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.2" r=".9" fill="currentColor"/>',
    meals: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17"/>',
    bed: '<path d="M3 18V7M3 14h18v4M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5"/><circle cx="7" cy="11" r="1.8"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.2a3 3 0 0 1 0 5.6M18 14.8c1.8.7 3 2.3 3 5.2"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
    desk: '<path d="M3 9h18M5 9v11M19 9v11M9 9v5h6V9"/><path d="m3 9 1.5-4h15L21 9"/>',
    laundry: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13.5" r="4"/><path d="M8 6.5h.01M11 6.5h.01"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    rupee: '<path d="M7 5h10M7 9h10M7 5c5 0 7 1.8 7 4s-2 4-7 4l7 7"/>',
    file: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    zap: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    parking: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M10 16.5v-9h3a2.5 2.5 0 0 1 0 5h-3"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
    camera: '<path d="M4 8h10v8H4zM14 11l6-3v8l-6-3"/>',
    hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'
  };

  function icon(name, size = 18) {
    const body = ICONS[name] || "";
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  // Fills <span data-icon="bell"></span> style placeholders.
  function hydrateIcons(root = document) {
    $$("[data-icon]", root).forEach(node => {
      node.innerHTML = icon(node.dataset.icon, Number(node.dataset.size) || 18);
    });
  }

  /* ---------- Toast ---------- */

  let toastTimer;

  function showToast(message, type = "success") {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, type === "error" ? 5000 : 3200);
  }

  /* ---------- Shared header ---------- */

  function renderHeader() {
    const profile = ownerProfile();
    const pending = loadBookings().bookings.filter(b => b.ownerStatus === "pending").length;

    const avatar = $("#ownerAvatar");
    const name = $("#ownerName");
    const badge = $("#notifyCount");
    const bell = $("#notifyLink");

    const sideBadge = $("#sidePending");
    if (sideBadge) {
      sideBadge.textContent = pending;
      sideBadge.hidden = pending === 0;
    }
    if (avatar) avatar.textContent = profile.initials;
    if (name) name.textContent = profile.name;
    if (badge) {
      badge.textContent = pending > 9 ? "9+" : String(pending);
      badge.hidden = pending === 0;
    }
    if (bell) {
      bell.setAttribute("aria-label", pending
        ? `${pending} pending booking ${pending === 1 ? "request" : "requests"}`
        : "No pending booking requests");
    }
  }

  /* ---------- Confirmation dialog (shared) ---------- */

  // Resolves true when the owner confirms, false otherwise.
  function confirmAction({ title, message, confirmLabel, danger = false }) {
    const dialog = $("#confirmDialog");
    if (!dialog) return Promise.resolve(window.confirm(message));

    $("#confirmTitle").textContent = title;
    $("#confirmMessage").textContent = message;

    const okButton = $("#confirmOk");
    okButton.textContent = confirmLabel;
    okButton.classList.toggle("btn-danger", danger);
    okButton.classList.toggle("btn-primary", !danger);

    return new Promise(resolve => {
      const cleanup = value => {
        okButton.removeEventListener("click", onOk);
        $("#confirmCancel").removeEventListener("click", onCancel);
        dialog.removeEventListener("cancel", onCancel);
        dialog.removeEventListener("click", onBackdrop);
        if (dialog.open) dialog.close();
        resolve(value);
      };
      const onOk = () => cleanup(true);
      const onCancel = event => { if (event) event.preventDefault(); cleanup(false); };
      const onBackdrop = event => { if (event.target === dialog) cleanup(false); };

      okButton.addEventListener("click", onOk);
      $("#confirmCancel").addEventListener("click", onCancel);
      dialog.addEventListener("cancel", onCancel);
      dialog.addEventListener("click", onBackdrop);
      dialog.showModal();
      $("#confirmCancel").focus();
    });
  }

  // Close a <dialog> when the dark backdrop (outside the panel) is clicked.
  // Only closes when the press AND release both happen on the backdrop, so
  // dragging a text selection out of a field never closes the dialog.
  function closeOnBackdrop(dialog) {
    let pressedOnBackdrop = false;
    dialog.addEventListener("mousedown", event => {
      pressedOnBackdrop = event.target === dialog;
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog && pressedOnBackdrop) dialog.close();
      pressedOnBackdrop = false;
    });
  }


  /* ---------- Tenant-side helpers (saved stays, visits, session) ---------- */

  const TENANT_KEYS = {
    saved: "staynest_saved",
    visits: "staynest_demo_visits",
    session: "staynest_demo_session",
    selection: "staynest_pending_booking"
  };

  function readList(key) {
    const result = readRaw(key);
    return result.ok && Array.isArray(result.value) ? result.value : [];
  }

  function readSaved() {
    return [...new Set(readList(TENANT_KEYS.saved).filter(id => typeof id === "string"))];
  }

  function writeSaved(ids) {
    return writeJSON(TENANT_KEYS.saved, ids);
  }

  function toggleSaved(id) {
    const saved = readSaved();
    const exists = saved.includes(id);
    const next = exists ? saved.filter(x => x !== id) : [...saved, id];
    return writeSaved(next) ? { ok: true, saved: !exists } : { ok: false };
  }

  function loadVisits() {
    return readList(TENANT_KEYS.visits).filter(v => isPlainObject(v) && v.id && v.propertyId);
  }

  function addVisit(visit) {
    const list = loadVisits();
    list.unshift(visit);
    return writeJSON(TENANT_KEYS.visits, list);
  }

  function removeVisit(id) {
    return writeJSON(TENANT_KEYS.visits, loadVisits().filter(v => String(v.id) !== String(id)));
  }

  // Demo session: only a display name, email and role. Never a password.
  function getSession() {
    const result = readRaw(TENANT_KEYS.session);
    if (!result.ok || !isPlainObject(result.value)) return null;
    const name = typeof result.value.name === "string" ? result.value.name.trim() : "";
    if (!name) return null;
    return {
      name,
      email: typeof result.value.email === "string" ? result.value.email : "",
      role: result.value.role === "owner" ? "owner" : "tenant"
    };
  }

  function setSession(session) {
    if (!session) {
      try { localStorage.removeItem(TENANT_KEYS.session); } catch (error) { /* ignore */ }
      return true;
    }
    return writeJSON(TENANT_KEYS.session, session);
  }

  function listBookableProperties() {
    return loadProperties().properties.filter(isBookable);
  }

  /* ---------- Amenity icons and image fallback ---------- */

  const AMENITY_ICONS = {
    "wi-fi": "wifi", "wifi": "wifi", "mess": "meals", "meals": "meals",
    "study room": "desk", "study desk": "desk", "laundry": "laundry",
    "security": "shield", "cctv": "camera", "ac": "snow", "parking": "parking",
    "power backup": "zap", "geyser": "zap", "housekeeping": "sparkle", "lift": "door"
  };

  function amenityIcon(name, size = 18) {
    return icon(AMENITY_ICONS[String(name).toLowerCase()] || "check", size);
  }

  function imageTag(url, alt, className = "") {
    if (!/^https?:\/\//i.test(String(url || ""))) {
      return `<div class="media-fallback ${className}" role="img" aria-label="${escapeHTML(alt)}">${icon("image", 36)}</div>`;
    }
    return `<img class="${className}" src="${escapeHTML(url)}" alt="${escapeHTML(alt)}" loading="lazy" referrerpolicy="no-referrer" data-fallback>`;
  }

  // One listener for every page: a broken photo becomes a tidy placeholder.
  document.addEventListener("error", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-fallback")) return;
    const holder = document.createElement("div");
    holder.className = `media-fallback ${img.className}`.trim();
    holder.setAttribute("role", "img");
    holder.setAttribute("aria-label", img.alt || "Photo unavailable");
    holder.innerHTML = icon("image", 36);
    img.replaceWith(holder);
  }, true);

  /* ---------- Tenant site shell (header + footer) ---------- */

  function mountSiteShell(active) {
    const header = $("#siteHeader");
    const footer = $("#siteFooter");
    const session = getSession();

    const link = (key, href, label) =>
      `<a href="${href}"${active === key ? ' class="is-active" aria-current="page"' : ""}>${label}</a>`;

    if (header) {
      header.className = "sn-header";
      header.innerHTML = `
        <div class="sn-header-inner">
          <a class="sn-brand" href="index.html" aria-label="StayNest home">
            <span class="sn-brand-mark">${icon("logo", 22)}</span><span>Stay<b>Nest</b></span>
          </a>
          <nav class="sn-nav" id="snNav" aria-label="Main">
            ${link("find", "listings.html", "Find a stay")}
            ${link("how", "index.html#how", "How it works")}
            ${link("owners", "owner-dashboard.html", "For owners")}
            ${link("requests", "my-bookings.html", "My requests")}
          </nav>
          <div class="sn-actions">
            <a class="sn-saved" href="listings.html?view=saved" aria-label="Saved stays">
              ${icon("heart", 18)}<span class="sn-saved-count" id="snSavedCount">0</span>
            </a>
            ${session
              ? `<a class="sn-user" href="${session.role === "owner" ? "owner-dashboard.html" : "dashboard.html"}" aria-label="Your account">
                   <span class="sn-avatar">${escapeHTML(initials(session.name))}</span>
                   <span class="sn-user-name">${escapeHTML(session.name.split(/\s+/)[0])}</span>
                 </a>`
              : '<a class="sn-login" href="login.html">Log in</a>'}
            <button class="sn-menu" type="button" id="snMenu" aria-expanded="false" aria-controls="snNav" aria-label="Open menu">${icon("menu", 22)}</button>
          </div>
        </div>`;

      const toggle = $("#snMenu");
      const nav = $("#snNav");
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
      nav.addEventListener("click", event => {
        if (event.target.closest("a")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
      updateSavedCount();
    }

    if (footer) {
      footer.className = "sn-footer";
      footer.innerHTML = `
        <div class="sn-footer-inner">
          <a class="sn-brand" href="index.html"><span class="sn-brand-mark">${icon("logo", 20)}</span><span>Stay<b>Nest</b></span></a>
          <nav aria-label="Footer">
            <a href="listings.html">Find a stay</a>
            <a href="index.html#how">How it works</a>
            <a href="owner-dashboard.html">For owners</a>
            <a href="index.html#faq">FAQ</a>
          </nav>
          <p>Illustrative demo data &nbsp;|&nbsp; &copy; ${new Date().getFullYear()} StayNest. All rights reserved.</p>
        </div>`;
    }

    if (!$("#toast")) {
      const toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.hidden = true;
      document.body.appendChild(toast);
    }
  }

  function updateSavedCount() {
    const badge = $("#snSavedCount");
    if (!badge) return;
    const count = readSaved().length;
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  window.addEventListener("storage", event => {
    if (event.key === TENANT_KEYS.saved) updateSavedCount();
  });

  window.StayNestOwner = {
    KEYS, PROPERTY_TYPES, PROPERTY_STATUSES, BOOKING_STATUSES, AMENITY_OPTIONS,
    $, $$, escapeHTML, money, formatDate, initials,
    loadProperties, saveProperties, getProperty, propertyLocation, isBookable,
    loadBookings, addBookingRequest, setBookingStatus, loadSampleBookings, countBookingsForProperty, monthlyRentFor,
    ownerProfile, icon, hydrateIcons, showToast, renderHeader, confirmAction, closeOnBackdrop,
    TENANT_KEYS, SHARING_OPTIONS, FURNISHING_OPTIONS, readSaved, writeSaved, toggleSaved, updateSavedCount,
    loadVisits, addVisit, removeVisit, getSession, setSession, listBookableProperties,
    amenityIcon, imageTag, mountSiteShell, readRaw, writeJSON
  };
  window.StayNest = window.StayNestOwner;
})();
