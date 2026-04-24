(function () {
  "use strict";

  // 35+ languages with voice-capable locale codes
  const LANGS = [
    { c: "en", name: "English",    loc: "en-US" },
    { c: "es", name: "Spanish",    loc: "es-ES" },
    { c: "fr", name: "French",     loc: "fr-FR" },
    { c: "de", name: "German",     loc: "de-DE" },
    { c: "it", name: "Italian",    loc: "it-IT" },
    { c: "pt", name: "Portuguese", loc: "pt-PT" },
    { c: "ru", name: "Russian",    loc: "ru-RU" },
    { c: "uk", name: "Ukrainian",  loc: "uk-UA" },
    { c: "uz", name: "Uzbek",      loc: "uz-UZ" },
    { c: "tr", name: "Turkish",    loc: "tr-TR" },
    { c: "ar", name: "Arabic",     loc: "ar-SA" },
    { c: "he", name: "Hebrew",     loc: "he-IL" },
    { c: "fa", name: "Persian",    loc: "fa-IR" },
    { c: "ur", name: "Urdu",       loc: "ur-PK" },
    { c: "hi", name: "Hindi",      loc: "hi-IN" },
    { c: "bn", name: "Bengali",    loc: "bn-BD" },
    { c: "ta", name: "Tamil",      loc: "ta-IN" },
    { c: "te", name: "Telugu",     loc: "te-IN" },
    { c: "th", name: "Thai",       loc: "th-TH" },
    { c: "vi", name: "Vietnamese", loc: "vi-VN" },
    { c: "id", name: "Indonesian", loc: "id-ID" },
    { c: "ms", name: "Malay",      loc: "ms-MY" },
    { c: "zh-CN", name: "Chinese (Simplified)", loc: "zh-CN" },
    { c: "ja", name: "Japanese",   loc: "ja-JP" },
    { c: "ko", name: "Korean",     loc: "ko-KR" },
    { c: "nl", name: "Dutch",      loc: "nl-NL" },
    { c: "pl", name: "Polish",     loc: "pl-PL" },
    { c: "sv", name: "Swedish",    loc: "sv-SE" },
    { c: "no", name: "Norwegian",  loc: "nb-NO" },
    { c: "da", name: "Danish",     loc: "da-DK" },
    { c: "fi", name: "Finnish",    loc: "fi-FI" },
    { c: "cs", name: "Czech",      loc: "cs-CZ" },
    { c: "sk", name: "Slovak",     loc: "sk-SK" },
    { c: "hu", name: "Hungarian",  loc: "hu-HU" },
    { c: "ro", name: "Romanian",   loc: "ro-RO" },
    { c: "bg", name: "Bulgarian",  loc: "bg-BG" },
    { c: "el", name: "Greek",      loc: "el-GR" },
    { c: "hr", name: "Croatian",   loc: "hr-HR" },
  ];

  const $ = (id) => document.getElementById(id);
  const fromSel = $("tr-from");
  const toSel   = $("tr-to");
  const swap    = $("tr-swap");
  const src     = $("tr-source");
  const tgt     = $("tr-target");
  const go      = $("tr-go");
  const mic     = $("tr-mic");
  const speakSrc= $("tr-speak-src");
  const speakTgt= $("tr-speak-tgt");
  const copyBtn = $("tr-copy");
  const status  = $("tr-status");
  const count   = $("tr-count");
  const defWrap = $("tr-def-wrap");
  const defWord = $("tr-def-word");
  const defPhon = $("tr-def-phon");
  const defBody = $("tr-def-body");
  const defSpeak= $("tr-def-speak");

  if (!fromSel) return;

  // Populate selects
  function fillSelect(sel, selected) {
    LANGS.forEach((l) => {
      const o = document.createElement("option");
      o.value = l.c;
      o.textContent = l.name;
      if (l.c === selected) o.selected = true;
      sel.appendChild(o);
    });
  }
  fillSelect(fromSel, "en");
  fillSelect(toSel, "uz");

  function langByCode(code) {
    return LANGS.find((l) => l.c === code) || LANGS[0];
  }

  // Char counter
  function updateCount() {
    count.textContent = src.value.length;
  }
  src.addEventListener("input", updateCount);
  updateCount();

  // Swap
  swap.addEventListener("click", () => {
    const a = fromSel.value, b = toSel.value;
    fromSel.value = b; toSel.value = a;
    const t = tgt.textContent.trim();
    if (t && !t.startsWith("Translation")) {
      src.value = t;
      updateCount();
    }
    swap.classList.add("spin");
    setTimeout(() => swap.classList.remove("spin"), 400);
  });

  // Web Speech (STT)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SR) {
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      src.value = e.results[0][0].transcript;
      updateCount();
    };
    recognition.onend = () => mic.classList.remove("active");
    recognition.onerror = () => mic.classList.remove("active");
  }
  mic.addEventListener("click", () => {
    if (!recognition) {
      setStatus("Voice input not supported in this browser.", true);
      return;
    }
    if (mic.classList.contains("active")) {
      recognition.stop(); return;
    }
    recognition.lang = langByCode(fromSel.value).loc;
    try {
      recognition.start();
      mic.classList.add("active");
    } catch (_) {}
  });

  // TTS
  function speak(text, locale, btn) {
    if (!text) return;
    if (!window.speechSynthesis) {
      setStatus("Text-to-speech not supported.", true);
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    u.rate = 0.95;
    u.pitch = 1;
    if (btn) {
      btn.classList.add("playing");
      u.onend = u.onerror = () => btn.classList.remove("playing");
    }
    speechSynthesis.speak(u);
  }
  speakSrc.addEventListener("click", () => speak(src.value.trim(), langByCode(fromSel.value).loc, speakSrc));
  speakTgt.addEventListener("click", () => {
    const t = tgt.textContent.trim();
    if (t) speak(t, langByCode(toSel.value).loc, speakTgt);
  });

  // Copy
  copyBtn.addEventListener("click", async () => {
    const t = tgt.textContent.trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setStatus("Copied ✓");
      setTimeout(() => setStatus(""), 1500);
    } catch {
      setStatus("Copy failed.", true);
    }
  });

  // Translate
  async function translate(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    if (!data || !data.responseData) throw new Error("Bad response");
    return data.responseData.translatedText;
  }

  function setStatus(msg, isErr) {
    status.textContent = msg || "";
    status.classList.toggle("err", !!isErr);
  }
  function setOutput(text) {
    tgt.textContent = text;
  }

  go.addEventListener("click", async () => {
    const text = src.value.trim();
    if (!text) { setStatus("Please enter text to translate.", true); return; }
    if (fromSel.value === toSel.value) { setStatus("Source and target languages are the same.", true); return; }
    go.disabled = true;
    setStatus("Translating…");
    setOutput("");
    try {
      const out = await translate(text, fromSel.value, toSel.value);
      setOutput(out);
      setStatus("");
      maybeShowDefinition(text);
    } catch (e) {
      setStatus("Translation failed. Try again.", true);
    } finally {
      go.disabled = false;
    }
  });

  // Definitions (English source, single-word lookups)
  async function fetchDefinition(word) {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data[0] ? data[0] : null;
  }

  function renderDefinition(entry) {
    defBody.innerHTML = "";
    defWord.textContent = entry.word || "";
    const phon = (entry.phonetics || []).find((p) => p.text);
    defPhon.textContent = phon ? phon.text : "";
    (entry.meanings || []).forEach((m) => {
      const group = document.createElement("div");
      const pos = document.createElement("span");
      pos.className = "tr-def-pos";
      pos.textContent = m.partOfSpeech;
      group.appendChild(pos);
      const ol = document.createElement("ol");
      ol.className = "tr-def-list";
      (m.definitions || []).slice(0, 4).forEach((d) => {
        const li = document.createElement("li");
        li.textContent = d.definition;
        if (d.example) {
          const ex = document.createElement("div");
          ex.className = "tr-def-ex";
          ex.textContent = "“" + d.example + "”";
          li.appendChild(ex);
        }
        ol.appendChild(li);
      });
      group.appendChild(ol);
      defBody.appendChild(group);
    });
    defWrap.hidden = false;
  }

  async function maybeShowDefinition(text) {
    defWrap.hidden = true;
    let word = text.trim();
    let sourceLang = fromSel.value;

    // If source is not English, translate source to English first (single word only)
    const isSingleWord = /^[\p{L}'\-]+$/u.test(word);
    if (!isSingleWord) return;

    try {
      if (sourceLang !== "en") {
        const en = await translate(word, sourceLang, "en");
        word = (en || "").split(/\s|,/)[0].replace(/[^a-zA-Z'\-]/g, "");
        if (!word) return;
      }
      const entry = await fetchDefinition(word.toLowerCase());
      if (entry) renderDefinition(entry);
    } catch (_) {
      // ignore; definition is optional
    }
  }

  defSpeak.addEventListener("click", () => {
    const w = defWord.textContent.trim();
    if (w) speak(w, "en-US", defSpeak);
  });

  // Enter (Ctrl/⌘) to translate
  src.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") go.click();
  });
})();
