
"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const bookingList = document.getElementById("bookingList");
    const bookingFilter = document.getElementById("bookingFilter");
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    const STORAGE_KEY = "staynestBookings";

    const demoBookings = [
        {
            id: 101,
            name: "Luxury Apartment",
            location: "Indore, Madhya Pradesh",
            checkIn: "2026-11-10",
            checkOut: "2026-11-13",
            guests: 2,
            price: 4500,
            status: "upcoming",
            image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 102,
            name: "Cozy Weekend Villa",
            location: "Ujjain, Madhya Pradesh",
            checkIn: "2026-08-12",
            checkOut: "2026-08-14",
            guests: 4,
            price: 6000,
            status: "completed",
            image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=700&q=80"
        }
    ];

    function isValidBooking(booking) {
        return booking &&
            (typeof booking.id === "string" ||
             typeof booking.id === "number") &&
            typeof booking.name === "string" &&
            typeof booking.location === "string" &&
            typeof booking.checkIn === "string" &&
            typeof booking.checkOut === "string" &&
            Number.isFinite(Number(booking.guests)) &&
            Number.isFinite(Number(booking.price)) &&
            ["upcoming", "completed", "cancelled"].includes(booking.status);
    }

    function getBookings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved === null) {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(demoBookings)
                );
                return [...demoBookings];
            }

            const parsed = JSON.parse(saved);

            if (!Array.isArray(parsed)) {
                throw new Error("Saved booking data is not a list.");
            }

            return parsed.filter(isValidBooking);
        } catch (error) {
            console.error("Could not load StayNest bookings:", error);
            return [...demoBookings];
        }
    }

    function saveBookings(bookings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
            return true;
        } catch (error) {
            console.error("Could not save StayNest bookings:", error);
            alert("Your browser could not save the change. Please check browser storage settings.");
            return false;
        }
    }

    function formatDate(value) {
        const date = new Date(value + "T00:00:00");

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function getStatus(booking) {
        if (booking.status === "cancelled") {
            return "cancelled";
        }

        if (booking.status === "completed") {
            return "completed";
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkout = new Date(booking.checkOut + "T00:00:00");

        if (!Number.isNaN(checkout.getTime()) && checkout <= today) {
            return "completed";
        }

        return "upcoming";
    }

    function updateStats(bookings) {
        const activeBookings = bookings.filter(
            booking => getStatus(booking) !== "cancelled"
        );

        document.getElementById("totalBookings").textContent =
            activeBookings.length;

        document.getElementById("upcomingBookings").textContent =
            activeBookings.filter(
                booking => getStatus(booking) === "upcoming"
            ).length;

        document.getElementById("completedBookings").textContent =
            activeBookings.filter(
                booking => getStatus(booking) === "completed"
            ).length;
    }

    function createTextElement(tag, className, text) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }

    function renderEmptyState() {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        empty.appendChild(
            createTextElement("div", "empty-icon", "⌂")
        );

        empty.appendChild(
            createTextElement("h3", "", "No bookings found")
        );

        empty.appendChild(
            createTextElement(
                "p",
                "",
                "Your reservations will appear here when you book a stay."
            )
        );

        const link = document.createElement("a");
        link.href = "listings.html";
        link.className = "primary-btn";
        link.textContent = "Explore Stays";

        empty.appendChild(link);
        bookingList.replaceChildren(empty);
    }

    function createBookingCard(booking) {
        const status = getStatus(booking);

        const card = document.createElement("article");
        card.className = "booking-card";

        const image = document.createElement("img");
        image.className = "booking-image";
        image.src = booking.image || "";
        image.alt = booking.name;
        image.loading = "lazy";

        image.addEventListener("error", function () {
            image.style.display = "none";
        });

        card.appendChild(image);

        const details = document.createElement("div");
        details.className = "booking-details";

        const statusLabels = {
            upcoming: "Confirmed",
            completed: "Completed",
            cancelled: "Cancelled"
        };

        const statusBadge = createTextElement(
            "span",
            "status " + status,
            statusLabels[status]
        );

        details.appendChild(statusBadge);
        details.appendChild(createTextElement("h3", "", booking.name));

        details.appendChild(
            createTextElement("p", "", "Location: " + booking.location)
        );

        details.appendChild(
            createTextElement(
                "p",
                "",
                "Check-in: " + formatDate(booking.checkIn)
            )
        );

        details.appendChild(
            createTextElement(
                "p",
                "",
                "Check-out: " + formatDate(booking.checkOut)
            )
        );

        details.appendChild(
            createTextElement("p", "", "Guests: " + booking.guests)
        );

        const price = document.createElement("div");
        price.className = "booking-price";
        price.textContent =
            "₹" + Number(booking.price).toLocaleString("en-IN") + " ";

        price.appendChild(
            createTextElement("span", "price-period", "total")
        );

        details.appendChild(price);

        if (status === "upcoming") {
            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "cancel-btn";
            cancelButton.textContent = "Cancel Booking";
            cancelButton.dataset.bookingId = String(booking.id);

            details.appendChild(cancelButton);
        }

        card.appendChild(details);

        return card;
    }

    function renderBookings() {
        const bookings = getBookings();
        updateStats(bookings);

        const filter = bookingFilter.value;

        const filteredBookings = bookings.filter(function (booking) {
            const status = getStatus(booking);

            if (filter === "all") {
                return status !== "cancelled";
            }

            return status === filter;
        });

        if (filteredBookings.length === 0) {
            renderEmptyState();
            return;
        }

        const fragment = document.createDocumentFragment();

        filteredBookings.forEach(function (booking) {
            fragment.appendChild(createBookingCard(booking));
        });

        bookingList.replaceChildren(fragment);
    }

    function cancelBooking(id) {
        const bookings = getBookings();
        const booking = bookings.find(
            item => String(item.id) === String(id)
        );

        if (!booking || getStatus(booking) !== "upcoming") {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to cancel " + booking.name + "?"
        );

        if (!confirmed) {
            return;
        }

        const updatedBookings = bookings.map(function (item) {
            if (String(item.id) === String(id)) {
                return { ...item, status: "cancelled" };
            }

            return item;
        });

        if (saveBookings(updatedBookings)) {
            renderBookings();
        }
    }

    bookingList.addEventListener("click", function (event) {
        const button = event.target.closest("[data-booking-id]");

        if (button) {
            cancelBooking(button.dataset.bookingId);
        }
    });

    bookingFilter.addEventListener("change", renderBookings);

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", function () {
            const isOpen = navLinks.classList.toggle("open");

            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute(
                "aria-label",
                isOpen ? "Close navigation" : "Open navigation"
            );
        });
    }

    renderBookings();
});
