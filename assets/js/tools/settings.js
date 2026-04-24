(function () {
  "use strict";
  if (!window.Settings) return;

  const $ = (id) => document.getElementById(id);
  const page = document.querySelector('.page[data-page="settings"]');
  if (!page) return;

  const toast = document.createElement("div");
  toast.className = "set-toast";
  document.body.appendChild(toast);

  function flash(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(flash._t);
    flash._t = setTimeout(() => toast.classList.remove("show"), 1400);
  }

  function sync() {
    const s = Settings.get();
    page.querySelectorAll("[data-seg]").forEach((group) => {
      const key = group.dataset.seg;
      group.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("active", b.dataset.val === String(s[key]));
      });
    });
    page.querySelectorAll(".swatch").forEach((el) => {
      el.classList.toggle("active", el.dataset.val === s.accent);
    });
    const lang = $("set-uilang");    if (lang) lang.value  = s.uiLang;
    const model = $("set-model");    if (model) model.value = s.aiModel;
    const temp = $("set-temp");      if (temp)  { temp.value = s.aiTemp; $("set-temp-val").textContent = Number(s.aiTemp).toFixed(2); }
  }

  // Segmented toggles
  page.querySelectorAll("[data-seg]").forEach((group) => {
    const key = group.dataset.seg;
    group.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      Settings.set({ [key]: b.dataset.val });
      sync();
      flash(Settings.t("saved"));
    });
  });

  // Accent swatches
  page.querySelectorAll(".swatch").forEach((el) => {
    el.addEventListener("click", () => {
      Settings.set({ accent: el.dataset.val });
      sync();
      flash(Settings.t("saved"));
    });
  });

  // UI language (select)
  const langSel = $("set-uilang");
  if (langSel) {
    langSel.addEventListener("change", () => {
      Settings.set({ uiLang: langSel.value });
      sync();
      flash(Settings.t("saved"));
    });
  }

  // AI model
  const modelSel = $("set-model");
  if (modelSel) {
    // populate
    Settings.AI_MODELS.forEach((m) => {
      const o = document.createElement("option");
      o.value = m.id; o.textContent = m.label;
      modelSel.appendChild(o);
    });
    modelSel.addEventListener("change", () => {
      Settings.set({ aiModel: modelSel.value });
      flash(Settings.t("saved"));
    });
  }

  // Temperature
  const tempEl = $("set-temp");
  const tempVal = $("set-temp-val");
  if (tempEl) {
    tempEl.addEventListener("input", () => {
      tempVal.textContent = Number(tempEl.value).toFixed(2);
      Settings.set({ aiTemp: Number(tempEl.value) });
    });
  }

  // Reset
  const resetBtn = $("set-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      Settings.reset();
      sync();
      flash(Settings.t("saved"));
    });
  }

  // Clear chat history
  const clearBtn = $("set-clear-chat");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      try { localStorage.removeItem("grammino.chat.grammar"); } catch {}
      flash(Settings.t("saved"));
    });
  }

  // Re-sync when settings change from elsewhere
  Settings.onChange(sync);
  sync();
})();
