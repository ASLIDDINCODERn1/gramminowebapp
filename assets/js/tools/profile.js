"use strict";

(function () {

const $ = id => document.getElementById(id);

const KEYS = {
  gmHistory: "gm_history",
  wrHistory: "wr_history",
  spHistory: "sp_history",
  gmCount:   "gm_check_count",
  wrCount:   "wr_eval_count",
  spCount:   "sp_session_count",
};

/* ── Helpers ──────────────────────────────────────────── */

function getList(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}

function getCount(key) {
  return parseInt(localStorage.getItem(key) || "0", 10) || 0;
}

function escHtml(v) {
  return String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · "
    + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function animateStat(el, target) {
  if (!el) return;
  if (target === 0) { el.textContent = "0"; return; }
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 28));
  const t = setInterval(() => {
    cur = Math.min(target, cur + step);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 30);
}

/* ── Auth ready ───────────────────────────────────────── */

function onAuthReady(cb) {
  if (window.__GRAMMINO_AUTH_READY__) {
    cb(window.GramminoAuth?.user || null);
  } else {
    window.addEventListener("grammino-auth-ready", () => {
      cb(window.GramminoAuth?.user || null);
    });
  }
}

/* ═══════════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════════ */

function initials(name) {
  return (name || "?").split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";
}

function fillProfile(user) {
  const name   = user?.displayName || "User";
  const email  = user?.email || "";
  const joined = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const ini = initials(name);

  // Avatar
  const avatarEl = $("pf-avatar");
  if (avatarEl) avatarEl.textContent = ini;

  // Sidebar avatar initials
  const sidebarIni = $("sidebar-avatar-initials");
  if (sidebarIni) sidebarIni.textContent = ini;

  // Sidebar name / email
  const sidebarName  = $("sidebar-username");
  const sidebarEmail = $("sidebar-useremail");
  if (sidebarName)  sidebarName.textContent  = name;
  if (sidebarEmail) sidebarEmail.textContent = email;

  // Page info
  const nameEl   = $("pf-name");
  const emailEl  = $("pf-email");
  const joinedEl = $("pf-joined");
  if (nameEl)   nameEl.textContent   = name;
  if (emailEl)  emailEl.textContent  = email;
  if (joinedEl && joined) joinedEl.textContent = "Joined " + joined;
}

function fillStats() {
  const gmCount = getCount(KEYS.gmCount);
  const wrCount = getCount(KEYS.wrCount);
  const spCount = getCount(KEYS.spCount);

  const allItems = [
    ...getList(KEYS.gmHistory),
    ...getList(KEYS.wrHistory),
    ...getList(KEYS.spHistory),
  ];
  const uniqueDays = new Set(allItems.map(h => (h.date || "").split(" ·")[0])).size;

  animateStat($("pf-stat-grammar"),  gmCount);
  animateStat($("pf-stat-writing"),  wrCount);
  animateStat($("pf-stat-speaking"), spCount);
  animateStat($("pf-stat-days"),     uniqueDays);
}

function initNameEdit() {
  const editBtn   = $("pf-edit-btn");
  const editCard  = $("pf-edit-card");
  const nameInput = $("pf-name-input");
  const saveBtn   = $("pf-save-btn");
  const cancelBtn = $("pf-cancel-btn");
  const errEl     = $("pf-edit-error");
  const nameEl    = $("pf-name");

  if (!editBtn || !editCard) return;

  editBtn.addEventListener("click", () => {
    editCard.hidden = false;
    editBtn.style.display = "none";
    if (nameInput) nameInput.value = nameEl?.textContent || "";
    nameInput?.focus();
  });

  cancelBtn?.addEventListener("click", () => {
    editCard.hidden = true;
    editBtn.style.display = "";
    if (errEl) errEl.textContent = "";
  });

  saveBtn?.addEventListener("click", async () => {
    const newName = nameInput?.value.trim();
    if (!newName) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    if (errEl) errEl.textContent = "";

    try {
      if (window.GramminoAuth?.updateName) {
        await window.GramminoAuth.updateName(newName);
      }
      const ini = initials(newName);
      if (nameEl) nameEl.textContent = newName;
      if ($("pf-avatar"))              $("pf-avatar").textContent              = ini;
      if ($("sidebar-avatar-initials"))$("sidebar-avatar-initials").textContent = ini;
      if ($("sidebar-username"))       $("sidebar-username").textContent        = newName;
      editCard.hidden = true;
      editBtn.style.display = "";
    } catch (err) {
      if (errEl) errEl.textContent = err.message || "Could not save name.";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });
}

function initSignOut() {
  const btn = $("pf-signout-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await window.GramminoAuth?.signOut?.();
    } finally {
      window.location.replace("login.html");
    }
  });
}

/* ═══════════════════════════════════════════════════════
   HISTORY
═══════════════════════════════════════════════════════ */

let hsFilter = "all";

function renderHistory() {
  const list  = $("hs-list");
  const empty = $("hs-empty");
  if (!list) return;

  const gm = getList(KEYS.gmHistory).map(h => ({ ...h, _tool: "grammar" }));
  const wr = getList(KEYS.wrHistory).map(h => ({ ...h, _tool: "writing" }));
  const sp = getList(KEYS.spHistory).map(h => ({ ...h, _tool: "speaking" }));

  let all = [...gm, ...wr, ...sp].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (hsFilter !== "all") all = all.filter(h => h._tool === hsFilter);

  if (!all.length) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  list.innerHTML = all.map(card).join("");
}

function card(h) {
  const date = fmtDate(h.ts);

  if (h._tool === "grammar") {
    return `<div class="hs-card hs-card-grammar">
      <div class="hs-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 20V6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
          <path d="M14 4v5h5"/><path d="M8 13h8M8 17h5"/>
        </svg>
      </div>
      <div class="hs-card-body">
        <div class="hs-card-head">
          <span class="hs-tool-tag">Grammar AI</span>
          <span class="hs-date">${escHtml(date)}</span>
        </div>
        <p class="hs-preview">${escHtml(h.preview || "(empty session)")}</p>
        <div class="hs-card-meta">
          <span class="hs-badge hs-msgs">${h.msgCount || 0} messages</span>
        </div>
      </div>
    </div>`;
  }

  if (h._tool === "writing") {
    return `<div class="hs-card hs-card-writing">
      <div class="hs-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
      </div>
      <div class="hs-card-body">
        <div class="hs-card-head">
          <span class="hs-tool-tag">Writing AI</span>
          <span class="hs-date">${escHtml(date)}</span>
        </div>
        <p class="hs-preview">${escHtml(h.preview || "(no text)")}</p>
        <div class="hs-card-meta">
          <span class="hs-badge hs-band">Band ${escHtml(String(h.band ?? "?"))}</span>
          <span>${escHtml(h.typeName || "")}</span>
        </div>
      </div>
    </div>`;
  }

  if (h._tool === "speaking") {
    return `<div class="hs-card hs-card-speaking">
      <div class="hs-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="3" width="6" height="12" rx="3"/>
          <path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3M8 21h8"/>
        </svg>
      </div>
      <div class="hs-card-body">
        <div class="hs-card-head">
          <span class="hs-tool-tag">Speaking AI</span>
          <span class="hs-date">${escHtml(date)}</span>
        </div>
        <p class="hs-preview">${escHtml(h.topic || "Practice session")}</p>
        <div class="hs-card-meta">
          <span class="hs-badge hs-score">${h.score ?? 0}/100</span>
          <span>${escHtml(h.grade || "")}</span>
          <span>${escHtml(h.level || "")}</span>
        </div>
      </div>
    </div>`;
  }

  return "";
}

function initHistory() {
  const tabs = document.querySelectorAll(".hs-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      hsFilter = tab.dataset.filter || "all";
      renderHistory();
    });
  });

  const clearBtn = $("hs-clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("Clear all history? This cannot be undone.")) return;
      [KEYS.gmHistory, KEYS.wrHistory, KEYS.spHistory].forEach(k => localStorage.removeItem(k));
      renderHistory();
    });
  }
}

/* ── Bootstrap ────────────────────────────────────────── */

window.addEventListener("DOMContentLoaded", () => {
  if (!$("pf-avatar")) return;

  // Profile
  onAuthReady(user => {
    fillProfile(user);
    fillStats();
  });
  initNameEdit();
  initSignOut();

  // History (render on first load and when tabs switch)
  initHistory();
  renderHistory();

  // Re-render when switching to history/profile pages
  document.querySelectorAll(".tool-link").forEach(link => {
    link.addEventListener("click", () => {
      const tool = link.dataset.tool;
      if (tool === "history") renderHistory();
      if (tool === "profile") {
        onAuthReady(user => {
          fillProfile(user);
          fillStats();
        });
      }
    });
  });
});

/* ── Public API (used by grammar/writing/speaking tools) ─ */

window.GramminoHistory = {
  saveGrammar(preview, msgCount) {
    const list = getList(KEYS.gmHistory);
    const now  = Date.now();
    list.unshift({ ts: now, preview: String(preview || "").slice(0, 120), msgCount });
    localStorage.setItem(KEYS.gmHistory, JSON.stringify(list.slice(0, 40)));
    localStorage.setItem(KEYS.gmCount, String(getCount(KEYS.gmCount) + 1));
  },
  saveWriting(band, typeName, preview) {
    const list = getList(KEYS.wrHistory);
    const now  = Date.now();
    list.unshift({ ts: now, band, typeName, preview: String(preview || "").slice(0, 120) });
    localStorage.setItem(KEYS.wrHistory, JSON.stringify(list.slice(0, 40)));
    localStorage.setItem(KEYS.wrCount, String(getCount(KEYS.wrCount) + 1));
  },
  saveSpeaking(topic, level, score, grade) {
    const list = getList(KEYS.spHistory);
    const now  = Date.now();
    list.unshift({ ts: now, topic, level, score, grade });
    localStorage.setItem(KEYS.spHistory, JSON.stringify(list.slice(0, 40)));
    localStorage.setItem(KEYS.spCount, String(getCount(KEYS.spCount) + 1));
  },
};

})();
