// Grammino — Firebase Auth bootstrap (modular v10 via CDN ESM).
// Loads Firebase, restores persisted session, applies page guards, and
// exposes a small window.GramminoAuth API for non-module scripts.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// --------------------------------------------------------------------------
// Firebase Web config (values come from Firebase Console → Project settings
// → Your apps → SDK setup & configuration → "Config").
// Put your real values here; these are public by design.
// --------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBZMWIDUoq10U9G0t9hS4eEuJ9r0w5ivOM",
  authDomain: "gramminoweb.firebaseapp.com",
  projectId: "gramminoweb",
  storageBucket: "gramminoweb.firebasestorage.app",
  messagingSenderId: "225951959142",
  appId: "1:225951959142:web:9eaa78d2d436dff14085a7",
  measurementId: "G-TFYF10KLN4",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep the session after browser restarts ("account saqlab qo'yadi").
await setPersistence(auth, browserLocalPersistence);

// Wait for Firebase to restore the cached user before we decide redirects —
// this prevents a one-frame flash of the wrong page.
await auth.authStateReady();

// Page guards driven by <html data-auth-guard="required|guest">.
const guard = document.documentElement.getAttribute("data-auth-guard");
const user  = auth.currentUser;

if (guard === "required" && !user) {
  window.location.replace("login.html");
} else if (guard === "guest" && user) {
  window.location.replace("home.html");
}

// Friendly error-message mapper for Firebase Auth error codes.
function friendlyError(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-email":        "Email noto'g'ri formatda.",
    "auth/user-disabled":        "Bu akkaunt o'chirilgan.",
    "auth/user-not-found":       "Bunday foydalanuvchi topilmadi.",
    "auth/wrong-password":       "Parol noto'g'ri.",
    "auth/invalid-credential":   "Email yoki parol noto'g'ri.",
    "auth/email-already-in-use": "Bu email allaqachon ro'yxatdan o'tgan.",
    "auth/weak-password":        "Parol juda qisqa — kamida 6 ta belgi kiriting.",
    "auth/too-many-requests":    "Juda ko'p urinish. Biroz kutib turing.",
    "auth/network-request-failed": "Internet aloqasi yo'q.",
    "auth/operation-not-allowed":  "Email/parol bilan kirish o'chirilgan. Firebase Console → Authentication → Sign-in method bo'limida yoqing.",
  };
  return map[code] || err?.message || "Noma'lum xatolik.";
}

// Public API for our page scripts (login.js, home.js) —
// they're classic scripts so we attach to window.
window.GramminoAuth = {
  get user()     { return auth.currentUser; },
  onChange:      (cb) => onAuthStateChanged(auth, cb),
  signIn:        (email, pw) => signInWithEmailAndPassword(auth, email, pw),
  signUp:        async (name, email, pw) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    if (name) await updateProfile(cred.user, { displayName: name });
    return cred;
  },
  signOut:       () => signOut(auth),
  friendlyError,
};

// Signal that the API is ready for any deferred scripts still waiting.
window.__GRAMMINO_AUTH_READY__ = true;
window.dispatchEvent(new Event("grammino-auth-ready"));
