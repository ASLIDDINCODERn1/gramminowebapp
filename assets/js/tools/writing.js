(function () {
  "use strict";

  const cfg = window.GRAMMINO_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const typesEl    = $("wr-types");
  const promptEl   = $("wr-prompt");
  const textEl     = $("wr-text");
  const countEl    = $("wr-count");
  const countVal   = $("wr-count-val");
  const countTgt   = $("wr-count-tgt");
  const goBtn      = $("wr-go");
  const statusEl   = $("wr-status");
  const resultsEl  = $("wr-results");

  if (!textEl || !goBtn) return;

  // ---------- State ----------
  const TASK_DEFAULTS = {
    "task2":   { label: "IELTS Task 2 (Essay)",     target: 250, criteria: "Task Response" },
    "task1a":  { label: "IELTS Task 1 (Academic)",  target: 150, criteria: "Task Achievement" },
    "task1g":  { label: "IELTS Task 1 (General)",   target: 150, criteria: "Task Achievement" },
    "free":    { label: "Free writing",             target: 0,   criteria: "Task Response" },
  };
  let currentType = "task2";
  let busy = false;

  // ---------- Task switch ----------
  function setType(type) {
    currentType = type;
    typesEl.querySelectorAll(".wr-type").forEach((b) =>
      b.classList.toggle("active", b.dataset.type === type)
    );
    const def = TASK_DEFAULTS[type];
    countTgt.textContent = def.target ? `/ ${def.target}` : "";
    updateCount();
  }
  typesEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".wr-type");
    if (btn) setType(btn.dataset.type);
  });

  // ---------- Word count ----------
  function wordCount(s) {
    return s.trim() ? s.trim().split(/\s+/).length : 0;
  }
  function updateCount() {
    const n = wordCount(textEl.value);
    const tgt = TASK_DEFAULTS[currentType].target;
    countVal.textContent = n;
    countEl.classList.remove("ok", "low");
    if (tgt) {
      if (n >= tgt) countEl.classList.add("ok");
      else if (n > 0 && n < tgt * 0.7) countEl.classList.add("low");
    }
  }
  textEl.addEventListener("input", updateCount);

  // ---------- System prompt ----------
  const SYSTEM = `
You are **Grammino Writing Coach** — an expert IELTS examiner and English writing teacher.
Your job is to evaluate a user's writing and return STRICT JSON with detailed IELTS-style feedback.

## Output JSON schema (return ONLY this JSON, no extra prose):
{
  "band_overall": number,        // overall IELTS band 0–9, may be .5 (e.g. 6.5)
  "bands": {
    "task": number,              // Task Response / Task Achievement
    "coherence": number,         // Coherence & Cohesion
    "lexical": number,           // Lexical Resource
    "grammar": number            // Grammatical Range & Accuracy
  },
  "summary": string,             // 1–2 sentence overall verdict
  "feedback": {
    "task":      string,         // 2–4 sentences on task response/achievement
    "coherence": string,         // 2–4 sentences on cohesion & structure
    "lexical":   string,         // 2–4 sentences on vocabulary
    "grammar":   string          // 2–4 sentences on grammar & accuracy
  },
  "errors": [                    // up to 12 most important errors
    {
      "wrong":    string,        // the exact incorrect fragment from user's text
      "correct":  string,        // the corrected version
      "rule":     string,        // short rule name (e.g. "Subject-verb agreement", "Article misuse", "Collocation")
      "explain":  string         // 1–2 sentence explanation of why it's wrong
    }
  ],
  "corrected": string,           // full corrected version of the user's writing
  "tips": [string]               // 3–6 concrete, actionable tips to reach the next band
}

## Scoring rules
- Apply official IELTS band descriptors strictly. Do not inflate scores.
- Use 0.5 granularity (e.g. 5.0, 5.5, 6.0, 6.5, 7.0).
- band_overall is the arithmetic mean of the 4 sub-bands, rounded to nearest 0.5.
- If the writing is far below the word target, deduct from "task" band and mention it in feedback.task.
- If the writing is off-topic (when a prompt is given), deduct significantly from "task".

## Language rules
- The \`summary\`, \`feedback\`, \`explain\`, and \`tips\` fields MUST match the user's native-explanation language:
  - If the user writes in Uzbek → explain in Uzbek (keep English examples inside quotes).
  - If Russian → explain in Russian.
  - Otherwise → explain in English.
- \`wrong\`, \`correct\`, \`corrected\`, and \`rule\` stay in English.

## Style
- Be honest and specific. No empty praise.
- Every error's "explain" must teach the rule, not just state the fix.
- Tips should be actionable (e.g. "Use at least 2 complex sentences per paragraph with 'although', 'whereas', 'despite'.").

Return ONLY the JSON object. No prose. No markdown fences.
`.trim();

  function buildUserMessage(taskKey, prompt, writing) {
    const def = TASK_DEFAULTS[taskKey];
    const lines = [];
    lines.push(`Task type: ${def.label}`);
    if (def.target) lines.push(`Target word count: ${def.target}`);
    lines.push(`Primary criterion: ${def.criteria}`);
    if (prompt && prompt.trim()) {
      lines.push(`\nTask prompt / question:\n${prompt.trim()}`);
    } else {
      lines.push(`\nTask prompt / question: (not provided — evaluate on general merits)`);
    }
    lines.push(`\nUser's writing:\n"""\n${writing.trim()}\n"""`);
    lines.push(`\nReturn only the JSON described in the system prompt.`);
    return lines.join("\n");
  }

  // ---------- Groq request (non-streaming, JSON mode) ----------
  async function evaluate(taskKey, prompt, writing) {
    if (!cfg.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY. Check assets/js/config.js.");

    const s = (window.Settings && window.Settings.get) ? window.Settings.get() : {};
    const model = s.aiModel || cfg.GROQ_MODEL;

    const res = await fetch(cfg.GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + cfg.GROQ_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user",   content: buildUserMessage(taskKey, prompt, writing) },
        ],
        temperature: 0.15,
        max_tokens: 2400,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${txt || res.statusText}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract the first JSON object if the model added stray text
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI javobi tushunarsiz — qaytadan urinib ko'ring.");
      parsed = JSON.parse(m[0]);
    }
    return parsed;
  }

  // ---------- Render ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function clamp(n, min, max) {
    n = Number(n); if (!isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function bandLabel(b) {
    if (b >= 8.5) return "Expert";
    if (b >= 7.5) return "Very good";
    if (b >= 6.5) return "Good";
    if (b >= 5.5) return "Competent";
    if (b >= 4.5) return "Modest";
    if (b >= 3.5) return "Limited";
    return "Basic";
  }

  function renderResult(r) {
    const overall = clamp(r.band_overall, 0, 9);
    const bands = r.bands || {};
    const fb = r.feedback || {};
    const errors = Array.isArray(r.errors) ? r.errors : [];
    const tips = Array.isArray(r.tips) ? r.tips : [];
    const corrected = r.corrected || "";
    const summary = r.summary || "";

    const subBand = (name, key, colorKey) => {
      const val = clamp(bands[key], 0, 9);
      const pct = (val / 9) * 100;
      return `
        <div class="wr-sub">
          <div class="wr-sub-head">
            <span class="wr-sub-name">${esc(name)}</span>
            <span class="wr-sub-score">${val.toFixed(1)}</span>
          </div>
          <div class="wr-sub-bar"><span style="width:${pct}%"></span></div>
        </div>`;
    };

    const feedbackSection = (title, text) => `
      <div class="wr-section">
        <h4><span class="dot"></span>${esc(title)}</h4>
        <p>${esc(text || "—")}</p>
      </div>`;

    const errorsHTML = errors.length ? `
      <div class="wr-errors">
        <h4>Xatolar va izohlar (${errors.length})</h4>
        ${errors.map((e) => `
          <div class="wr-err">
            <div class="wr-err-rule">${esc(e.rule || "Correction")}</div>
            <div class="wr-err-row">
              <span class="wr-err-wrong">${esc(e.wrong || "")}</span>
              <span style="color: var(--text-dim)">→</span>
              <span class="wr-err-right">${esc(e.correct || "")}</span>
            </div>
            <div class="wr-err-explain">${esc(e.explain || "")}</div>
          </div>
        `).join("")}
      </div>` : "";

    const correctedHTML = corrected ? `
      <div class="wr-corrected">
        <h4>Corrected version</h4>
        ${esc(corrected)}
      </div>` : "";

    const tipsHTML = tips.length ? `
      <div class="wr-tips">
        <h4>Keyingi band uchun maslahatlar</h4>
        <ul>${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>` : "";

    resultsEl.innerHTML = `
      <div class="wr-hero">
        <div class="wr-big">
          <div class="wr-big-num">${overall.toFixed(1)}</div>
          <div class="wr-big-lbl">${esc(bandLabel(overall))}</div>
        </div>
        <div class="wr-hero-text">
          <h3>Sizning IELTS band'ingiz: ${overall.toFixed(1)}</h3>
          <p>${esc(summary)}</p>
        </div>
      </div>

      <div class="wr-subs">
        ${subBand("Task",      "task")}
        ${subBand("Coherence", "coherence")}
        ${subBand("Lexical",   "lexical")}
        ${subBand("Grammar",   "grammar")}
      </div>

      <div class="wr-sections">
        ${feedbackSection("Task Response",  fb.task)}
        ${feedbackSection("Coherence & Cohesion", fb.coherence)}
        ${feedbackSection("Lexical Resource", fb.lexical)}
        ${feedbackSection("Grammatical Range & Accuracy", fb.grammar)}
      </div>

      ${errorsHTML}
      ${correctedHTML}
      ${tipsHTML}
    `;
    resultsEl.classList.add("show");
    // Animate sub-bars from 0 → target by resetting width briefly
    requestAnimationFrame(() => {
      resultsEl.querySelectorAll(".wr-sub-bar span").forEach((el) => {
        const w = el.style.width;
        el.style.width = "0%";
        requestAnimationFrame(() => { el.style.width = w; });
      });
    });
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Submit ----------
  function setBusy(on) {
    busy = on;
    goBtn.disabled = on;
    if (on) {
      goBtn.innerHTML = `<span class="wr-spin"></span><span>Baholanmoqda…</span>`;
      statusEl.textContent = "";
      statusEl.classList.remove("err");
    } else {
      goBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
        </svg>
        <span>Baholash</span>`;
    }
  }

  async function submit() {
    if (busy) return;
    const writing = textEl.value.trim();
    if (writing.length < 20) {
      statusEl.textContent = "Iltimos, kamida 20 ta belgidan iborat matn yozing.";
      statusEl.classList.add("err");
      return;
    }
    const prompt = promptEl ? promptEl.value : "";

    setBusy(true);
    resultsEl.classList.remove("show");

    try {
      const r = await evaluate(currentType, prompt, writing);
      renderResult(r);
    } catch (err) {
      statusEl.textContent = `Xatolik: ${err.message}`;
      statusEl.classList.add("err");
    } finally {
      setBusy(false);
    }
  }

  goBtn.addEventListener("click", submit);

  // Init
  setType(currentType);
  setBusy(false);
})();
