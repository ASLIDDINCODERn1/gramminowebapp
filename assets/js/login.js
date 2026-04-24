(function () {
  "use strict";

  // Tabs
  const tabs = document.querySelectorAll(".tab");
  const tabsWrap = document.querySelector(".tabs");
  const forms = document.querySelectorAll(".auth-form");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      tabsWrap.setAttribute("data-active", target);
      forms.forEach((f) => {
        f.classList.toggle("hidden", f.dataset.form !== target);
        const err = f.querySelector(".auth-error");
        if (err) { err.textContent = ""; err.classList.remove("show"); }
      });
    });
  });

  // Password toggle
  document.querySelectorAll(".toggle-pass").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  // Liquid button hover glow follow cursor
  document.querySelectorAll(".btn-liquid").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
      btn.style.setProperty("--my", ((e.clientY - rect.top) / rect.height) * 100 + "%");
    });
  });

  // Subtle parallax on the glass card
  const card = document.querySelector(".glass-card");
  if (card && window.matchMedia("(pointer: fine)").matches) {
    const wrap = document.querySelector(".auth-wrap");
    wrap.addEventListener("pointermove", (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
    });
    wrap.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  }

  // --- Firebase Auth wiring ------------------------------------------------
  // firebase-init.js is a module, so it finishes after this classic script.
  // We wait for it to signal readiness before submitting.
  function whenAuthReady() {
    if (window.__GRAMMINO_AUTH_READY__) return Promise.resolve();
    return new Promise((resolve) => {
      window.addEventListener("grammino-auth-ready", () => resolve(), { once: true });
    });
  }

  function showError(form, msg) {
    const el = form.querySelector(".auth-error");
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.classList.add("show");
  }

  function clearError(form) {
    const el = form.querySelector(".auth-error");
    if (el) { el.textContent = ""; el.classList.remove("show"); }
  }

  async function handleSubmit(form, kind) {
    clearError(form);
    const btn = form.querySelector(".btn-liquid");
    const originalHTML = btn ? btn.innerHTML : "";

    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const name = String(fd.get("name") || "").trim();

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Please wait…</span>';
    }

    try {
      await whenAuthReady();
      const Auth = window.GramminoAuth;
      if (!Auth) throw new Error("Firebase Auth yuklanmadi. Internetni tekshiring.");

      if (kind === "signup") {
        await Auth.signUp(name, email, password);
      } else {
        await Auth.signIn(email, password);
      }

      if (btn) {
        btn.innerHTML = '<span>Success ✓</span>';
        btn.style.background = "linear-gradient(120deg, #3ee6a6, #1e9e6d)";
      }
      setTimeout(() => { window.location.href = "home.html"; }, 500);
    } catch (err) {
      const msg = (window.GramminoAuth && window.GramminoAuth.friendlyError)
        ? window.GramminoAuth.friendlyError(err)
        : (err && err.message) || "Xatolik yuz berdi.";
      showError(form, msg);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.style.background = "";
      }
    }
  }

  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSubmit(form, form.dataset.form);
    });
  });
})();
