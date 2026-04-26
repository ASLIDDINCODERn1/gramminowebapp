/**
 * Grammino runtime config.
 *
 * ⚠️  SECURITY WARNING ⚠️
 * Keys placed in client-side JS are visible to anyone who opens the page.
 * This is fine for local development or trusted demos, but BEFORE you
 * publish the site publicly:
 *   1) Rotate this key in the Groq dashboard (regenerate it).
 *   2) Move Groq calls behind a backend proxy that injects the key server-side.
 */
window.GRAMMINO_CONFIG = {
  GROQ_API_KEY: "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", // paste your Groq key here for local dev; do NOT commit it

  // Non-Llama models on Groq (try others if one is deprecated):
  //   "openai/gpt-oss-20b"     ← default, fast & strong at grammar
  //   "openai/gpt-oss-120b"    ← bigger, slower, higher quality
  //   "qwen/qwen3-32b"
  //   "moonshotai/kimi-k2-instruct"
  GROQ_MODEL: "llama-3.3-70b-versatile",
  GROQ_ENDPOINT: "https://api.groq.com/openai/v1/chat/completions",
};
