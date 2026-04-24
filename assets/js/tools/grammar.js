(function () {
  "use strict";

  const cfg = window.GRAMMINO_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const messagesEl = $("gm-messages");
  const form       = $("gm-form");
  const input      = $("gm-text");
  const sendBtn    = $("gm-send");
  const newBtn     = $("gm-new");

  if (!messagesEl || !form) return;

  // ---------- Expert grammar teacher system prompt ----------
  const SYSTEM_PROMPT = `
You are **Grammino Grammar AI** — a world-class English grammar teacher and editor.

## Your job
- When the user pastes a sentence, paragraph, or essay: identify every grammar, spelling, punctuation, word-choice, and style issue, then teach the user WHY each one is an error.
- When the user asks a grammar question: explain the rule deeply but clearly.

## Response format (use Markdown)
For a **text check**:
1. **Corrected text** — the fully corrected version in a single block.
2. **Issues & rules** — numbered list. For each issue:
   - Quote the problem fragment in \`code\`.
   - Name the grammar rule (e.g. *Subject-verb agreement*, *Comma splice*, *Dangling modifier*, *Wrong tense*, *Article misuse*, *Preposition error*, *Countable vs. uncountable*, *Conditional type I/II/III*).
   - Explain *why* it is wrong in 1–2 sentences.
   - Show a short **correct example** and, when helpful, an **incorrect** one for contrast.
3. **Key takeaway** — one-line practical tip.

For a **rule / question**:
1. **Rule name** in bold.
2. **Definition** — plain-language explanation.
3. **Formula / pattern** if applicable (e.g. \`Subject + have/has + V3\`).
4. **Examples** — at least 3 correct, plus 1–2 common mistakes with corrections.
5. **Exceptions / tips** if relevant.

## Rules of conduct
- Be warm, patient, professional. Never condescending.
- Match the user's language:
  - If they write in Uzbek → explain rules in Uzbek, but keep English examples in English.
  - If they write in Russian → explain in Russian, English examples in English.
  - Otherwise → explain in English.
- Use clear headings (\`##\`), bullet lists, and \`code\` for grammar fragments.
- Never invent rules. If you're unsure about something rare, say so.
- Keep answers focused — depth over length. No filler.
- If the user's text is already perfect, say so and offer **one optional stylistic improvement** if any exists.

You are here to make the user a better English writer. Teach every time you correct.
`.trim();

  // ---------- Markdown renderer (safe, tiny) ----------
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function mdToHtml(md) {
    let src = escapeHtml(md);

    // Code blocks ```lang\n...\n```
    src = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.replace(/\n$/, "")}</code></pre>`;
    });

    // Inline code `x`
    src = src.replace(/`([^`\n]+)`/g, "<code>$1</code>");

    // Headings
    src = src.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
    src = src.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
    src = src.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
    src = src.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
    src = src.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
    src = src.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

    // Horizontal rule
    src = src.replace(/^---+$/gm, "<hr>");

    // Bold / italic
    src = src.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    src = src.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,!?;:)])/g, "$1<em>$2</em>");
    src = src.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,!?;:)])/g, "$1<em>$2</em>");

    // Blockquotes
    src = src.replace(/^>\s?(.*)$/gm, "<blockquote>$1</blockquote>");

    // Lists (handle consecutive items)
    // Numbered
    src = src.replace(/(^|\n)((?:\d+\.\s+.+(?:\n|$))+)/g, (_, pre, block) => {
      const items = block.trim().split(/\n/).map(l =>
        "<li>" + l.replace(/^\d+\.\s+/, "") + "</li>"
      ).join("");
      return `${pre}<ol>${items}</ol>`;
    });
    // Bulleted
    src = src.replace(/(^|\n)((?:[-*]\s+.+(?:\n|$))+)/g, (_, pre, block) => {
      const items = block.trim().split(/\n/).map(l =>
        "<li>" + l.replace(/^[-*]\s+/, "") + "</li>"
      ).join("");
      return `${pre}<ul>${items}</ul>`;
    });

    // Paragraphs (double newlines) + line breaks (single newline that's not in block)
    const lines = src.split(/\n{2,}/).map((chunk) => {
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr)/i.test(chunk.trim())) return chunk;
      return "<p>" + chunk.replace(/\n/g, "<br>") + "</p>";
    });
    return lines.join("\n");
  }

  // ---------- Chat state ----------
  let history = [{ role: "system", content: SYSTEM_PROMPT }];
  let streaming = false;
  let controller = null;

  function clearEmpty() {
    const empty = messagesEl.querySelector(".chat-empty");
    if (empty) empty.remove();
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function avatarIcon(role) {
    if (role === "user") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 20V6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
      <path d="M14 4v5h5"/><path d="M8 13h8M8 17h5"/></svg>`;
  }

  function addMessage(role, content) {
    clearEmpty();
    const msg = document.createElement("div");
    msg.className = "msg msg-" + role;
    msg.innerHTML = `
      <div class="msg-avatar">${avatarIcon(role)}</div>
      <div class="msg-body"></div>
    `;
    const body = msg.querySelector(".msg-body");
    if (role === "user") {
      body.textContent = content;
    } else {
      body.innerHTML = mdToHtml(content);
    }
    messagesEl.appendChild(msg);
    scrollBottom();
    return body;
  }

  function addTypingBubble() {
    clearEmpty();
    const msg = document.createElement("div");
    msg.className = "msg msg-ai";
    msg.innerHTML = `
      <div class="msg-avatar">${avatarIcon("ai")}</div>
      <div class="msg-body"><div class="typing"><span></span><span></span><span></span></div></div>
    `;
    messagesEl.appendChild(msg);
    scrollBottom();
    return msg.querySelector(".msg-body");
  }

  // ---------- Groq streaming ----------
  async function streamGroq(messages, onChunk) {
    if (!cfg.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY. Check assets/js/config.js.");
    controller = new AbortController();

    const s = (window.Settings && window.Settings.get) ? window.Settings.get() : {};
    const model = s.aiModel || cfg.GROQ_MODEL;
    const temperature = (typeof s.aiTemp === "number") ? s.aiTemp : 0.3;

    const res = await fetch(cfg.GROQ_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": "Bearer " + cfg.GROQ_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature,
        max_tokens: 1600,
      }),
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${txt || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let full = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Parse SSE "data: {...}\n\n"
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return full;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onChunk(full);
          }
        } catch (_) {}
      }
    }
    return full;
  }

  // ---------- Submit flow ----------
  async function submit() {
    if (streaming) {
      // Act as stop button
      if (controller) controller.abort();
      return;
    }
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    autoResize();

    addMessage("user", text);
    history.push({ role: "user", content: text });

    const bubble = addTypingBubble();

    streaming = true;
    setSendState(true);

    try {
      let final = "";
      await streamGroq(history, (full) => {
        final = full;
        bubble.innerHTML = mdToHtml(full) + '<span class="msg-caret"></span>';
        scrollBottom();
      });
      bubble.innerHTML = mdToHtml(final || "…");
      history.push({ role: "assistant", content: final });
    } catch (err) {
      const aborted = err && err.name === "AbortError";
      bubble.innerHTML = aborted
        ? "<em>Stopped.</em>"
        : `<strong>Error:</strong> ${escapeHtml(err.message)}<br><small>Check your Groq API key and model in <code>assets/js/config.js</code>.</small>`;
    } finally {
      streaming = false;
      controller = null;
      setSendState(false);
      scrollBottom();
      input.focus();
    }
  }

  function setSendState(active) {
    if (active) {
      sendBtn.classList.add("stop");
      sendBtn.title = "Stop";
      sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
    } else {
      sendBtn.classList.remove("stop");
      sendBtn.title = "Send";
      sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
    }
  }

  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(200, input.scrollHeight) + "px";
  }

  // Events
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit();
  });
  input.addEventListener("input", autoResize);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  newBtn.addEventListener("click", () => {
    if (streaming && controller) controller.abort();
    history = [{ role: "system", content: SYSTEM_PROMPT }];
    messagesEl.innerHTML = `
      <div class="chat-empty">
        <div class="chat-empty-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20V6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
            <path d="M14 4v5h5"/><path d="M8 13h8M8 17h5"/>
          </svg>
        </div>
        <h3>New chat started.</h3>
        <p>Ask a grammar question or paste a sentence to check.</p>
      </div>`;
    input.focus();
  });

  // Suggestions (event delegation)
  messagesEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".sug");
    if (!btn) return;
    input.value = btn.dataset.sug || btn.textContent;
    autoResize();
    submit();
  });
})();
