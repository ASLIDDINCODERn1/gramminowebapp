/**
 * Grammino settings + i18n manager.
 * Loads before other scripts so theme/font/language apply immediately.
 */
(function () {
  "use strict";

  const KEY = "grammino.settings";
  const DEFAULTS = {
    theme: "dark",          // dark | light | auto
    accent: "blue",         // blue | violet | cyan | pink | emerald
    fontSize: "md",         // sm | md | lg | xl
    uiLang: "en",           // en | uz | ru
    motion: "full",         // full | reduced
    density: "cozy",        // cozy | compact
    aiModel: "openai/gpt-oss-20b",
    aiTemp: 0.3,
  };

  // i18n dictionary
  const STRINGS = {
    en: {
      tagline: "All in one English tools app",
      signout: "Sign out",
      settings: "Settings",
      grammar: "Grammar AI",
      grammar_desc: "Fix grammar & spelling",
      translator: "Translator",
      translator_desc: "100+ languages",
      speaking: "Speaking AI",
      speaking_desc: "Practice pronunciation",
      writing: "Writing AI",
      writing_desc: "Essays, emails & more",
      welcome_greet_morning: "Good morning",
      welcome_greet_afternoon: "Good afternoon",
      welcome_greet_evening: "Good evening",
      welcome_greet_night: "Good night",
      welcome_hint: "Open the menu to choose a tool",
      chip_ai: "AI-Powered",
      chip_langs: "35+ Languages",
      chip_voice: "Voice Enabled",
      chip_private: "Private & Fast",
      // Settings page
      set_title: "Settings",
      set_desc: "Customize Grammino to your taste.",
      sec_appearance: "Appearance",
      sec_language: "Language",
      sec_ai: "AI",
      sec_data: "Data",
      opt_theme: "Theme",
      opt_theme_dark: "Dark",
      opt_theme_light: "Light",
      opt_theme_auto: "Auto",
      opt_accent: "Accent color",
      opt_fontsize: "Font size",
      opt_fs_sm: "Small",
      opt_fs_md: "Medium",
      opt_fs_lg: "Large",
      opt_fs_xl: "Extra Large",
      opt_motion: "Animations",
      opt_motion_full: "Full",
      opt_motion_reduced: "Reduced",
      opt_density: "Density",
      opt_density_cozy: "Cozy",
      opt_density_compact: "Compact",
      opt_ui_lang: "Interface language",
      opt_ai_model: "Grammar AI model",
      opt_ai_temp: "Creativity",
      opt_reset: "Reset to defaults",
      opt_clear_chat: "Clear chat history",
      saved: "Saved ✓",
    },
    uz: {
      tagline: "Bitta joyda hamma ingliz tili vositalari",
      signout: "Chiqish",
      settings: "Sozlamalar",
      grammar: "Grammar AI",
      grammar_desc: "Grammatika va imlo tuzatish",
      translator: "Tarjimon",
      translator_desc: "100+ til",
      speaking: "Speaking AI",
      speaking_desc: "Talaffuzni mashq qiling",
      writing: "Writing AI",
      writing_desc: "Insho, xat va boshqalar",
      welcome_greet_morning: "Xayrli tong",
      welcome_greet_afternoon: "Xayrli kun",
      welcome_greet_evening: "Xayrli kech",
      welcome_greet_night: "Xayrli tun",
      welcome_hint: "Vositani tanlash uchun menyuni oching",
      chip_ai: "AI quvvatli",
      chip_langs: "35+ til",
      chip_voice: "Ovoz bilan",
      chip_private: "Maxfiy va tez",
      set_title: "Sozlamalar",
      set_desc: "Grammino'ni o'zingizga moslang.",
      sec_appearance: "Ko'rinish",
      sec_language: "Til",
      sec_ai: "AI",
      sec_data: "Ma'lumotlar",
      opt_theme: "Tema",
      opt_theme_dark: "Qorong'i",
      opt_theme_light: "Yorug'",
      opt_theme_auto: "Avtomatik",
      opt_accent: "Asosiy rang",
      opt_fontsize: "Shrift o'lchami",
      opt_fs_sm: "Kichik",
      opt_fs_md: "O'rtacha",
      opt_fs_lg: "Katta",
      opt_fs_xl: "Juda katta",
      opt_motion: "Animatsiyalar",
      opt_motion_full: "To'liq",
      opt_motion_reduced: "Kamaytirilgan",
      opt_density: "Zichlik",
      opt_density_cozy: "Qulay",
      opt_density_compact: "Ixcham",
      opt_ui_lang: "Interfeys tili",
      opt_ai_model: "Grammar AI modeli",
      opt_ai_temp: "Ijodkorlik",
      opt_reset: "Standartga qaytarish",
      opt_clear_chat: "Suhbatlar tarixini tozalash",
      saved: "Saqlandi ✓",
    },
    ru: {
      tagline: "Все инструменты английского в одном месте",
      signout: "Выйти",
      settings: "Настройки",
      grammar: "Grammar AI",
      grammar_desc: "Исправление грамматики",
      translator: "Переводчик",
      translator_desc: "100+ языков",
      speaking: "Speaking AI",
      speaking_desc: "Практика произношения",
      writing: "Writing AI",
      writing_desc: "Эссе, письма и многое другое",
      welcome_greet_morning: "Доброе утро",
      welcome_greet_afternoon: "Добрый день",
      welcome_greet_evening: "Добрый вечер",
      welcome_greet_night: "Доброй ночи",
      welcome_hint: "Откройте меню, чтобы выбрать инструмент",
      chip_ai: "На базе ИИ",
      chip_langs: "35+ языков",
      chip_voice: "С голосом",
      chip_private: "Приватно и быстро",
      set_title: "Настройки",
      set_desc: "Настройте Grammino под себя.",
      sec_appearance: "Внешний вид",
      sec_language: "Язык",
      sec_ai: "ИИ",
      sec_data: "Данные",
      opt_theme: "Тема",
      opt_theme_dark: "Тёмная",
      opt_theme_light: "Светлая",
      opt_theme_auto: "Авто",
      opt_accent: "Акцентный цвет",
      opt_fontsize: "Размер шрифта",
      opt_fs_sm: "Маленький",
      opt_fs_md: "Средний",
      opt_fs_lg: "Большой",
      opt_fs_xl: "Очень большой",
      opt_motion: "Анимации",
      opt_motion_full: "Полные",
      opt_motion_reduced: "Уменьшенные",
      opt_density: "Плотность",
      opt_density_cozy: "Комфортная",
      opt_density_compact: "Компактная",
      opt_ui_lang: "Язык интерфейса",
      opt_ai_model: "Модель Grammar AI",
      opt_ai_temp: "Креативность",
      opt_reset: "Сбросить",
      opt_clear_chat: "Очистить историю чата",
      saved: "Сохранено ✓",
    },
  };

  const AI_MODELS = [
    { id: "openai/gpt-oss-20b",           label: "GPT-OSS 20B (fast)" },
    { id: "openai/gpt-oss-120b",          label: "GPT-OSS 120B (quality)" },
    { id: "qwen/qwen3-32b",               label: "Qwen3 32B" },
    { id: "moonshotai/kimi-k2-instruct",  label: "Kimi K2" },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }

  function resolveTheme(theme) {
    if (theme === "auto") {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return theme;
  }

  function apply(s) {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolveTheme(s.theme));
    root.setAttribute("data-accent", s.accent);
    root.setAttribute("data-font", s.fontSize);
    root.setAttribute("data-motion", s.motion);
    root.setAttribute("data-density", s.density);
    root.setAttribute("lang", s.uiLang);
    translate(s.uiLang);
  }

  function t(key) {
    const lang = Settings.get().uiLang;
    return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
  }

  function translate(lang) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      const val = (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k];
      if (val != null) el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      // format: "attr:key,attr:key"
      const spec = el.getAttribute("data-i18n-attr");
      spec.split(",").forEach((pair) => {
        const [attr, k] = pair.split(":").map(s => s.trim());
        const val = (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k];
        if (val != null) el.setAttribute(attr, val);
      });
    });
  }

  const listeners = new Set();

  const Settings = {
    get() { return load(); },
    set(patch) {
      const next = { ...load(), ...patch };
      save(next);
      apply(next);
      listeners.forEach((fn) => { try { fn(next); } catch {} });
      return next;
    },
    reset() {
      save({ ...DEFAULTS });
      apply({ ...DEFAULTS });
      listeners.forEach((fn) => { try { fn({ ...DEFAULTS }); } catch {} });
      return { ...DEFAULTS };
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    t,
    STRINGS,
    AI_MODELS,
  };

  window.Settings = Settings;

  // Apply immediately before DOM ready
  apply(load());

  // Re-apply on system theme change if auto
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      const s = load();
      if (s.theme === "auto") apply(s);
    });
  }

  // Translate when DOM ready too (for elements not present yet at script-apply time)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => translate(load().uiLang));
  } else {
    translate(load().uiLang);
  }
})();
