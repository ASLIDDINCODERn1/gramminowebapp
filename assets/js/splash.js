(function () {
  "use strict";
  const reveal = document.getElementById("reveal");
  const SPLASH_MS = 3900;

  // Pick destination based on whether Firebase already has a cached user
  // (browserLocalPersistence stores under firebase:authUser:<apiKey>:[DEFAULT]).
  // This lets a returning user skip login entirely — no flash of the login page.
  function destination() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf("firebase:authUser:") !== 0) continue;
        const raw = localStorage.getItem(k);
        if (raw && raw.length > 2) return "home.html";
      }
    } catch (_) { /* private mode, etc. — fall through */ }
    return "login.html";
  }

  const target = destination();

  // Preload target to avoid a flash
  const pre = document.createElement("link");
  pre.rel = "prefetch";
  pre.href = target;
  document.head.appendChild(pre);

  setTimeout(() => {
    reveal.classList.add("active");
    setTimeout(() => { window.location.href = target; }, 850);
  }, SPLASH_MS);

  // Click/tap to skip
  document.addEventListener("click", () => {
    reveal.classList.add("active");
    setTimeout(() => { window.location.href = target; }, 600);
  }, { once: true });
})();
