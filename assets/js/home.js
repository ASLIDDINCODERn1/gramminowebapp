(function () {
  "use strict";

  const layout = document.getElementById("layout");
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenuBtn = document.getElementById("mt-menu");
  const desktopMenuBtn = document.getElementById("desktop-menu-btn");
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const greetEl = document.getElementById("welcome-greet");

  const mobileMQ = window.matchMedia("(max-width: 900px)");

  function isMobile() { return mobileMQ.matches; }

  // Start collapsed on small screens (desktop collapse only)
  if (!isMobile()) {
    // desktop default: expanded
  }

  function openDrawer() {
    layout.classList.add("drawer-open");
    mobileMenuBtn && mobileMenuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    layout.classList.remove("drawer-open");
    mobileMenuBtn && mobileMenuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  // Sidebar internal hamburger: on desktop it collapses; on mobile it closes drawer
  menuBtn.addEventListener("click", () => {
    if (isMobile()) {
      closeDrawer();
    } else {
      layout.classList.toggle("collapsed");
      menuBtn.setAttribute(
        "aria-expanded",
        layout.classList.contains("collapsed") ? "false" : "true"
      );
    }
  });

  // Mobile top-bar hamburger opens the drawer
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      if (layout.classList.contains("drawer-open")) closeDrawer();
      else openDrawer();
    });
  }

  // Desktop floating reopen button (visible only when sidebar is collapsed on desktop)
  if (desktopMenuBtn) {
    desktopMenuBtn.addEventListener("click", () => {
      layout.classList.remove("collapsed");
      menuBtn && menuBtn.setAttribute("aria-expanded", "true");
    });
  }

  // Backdrop click closes drawer
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", closeDrawer);
  }

  // Escape key closes drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && layout.classList.contains("drawer-open")) {
      closeDrawer();
    }
  });

  // Reset drawer state when crossing the breakpoint
  mobileMQ.addEventListener("change", () => {
    closeDrawer();
  });

  // Tool navigation: swap active page in main
  const toolLinks = document.querySelectorAll(".tool-link");
  const pages = document.querySelectorAll(".page");

  function showPage(name) {
    pages.forEach((p) => p.classList.toggle("active", p.dataset.page === name));
    toolLinks.forEach((l) =>
      l.classList.toggle("active", l.dataset.tool === name)
    );
  }

  toolLinks.forEach((link) => {
    link.addEventListener("click", () => {
      showPage(link.dataset.tool);
      if (isMobile()) closeDrawer();
    });
  });

  // Clicking the logo area (brand) returns to welcome
  const brand = document.querySelector(".brand-mini");
  if (brand) {
    brand.style.cursor = "pointer";
    brand.addEventListener("click", () => {
      showPage("home");
    });
  }

  // ---------- Time-based greeting (localized via Settings) ----------
  function greetKey() {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return "welcome_greet_morning";
    if (h >= 12 && h < 17) return "welcome_greet_afternoon";
    if (h >= 17 && h < 22) return "welcome_greet_evening";
    return "welcome_greet_night";
  }

  function updateGreet() {
    if (!greetEl) return;
    const key = greetKey();
    const text = (window.Settings && window.Settings.t)
      ? window.Settings.t(key)
      : "Good day";
    greetEl.textContent = text;
  }

  updateGreet();
  // Re-localize when language/settings change
  if (window.Settings && window.Settings.onChange) {
    window.Settings.onChange(updateGreet);
  }
  // Refresh every 10 minutes so the phrase rolls over naturally
  setInterval(updateGreet, 10 * 60 * 1000);

  // ---------- Sign out ----------
  const signoutBtn = document.getElementById("signout-btn");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      signoutBtn.disabled = true;
      try {
        if (window.GramminoAuth && window.GramminoAuth.signOut) {
          await window.GramminoAuth.signOut();
        }
      } catch (_) { /* redirect anyway */ }
      window.location.replace("login.html");
    });
  }
})();
