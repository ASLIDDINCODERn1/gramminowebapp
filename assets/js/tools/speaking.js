"use strict";

(function () {

const sp$ = id => document.getElementById(id);
const sp$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const state = {
  level: "B1",
  topicId: "",
  questionCount: 10,
  topics: [],
  banks: {},
  questions: [],
  answers: [],
  currentIndex: 0,
  currentTranscript: "",
  recognition: null,
  isRecording: false,
  voices: [],
  voiceUri: "",
  accentFilter: "all",
  voiceRate: 1,
  lowPowerMode: false,
};

const STORAGE = {
  level: "speaking_ai_level",
  topicId: "speaking_ai_topic_id",
  questionCount: "speaking_ai_question_count",
  voiceUri: "speaking_ai_voice_uri",
  accentFilter: "speaking_ai_accent_filter",
  voiceRate: "speaking_ai_voice_rate",
};

const PROGRESS_RING_CIRCUMFERENCE = 163.36;
const SCORE_RING_CIRCUMFERENCE = 339.29;

const LEVEL_LABELS = {
  A2: "A2 - Elementary",
  B1: "B1 - Intermediate",
  B2: "B2 - Upper Intermediate",
  C1: "C1 - Advanced",
  C2: "C2 - Proficient",
};

const COMMON_MISTAKES = [
  { pattern: /\bi am agree\b/gi,   correct: "I agree",      explain: "Use 'agree' as a verb, not 'am agree'.",              category: "Verb form" },
  { pattern: /\bmore better\b/gi,  correct: "better",       explain: "Do not use double comparatives.",                     category: "Comparatives" },
  { pattern: /\bdiscuss about\b/gi,correct: "discuss",      explain: "Use 'discuss' without 'about'.",                      category: "Word choice" },
  { pattern: /\badvices\b/gi,      correct: "advice",       explain: "'Advice' is uncountable in English.",                 category: "Countable/uncountable" },
  { pattern: /\bpeople is\b/gi,    correct: "people are",   explain: "Use a plural verb with 'people'.",                    category: "Subject-verb agreement" },
  { pattern: /\bhe go\b/gi,        correct: "he goes",      explain: "Use third-person singular -s in present simple.",    category: "Subject-verb agreement" },
  { pattern: /\bshe go\b/gi,       correct: "she goes",     explain: "Use third-person singular -s in present simple.",    category: "Subject-verb agreement" },
  { pattern: /\bi goed\b/gi,       correct: "I went",       explain: "The past form of 'go' is 'went'.",                   category: "Past tense" },
];

/* ── Bootstrap ─────────────────────────────────────────── */

window.addEventListener("DOMContentLoaded", () => {
  // Only init when the speaking section exists on the page
  if (!sp$("sp-setup-screen")) return;
  void bootstrap();
});

async function bootstrap() {
  bindUiEvents();
  restoreSavedPreferences();
  initPerformanceMode();
  initSpeechRecognition();
  initVoiceSettings();

  sp$("sp-start-btn").disabled = true;
  try {
    await loadQuestionData();
    renderTopicGrid();
    applySavedSetupState();
    sp$("sp-start-btn").disabled = false;
  } catch (err) {
    setSettingsError("Could not load questions: " + err.message);
  }

  showScreen("setup");
  setStep("setup");
}

function initPerformanceMode() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = window.matchMedia("(max-width: 640px)").matches;
  const small = window.matchMedia("(max-width: 768px)").matches;
  const lowMem = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  state.lowPowerMode = reducedMotion || phone || (small && (lowMem || lowCpu));
}

/* ── UI Events ─────────────────────────────────────────── */

function bindUiEvents() {
  sp$("sp-accent-filter").addEventListener("click", e => {
    const btn = e.target.closest(".sp-pill");
    if (btn && btn.dataset.accent) setAccentFilter(btn.dataset.accent);
  });

  sp$("sp-voice-select").addEventListener("change", e => {
    state.voiceUri = e.target.value || "";
    localStorage.setItem(STORAGE.voiceUri, state.voiceUri);
  });

  sp$("sp-rate-slider").addEventListener("input", e => {
    const v = clampNum(Number(e.target.value), 0.6, 1.4);
    state.voiceRate = v;
    localStorage.setItem(STORAGE.voiceRate, String(v));
    updateRateLabel();
  });

  sp$("sp-preview-voice").addEventListener("click", () => {
    speak("Hello, I am your Speaking AI coach. I will ask clear questions and guide your improvement.");
    showToast("Voice preview started.");
  });

  sp$("sp-level-group").addEventListener("click", e => {
    const btn = e.target.closest(".sp-pill");
    if (!btn || !btn.dataset.value) return;
    state.level = btn.dataset.value;
    localStorage.setItem(STORAGE.level, state.level);
    applyPillActive(sp$("sp-level-group"), state.level, "value");
  });

  sp$("sp-count-group").addEventListener("click", e => {
    const btn = e.target.closest(".sp-pill");
    if (!btn || !btn.dataset.value) return;
    const n = clampNum(Number(btn.dataset.value), 5, 20);
    state.questionCount = n;
    localStorage.setItem(STORAGE.questionCount, String(n));
    applyPillActive(sp$("sp-count-group"), String(n), "value");
  });

  sp$("sp-start-btn").addEventListener("click", () => void startSession());
  sp$("sp-mic-btn").addEventListener("click", toggleRecording);
  sp$("sp-redo-btn").addEventListener("click", resetAnswer);
  sp$("sp-next-btn").addEventListener("click", () => void submitAnswer());
  sp$("sp-replay-btn").addEventListener("click", () => {
    const q = state.questions[state.currentIndex] || "";
    if (q) speak(q);
  });
  sp$("sp-restart-btn").addEventListener("click", () => void startSession());
  sp$("sp-home-btn").addEventListener("click", () => {
    hardStop();
    showScreen("setup");
    setStep("setup");
    clearSettingsError();
  });
}

/* ── Preferences ───────────────────────────────────────── */

function restoreSavedPreferences() {
  const lvl = localStorage.getItem(STORAGE.level);
  if (lvl && LEVEL_LABELS[lvl]) state.level = lvl;

  const cnt = Number(localStorage.getItem(STORAGE.questionCount));
  if (Number.isFinite(cnt) && cnt >= 5 && cnt <= 20) state.questionCount = cnt;

  const tid = localStorage.getItem(STORAGE.topicId);
  if (tid) state.topicId = tid;

  const vuri = localStorage.getItem(STORAGE.voiceUri);
  if (vuri) state.voiceUri = vuri;

  const acc = localStorage.getItem(STORAGE.accentFilter);
  if (acc) state.accentFilter = acc;

  const rate = Number(localStorage.getItem(STORAGE.voiceRate));
  if (Number.isFinite(rate)) state.voiceRate = clampNum(rate, 0.6, 1.4);
}

function applySavedSetupState() {
  applyPillActive(sp$("sp-level-group"), state.level, "value");
  applyPillActive(sp$("sp-count-group"), String(state.questionCount), "value");

  if (!state.topicId || !state.topics.some(t => t.id === state.topicId)) {
    state.topicId = state.topics[0]?.id || "";
    if (state.topicId) localStorage.setItem(STORAGE.topicId, state.topicId);
  }
  updateTopicCardSelection();
}

function applyPillActive(group, value, key) {
  if (!group) return;
  sp$$(".sp-pill", group).forEach(p => {
    p.classList.toggle("active", String(p.dataset[key]) === String(value));
  });
}

/* ── Voice ─────────────────────────────────────────────── */

function initVoiceSettings() {
  sp$("sp-rate-slider").value = String(state.voiceRate);
  updateRateLabel();
  setAccentFilter(state.accentFilter, false);

  if (!("speechSynthesis" in window)) {
    sp$("sp-voice-select").innerHTML = "<option>Voice synthesis not supported in this browser</option>";
    sp$("sp-voice-select").disabled = true;
    sp$("sp-preview-voice").disabled = true;
    return;
  }

  const loadVoices = () => {
    state.voices = window.speechSynthesis.getVoices()
      .filter(v => v.lang && v.lang.toLowerCase().startsWith("en"))
      .sort((a, b) => a.name.localeCompare(b.name));
    populateVoiceSelect();
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function setAccentFilter(accent, persist = true) {
  state.accentFilter = accent || "all";
  if (persist) localStorage.setItem(STORAGE.accentFilter, state.accentFilter);
  applyPillActive(sp$("sp-accent-filter"), state.accentFilter, "accent");
  populateVoiceSelect();
}

function populateVoiceSelect() {
  const sel = sp$("sp-voice-select");
  sel.innerHTML = "";
  const filtered = state.voices.filter(v => matchAccent(v.lang || "", state.accentFilter));
  const list = filtered.length ? filtered : state.voices;

  if (!list.length) {
    sel.innerHTML = "<option value=''>No English voices on this device</option>";
    sel.disabled = true;
    sp$("sp-preview-voice").disabled = true;
    state.voiceUri = "";
    return;
  }
  sel.disabled = false;
  sp$("sp-preview-voice").disabled = false;

  list.forEach(v => {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(o);
  });

  if (!list.some(v => v.voiceURI === state.voiceUri)) {
    state.voiceUri = list[0].voiceURI;
    localStorage.setItem(STORAGE.voiceUri, state.voiceUri);
  }
  sel.value = state.voiceUri;
}

function matchAccent(lang, filter) {
  if (filter === "all") return true;
  const l = lang.toLowerCase();
  if (filter === "other") return l.startsWith("en") && !l.startsWith("en-us") && !l.startsWith("en-gb") && !l.startsWith("en-au");
  return l.startsWith(filter.toLowerCase());
}

function updateRateLabel() {
  sp$("sp-rate-val").textContent = `${state.voiceRate.toFixed(2)}x`;
}

function speak(text) {
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const voice = state.voices.find(v => v.voiceURI === state.voiceUri);
  if (voice) { utt.voice = voice; utt.lang = voice.lang; }
  else utt.lang = "en-US";
  utt.rate = state.voiceRate;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

/* ── Speech Recognition ────────────────────────────────── */

function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    sp$("sp-mic-btn").disabled = true;
    sp$("sp-mic-status").textContent = "Speech recognition is not supported. Use Chrome or Edge.";
    return;
  }

  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = !state.lowPowerMode;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let final = "";

  rec.onresult = e => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (state.lowPowerMode && !e.results[i].isFinal) continue;
      if (e.results[i].isFinal) final += `${t} `;
      else interim += t;
    }
    state.currentTranscript = `${final}${interim}`.trim();
    const el = sp$("sp-transcript");
    el.textContent = state.currentTranscript || "Listening...";
    el.classList.toggle("empty", !state.currentTranscript);
  };

  rec.onerror = e => {
    const msgs = {
      "not-allowed":    "Microphone permission blocked. Allow access and try again.",
      "no-speech":      "No speech detected. Please try again.",
      "audio-capture":  "Microphone is not available.",
    };
    showToast(msgs[e.error] || "Speech capture error. Please try again.");
    hardStop();
  };

  rec.onend = () => {
    if (state.isRecording) {
      try { rec.start(); } catch (_) { /* rapid restart throttle — safe */ }
    }
  };

  rec._reset = () => { final = ""; };
  state.recognition = rec;
}

function toggleRecording() {
  state.isRecording ? hardStop() : startRecording();
}

function startRecording() {
  if (!state.recognition || state.isRecording) return;
  state.currentTranscript = "";
  state.recognition._reset();

  const el = sp$("sp-transcript");
  el.textContent = "Listening...";
  el.classList.remove("empty");

  sp$("sp-next-btn").disabled = true;
  sp$("sp-redo-btn").disabled = true;
  sp$("sp-mic-btn").classList.add("recording");
  sp$("sp-mic-status").classList.add("recording");
  sp$("sp-mic-status").textContent = "Recording… click the mic to stop.";

  try {
    state.recognition.start();
    state.isRecording = true;
  } catch (_) {
    showToast("Could not start microphone recording.");
    hardStop();
  }
}

function hardStop() {
  if (!state.recognition) return;
  state.isRecording = false;
  try { state.recognition.stop(); } catch (_) { /* safe */ }

  sp$("sp-mic-btn").classList.remove("recording");
  sp$("sp-mic-status").classList.remove("recording");

  if (state.currentTranscript.trim()) {
    sp$("sp-next-btn").disabled = false;
    sp$("sp-redo-btn").disabled = false;
    sp$("sp-mic-status").textContent = "Answer captured. Submit or redo.";
  } else {
    sp$("sp-next-btn").disabled = true;
    sp$("sp-redo-btn").disabled = true;
    sp$("sp-mic-status").textContent = "Press the mic to answer.";
    sp$("sp-transcript").textContent = "Your spoken answer will appear here...";
    sp$("sp-transcript").classList.add("empty");
  }
}

function resetAnswer() {
  state.currentTranscript = "";
  sp$("sp-transcript").textContent = "Your spoken answer will appear here...";
  sp$("sp-transcript").classList.add("empty");
  sp$("sp-next-btn").disabled = true;
  sp$("sp-redo-btn").disabled = true;
  sp$("sp-mic-status").textContent = "Press the mic to answer.";
  sp$("sp-mic-status").classList.remove("recording");
}

/* ── Session ───────────────────────────────────────────── */

async function loadQuestionData() {
  const res = await fetch("pages/speaking/questions.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  state.banks = normalizeBanks(data.banks || {});

  if (Array.isArray(data.topics) && data.topics.length) {
    state.topics = data.topics.map((t, i) => ({
      id:    normalizeMojibake(t.id || makeTopicId(t.name || `topic-${i + 1}`)),
      name:  normalizeMojibake(t.name || `Topic ${i + 1}`),
      emoji: normalizeMojibake(t.emoji || ""),
      group: normalizeMojibake(t.group || "Speaking"),
    }));
  } else {
    state.topics = Object.keys(state.banks).map(name => ({
      id: makeTopicId(name), name, emoji: "", group: "Speaking",
    }));
  }

  if (!state.topics.length) throw new Error("No topics found in questions.json");
}

function renderTopicGrid() {
  const grid = sp$("sp-topic-grid");
  grid.innerHTML = "";
  state.topics.forEach(t => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sp-topic-card";
    btn.dataset.topicId = t.id;
    btn.innerHTML = `
      <span class="sp-emoji">${escHtml(t.emoji || "")}</span>
      <span class="sp-name">${escHtml(t.name)}</span>
      <span class="sp-group">${escHtml(t.group || "Speaking")}</span>
    `;
    btn.addEventListener("click", () => {
      state.topicId = t.id;
      localStorage.setItem(STORAGE.topicId, state.topicId);
      updateTopicCardSelection();
      clearSettingsError();
    });
    grid.appendChild(btn);
  });
  updateTopicCardSelection();
}

function updateTopicCardSelection() {
  sp$$(".sp-topic-card").forEach(c => c.classList.toggle("active", c.dataset.topicId === state.topicId));
}

async function startSession() {
  clearSettingsError();
  if (!state.topicId) { setSettingsError("Select a topic before starting."); return; }
  const bank = getBank();
  if (!bank.length) { setSettingsError("No questions available for this topic."); return; }

  hardStop();
  window.speechSynthesis?.cancel();
  showScreen("loading");
  setStep("practice");
  sp$("sp-loading-text").textContent = "Preparing your speaking session…";
  await sleep(400);

  state.questions = pickQuestions(bank, state.questionCount);
  state.answers = new Array(state.questions.length).fill("");
  state.currentIndex = 0;
  state.currentTranscript = "";

  renderQuestion();
  showScreen("practice");
  speak(state.questions[0]);
}

function getSelectedTopic() {
  return state.topics.find(t => t.id === state.topicId) || null;
}

function getBank() {
  const topic = getSelectedTopic();
  if (!topic) return [];
  const byName = state.banks[topic.name];
  if (Array.isArray(byName) && byName.length) return byName;
  const byId = state.banks[topic.id];
  if (Array.isArray(byId) && byId.length) return byId;
  return [];
}

function pickQuestions(src, count) {
  const clean = src.map(q => String(q || "").trim()).filter(Boolean);
  if (!clean.length) return [];
  const wanted = clampNum(Number(count), 5, 20);
  const picked = [];
  let pool = shuffle(clean);
  while (picked.length < wanted) {
    if (!pool.length) pool = shuffle(clean);
    picked.push(pool.pop());
  }
  return picked;
}

function renderQuestion() {
  const total = state.questions.length;
  const idx = state.currentIndex;

  sp$("sp-question-text").textContent = state.questions[idx] || "";
  sp$("sp-topic-label").textContent = getSelectedTopic()?.name || "Topic";
  sp$("sp-level-label").textContent = LEVEL_LABELS[state.level] || state.level;

  const offset = PROGRESS_RING_CIRCUMFERENCE * (1 - idx / total);
  sp$("sp-ring-fill-circle").style.strokeDashoffset = String(offset);
  sp$("sp-ring-text").textContent = `${idx + 1}/${total}`;

  resetAnswer();
  sp$("sp-next-btn").innerHTML = idx === total - 1
    ? `Finish &amp; Get Feedback`
    : `Submit <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`;
}

async function submitAnswer() {
  if (state.isRecording) hardStop();
  const text = state.currentTranscript.trim();
  if (!text) { showToast("Record your answer before submitting."); return; }

  state.answers[state.currentIndex] = text;

  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
    speak(state.questions[state.currentIndex]);
    return;
  }
  await finalize();
}

async function finalize() {
  showScreen("loading");
  setStep("feedback");
  sp$("sp-loading-text").textContent = "Running grammar checks and preparing your report…";
  try {
    const report = await buildReport();
    renderReport(report);
    showScreen("feedback");
    if (window.GramminoHistory) {
      window.GramminoHistory.saveSpeaking(
        getSelectedTopic()?.name || "Practice",
        LEVEL_LABELS[state.level] || state.level,
        report.score,
        report.grade
      );
    }
  } catch (err) {
    sp$("sp-loading-text").textContent = `Could not generate feedback: ${err.message}`;
  }
}

/* ── Analysis ──────────────────────────────────────────── */

async function buildReport() {
  const analyses = await Promise.all(state.answers.map((a, i) => analyzeAnswer(a, i)));
  const allErrors = analyses.flatMap(a => a.errors);
  const deduped = dedupeErrors(allErrors).slice(0, 20);

  const answered = analyses.filter(a => a.wordCount > 0).length;
  const totalWords = analyses.reduce((s, a) => s + a.wordCount, 0);
  const avgWords = answered ? totalWords / answered : 0;
  const fillers = analyses.reduce((s, a) => s + a.fillerCount, 0);

  const allTokens = analyses.flatMap(a => a.tokens);
  const ttr = allTokens.length ? new Set(allTokens).size / allTokens.length : 0;
  const longRatio = allTokens.length ? allTokens.filter(t => t.length >= 7).length / allTokens.length : 0;

  const severe = deduped.filter(e => e.severity === "high").length;
  const completion = round((answered / Math.max(state.questions.length, 1)) * 100);
  const grammarPenalty = Math.min(62, deduped.length * 2.8 + severe * 3.5);
  const grammarAccuracy = clampNum(100 - grammarPenalty, 20, 100);
  const fluency = clampNum(40 + avgWords * 2.2 - fillers * 2.5, 20, 100);
  const vocabulary = clampNum(30 + ttr * 85 + longRatio * 45, 20, 100);
  const overall = round(grammarAccuracy * 0.42 + fluency * 0.23 + vocabulary * 0.2 + completion * 0.15);

  const metrics = { grammarAccuracy, fluency, vocabulary, completion, averageWords: round(avgWords), fillerCount: fillers };

  return {
    score: overall,
    grade: scoreGrade(overall),
    summary: buildSummary(metrics, deduped.length),
    strengths: buildStrengths(metrics, deduped.length),
    tips: buildTips(metrics, analyses, deduped),
    errors: deduped,
    metrics,
    coachFeedback: buildCoach(metrics, deduped.length, analyses),
    followUps: buildFollowUps(deduped),
    usedFallback: analyses.some(a => a.usedFallback),
  };
}

async function analyzeAnswer(answer, qi) {
  const text = String(answer || "").trim();
  const tokens = tokenize(text);
  const fillerCount = countFillers(text);
  if (!text) return { qi, wordCount: 0, tokens: [], fillerCount: 0, errors: [], usedFallback: false };
  try {
    return { qi, wordCount: tokens.length, tokens, fillerCount, errors: await ltCheck(text, qi), usedFallback: false };
  } catch (_) {
    return { qi, wordCount: tokens.length, tokens, fillerCount, errors: heuristicCheck(text, qi), usedFallback: true };
  }
}

async function ltCheck(text, qi) {
  const body = new URLSearchParams();
  body.set("language", "en-US");
  body.set("text", text);
  const res = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`LanguageTool HTTP ${res.status}`);
  const data = await res.json();
  return (data.matches || []).map(m => normalizeLtMatch(text, m, qi)).filter(Boolean);
}

function normalizeLtMatch(text, match, qi) {
  const offset = Number(match.offset) || 0;
  const len    = Number(match.length) || 0;
  const wrong  = text.slice(offset, offset + len).trim();
  const replacement = Array.isArray(match.replacements) ? match.replacements[0]?.value || "" : "";
  const catId = String(match.rule?.category?.id || "").toUpperCase();
  if (!wrong || wrong.length < 2) return null;
  if (["PUNCTUATION","CASING","TYPOGRAPHY"].includes(catId)) return null;
  const issueType = String(match.rule?.issueType || "").toLowerCase();
  const severity = issueType.includes("grammar") || catId.includes("GRAMMAR") ? "high" : "medium";
  return { question: qi, wrong, correct: replacement || wrong, explain: String(match.message || "Grammar issue."), category: String(match.rule?.category?.name || "Grammar"), severity };
}

function heuristicCheck(text, qi) {
  const errors = [];
  COMMON_MISTAKES.forEach(rule => {
    for (const m of text.matchAll(rule.pattern)) {
      const wrong = String(m[0] || "").trim();
      if (wrong) errors.push({ question: qi, wrong, correct: rule.correct, explain: rule.explain, category: rule.category, severity: "medium" });
    }
  });
  const rep = text.match(/\b([a-zA-Z']+)\s+\1\b/);
  if (rep) errors.push({ question: qi, wrong: rep[0], correct: rep[1], explain: "Avoid repeating the same word twice in a row.", category: "Fluency", severity: "low" });
  return errors;
}

function dedupeErrors(errors) {
  const seen = new Set();
  return errors.filter(e => {
    const k = [e.question, String(e.wrong||"").toLowerCase(), String(e.correct||"").toLowerCase(), String(e.category||"").toLowerCase()].join("::");
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

/* ── Feedback text builders ────────────────────────────── */

function buildStrengths(m, errorCount) {
  const s = [];
  if (m.completion >= 95) s.push("You completed almost every question — great consistency.");
  if (m.fluency >= 72) s.push("Your answers were detailed and easy to follow.");
  if (m.vocabulary >= 70) s.push("You used a strong range of vocabulary.");
  if (m.grammarAccuracy >= 78 || errorCount <= 4) s.push("Your sentence structures were mostly accurate and clear.");
  if (!s.length) {
    s.push("You kept speaking and gave complete ideas — the best way to improve fast.");
    s.push("Your answers show good intent and communication even where grammar needs polish.");
  }
  return s.slice(0, 4);
}

function buildTips(m, analyses, errors) {
  const tips = [];
  const byCat = new Map();
  errors.forEach(e => byCat.set(String(e.category||"Grammar"), (byCat.get(String(e.category||"Grammar"))||0)+1));
  const top = [...byCat.entries()].sort((a,b)=>b[1]-a[1])[0];
  if (top) tips.push(`Focus on ${top[0].toLowerCase()} — that category had the most mistakes.`);
  if (m.grammarAccuracy < 70) tips.push("Slow down and check verb tense and subject agreement before finishing each answer.");
  if (m.fluency < 65) tips.push("Practice 45-second speaking bursts: answer one question without stopping, then repeat with cleaner structure.");
  if (m.vocabulary < 65) tips.push("Add 3 topic words to each answer and reuse them in different sentence patterns.");
  if (m.completion < 100) tips.push("Answer every question fully, even with short responses, to build exam-style consistency.");
  const empty = analyses.filter(a => a.wordCount === 0).length;
  if (empty > 0) tips.push(`You skipped ${empty} question(s). Keep the mic active and submit a full answer for every prompt.`);
  if (!tips.length) tips.push("Your core performance is strong. Next step: increase complexity with linking words and specific examples.");
  return tips.slice(0, 5);
}

function buildCoach(m, errorCount, analyses) {
  const answered = analyses.filter(a => a.wordCount > 0).length;
  const total = analyses.length;
  if (answered === 0) return "No speech was captured. Start another session and answer each question out loud for a complete report.";
  const quality = m.grammarAccuracy >= 80 ? "Your grammar control is solid and most messages are clear on the first read." : "Your ideas are understandable, but grammar accuracy is reducing clarity in several answers.";
  const pace = m.fluency >= 70 ? "Your speaking flow is stable and confident." : "Your speaking flow improves when you use shorter sentence blocks before adding detail.";
  const target = errorCount > 0 ? "Review the correction list and repeat those structures in new sentences to lock in accuracy." : "Keep the same structure quality and focus on richer vocabulary to raise your score further.";
  return `${quality} ${pace} You completed ${answered} of ${total} questions. ${target}`;
}

function buildFollowUps(errors) {
  const followUps = [];
  const byQ = new Map();
  errors.forEach(e => byQ.set(e.question, (byQ.get(e.question)||0)+1));
  [...byQ.entries()].sort((a,b)=>b[1]-a[1]).forEach(([qi]) => {
    if (followUps.length >= 3) return;
    const q = state.questions[qi];
    const fix = errors.find(e => e.question === qi)?.correct || "correct grammar";
    if (q) followUps.push(`Answer again with perfect grammar: "${q}" Include: "${fix}".`);
  });
  const extra = shuffle(getBank().filter(q => !state.questions.includes(q)));
  for (const q of extra) {
    if (followUps.length >= 5) break;
    followUps.push(`Practice question: ${q}`);
  }
  while (followUps.length < 5) {
    followUps.push(`Exact follow-up: ${state.questions[followUps.length % state.questions.length] || "Give a one-minute answer about your daily routine using clear grammar."}`);
  }
  return followUps;
}

function buildSummary(m, errorCount) {
  const errLine = errorCount === 0 ? "No major grammar errors detected." : `${errorCount} grammar issue(s) detected and corrected.`;
  return `${errLine} Grammar ${round(m.grammarAccuracy)}%, Fluency ${round(m.fluency)}%, Vocabulary ${round(m.vocabulary)}%.`;
}

function scoreGrade(s) {
  if (s >= 95) return "A+ Excellent";
  if (s >= 90) return "A Strong";
  if (s >= 85) return "B+ Very Good";
  if (s >= 78) return "B Good";
  if (s >= 70) return "C+ Developing";
  if (s >= 62) return "C Needs Polish";
  if (s >= 52) return "D Needs Work";
  return "Rebuild Foundation";
}

/* ── Render Report ─────────────────────────────────────── */

function renderReport(report) {
  sp$("sp-feedback-summary").textContent = report.usedFallback
    ? `${report.summary} (Live grammar API was unavailable; backup rules were used.)`
    : report.summary;

  animateScore(report.score);
  sp$("sp-score-grade").textContent = report.grade;
  sp$("sp-score-ring-fill").style.strokeDashoffset = String(SCORE_RING_CIRCUMFERENCE * (1 - report.score / 100));

  renderMetrics(report.metrics);
  renderFeedbackSections(report);
}

function animateScore(target) {
  const el = sp$("sp-score-number");
  if (state.lowPowerMode) { el.textContent = String(Math.round(target)); return; }
  const start = Number(el.textContent) || 0;
  const diff = target - start;
  const t0 = performance.now();
  const tick = now => {
    const p = Math.min(1, (now - t0) / 900);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(start + diff * e));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderMetrics(m) {
  const cards = [
    { label: "Grammar Accuracy", value: round(m.grammarAccuracy), unit: "%" },
    { label: "Fluency",          value: round(m.fluency),         unit: "%" },
    { label: "Vocabulary Range", value: round(m.vocabulary),      unit: "%" },
    { label: "Task Completion",  value: round(m.completion),      unit: "%" },
  ];
  const container = sp$("sp-metrics");
  container.innerHTML = "";
  cards.forEach(c => {
    const div = document.createElement("div");
    div.className = "sp-metric";
    div.innerHTML = `
      <div class="sp-metric-label">
        <span>${escHtml(c.label)}</span>
        <span class="sp-metric-value">${c.value}${c.unit}</span>
      </div>
      <div class="sp-metric-bar"><div class="sp-metric-bar-fill" style="width:0%"></div></div>
    `;
    container.appendChild(div);
    const fill = div.querySelector(".sp-metric-bar-fill");
    if (state.lowPowerMode) fill.style.width = `${c.value}%`;
    else requestAnimationFrame(() => { fill.style.width = `${c.value}%`; });
  });
}

function renderFeedbackSections(report) {
  const cont = sp$("sp-feedback-content");
  cont.innerHTML = "";
  cont.appendChild(buildErrorsSection(report.errors));
  cont.appendChild(buildListSection("Professional Coach Feedback", [report.coachFeedback]));
  cont.appendChild(buildListSection("What You Did Well", report.strengths));
  cont.appendChild(buildListSection("Improvement Plan", report.tips));
  cont.appendChild(buildListSection("Follow-up Questions", report.followUps));
  cont.appendChild(buildAnswerReview());
}

function buildErrorsSection(errors) {
  const sec = document.createElement("section");
  sec.className = "sp-feedback-section";
  if (!errors.length) {
    sec.innerHTML = `<h3>Error Checker</h3><p style="color:var(--text-dim);font-size:14px">No major grammar errors detected. Keep this structure quality.</p>`;
    return sec;
  }
  const h = document.createElement("h3");
  h.innerHTML = `Error Checker <span class="sp-section-count">${errors.length}</span>`;
  sec.appendChild(h);
  const ul = document.createElement("ul");
  ul.className = "sp-error-list";
  errors.forEach(e => {
    const li = document.createElement("li");
    li.className = "sp-error-card";
    li.innerHTML = `
      <div class="sp-correction-row">
        <span class="sp-wrong">${escHtml(e.wrong)}</span>
        <span class="sp-arrow">→</span>
        <span class="sp-correct">${escHtml(e.correct)}</span>
      </div>
      <div class="sp-explain">${escHtml(e.explain)} <span class="sp-q-tag">(Q${e.question + 1})</span></div>
    `;
    ul.appendChild(li);
  });
  sec.appendChild(ul);
  return sec;
}

function buildListSection(title, items) {
  const sec = document.createElement("section");
  sec.className = "sp-feedback-section";
  const h = document.createElement("h3");
  h.textContent = title;
  sec.appendChild(h);
  const ul = document.createElement("ul");
  ul.className = "sp-simple-list";
  (items || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });
  if (!ul.children.length) {
    const li = document.createElement("li");
    li.textContent = "No additional notes for this section.";
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

function buildAnswerReview() {
  const sec = document.createElement("section");
  sec.className = "sp-feedback-section";
  sec.innerHTML = "<h3>Your Answers</h3>";
  const list = document.createElement("div");
  list.className = "sp-qa-list";
  state.questions.forEach((q, i) => {
    const row = document.createElement("div");
    row.className = "sp-qa-item";
    row.innerHTML = `
      <div class="sp-q"><strong>Q${i + 1}:</strong> ${escHtml(q)}</div>
      <div class="sp-a"><strong>You said:</strong> ${escHtml(state.answers[i] || "(no answer)")}</div>
    `;
    list.appendChild(row);
  });
  sec.appendChild(list);
  return sec;
}

/* ── Screen / Stepper ──────────────────────────────────── */

function showScreen(name) {
  ["setup","loading","practice","feedback"].forEach(s => {
    sp$(`sp-${s}-screen`).classList.toggle("active", s === name);
  });
}

function setStep(step) {
  const order = ["setup","practice","feedback"];
  const ai = order.indexOf(step);
  sp$$(".sp-stepper .sp-step").forEach((el, i) => {
    el.classList.toggle("active", i === ai);
    el.classList.toggle("done", i < ai);
  });
}

function setSettingsError(msg) { sp$("sp-settings-error").textContent = msg; }
function clearSettingsError() { sp$("sp-settings-error").textContent = ""; }

function showToast(msg) {
  const t = sp$("sp-toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ── Utilities ─────────────────────────────────────────── */

function tokenize(text) { return String(text || "").toLowerCase().match(/[a-z']+/g) || []; }

function countFillers(text) {
  const s = ` ${String(text || "").toLowerCase()} `;
  return [" um "," uh "," you know "," like "," actually "," basically "].reduce((n, f) => {
    let idx = 0, c = 0;
    while ((idx = s.indexOf(f, idx)) !== -1) { c++; idx += f.length; }
    return n + c;
  }, 0);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTopicId(v) {
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "topic";
}

function clampNum(v, min, max) { return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min; }
function round(v) { return Math.round(Number(v) || 0); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function escHtml(v) {
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function normalizeBanks(raw) {
  const out = {};
  Object.entries(raw).forEach(([k, v]) => {
    out[normalizeMojibake(k)] = Array.isArray(v) ? v.map(normalizeMojibake) : [];
  });
  return out;
}

function normalizeMojibake(value) {
  const text = String(value || "");
  if (!text || !/[ÃÃÃ°]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, c => c.charCodeAt(0));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded.includes("") ? text : decoded;
  } catch (_) { return text; }
}

})(); // end IIFE
