(function () {
  "use strict";

  const editor = document.getElementById("editor");
  const statWords = document.getElementById("stat-words");
  const statChars = document.getElementById("stat-chars");
  const statRead = document.getElementById("stat-read");
  const statIssues = document.getElementById("stat-issues");
  const issuesList = document.getElementById("issues");
  const clearBtn = document.getElementById("clear-btn");
  const yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const RULES = [
    { pattern: /\bi\b/g, message: "'i' should be capitalized as 'I'." },
    { pattern: /\bteh\b/gi, message: "'teh' looks like a typo for 'the'." },
    { pattern: /\brecieve\b/gi, message: "'recieve' should be 'receive' (i before e)." },
    { pattern: /\bdefinately\b/gi, message: "'definately' should be 'definitely'." },
    { pattern: /\boccured\b/gi, message: "'occured' should be 'occurred'." },
    { pattern: /\bseperate\b/gi, message: "'seperate' should be 'separate'." },
    { pattern: /\bthier\b/gi, message: "'thier' should be 'their'." },
    { pattern: /\balot\b/gi, message: "'alot' should be 'a lot'." },
    { pattern: /\s{2,}/g, message: "Multiple spaces — use a single space." },
    { pattern: /\s+[,.!?;:]/g, message: "Space before punctuation — remove it." },
    { pattern: /[,.!?;:](?=[A-Za-z])/g, message: "Missing space after punctuation." },
    { pattern: /\bits\b(?=\s+(a|an|the|very|so|really|too))/gi, message: "'its' may need an apostrophe: 'it's'." },
    { pattern: /\byour\b(?=\s+(going|coming|doing|welcome))/gi, message: "'your' may need to be 'you're'." },
    { pattern: /\btheir\b(?=\s+(is|are|going|coming))/gi, message: "'their' may need to be 'they're' or 'there'." },
    { pattern: /\bto\b(?=\s+(much|many|big|small|late|early))/gi, message: "'to' may need to be 'too'." },
  ];

  function analyze(text) {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const minutes = Math.max(0, Math.round(words / 200));
    const found = [];

    for (const rule of RULES) {
      const matches = text.match(rule.pattern);
      if (matches && matches.length) {
        found.push({
          message: rule.message,
          count: matches.length,
        });
      }
    }

    return { words, chars, minutes, issues: found };
  }

  function render(result) {
    statWords.textContent = result.words;
    statChars.textContent = result.chars;
    statRead.textContent = result.minutes + " min";
    statIssues.textContent = result.issues.reduce((n, i) => n + i.count, 0);

    issuesList.innerHTML = "";
    if (result.issues.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = result.words === 0
        ? "Start typing to see suggestions."
        : "Looks clean — no issues found.";
      issuesList.appendChild(li);
      return;
    }
    for (const issue of result.issues) {
      const li = document.createElement("li");
      li.textContent = issue.count > 1
        ? issue.message + " (" + issue.count + " occurrences)"
        : issue.message;
      issuesList.appendChild(li);
    }
  }

  function update() {
    render(analyze(editor.value));
  }

  if (editor) {
    editor.addEventListener("input", update);
    update();
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      editor.value = "";
      editor.focus();
      update();
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      const id = link.getAttribute("href");
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
})();
