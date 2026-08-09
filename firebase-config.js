// firebase-config.js
// ⚠️  IS FILE KO .gitignore MEIN ADD KARO — KABHI GITHUB PE PUSH MAT KARO
// ⚠️  Sirf apne local computer pe rakho aur server pe manually upload karo

window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAJcKdAYz2SRA75XtDB_VQZEzvoCK8WdUQ",
  authDomain:        "apna-typing-master-pro-af16d.firebaseapp.com",
  databaseURL:       "https://apna-typing-master-pro-af16d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "apna-typing-master-pro-af16d",
  storageBucket:     "apna-typing-master-pro-af16d.firebasestorage.app",
  messagingSenderId: "727800871355",
  appId:             "1:727800871355:web:97bc57c93e6514372fac9e",
  measurementId:     "G-6CNL0V0BPS"
};

// ═══════════════════════════════════════════════════════════════
// ANTI-COPY PROTECTION — two things you should do once, in your
// Firebase / Google Cloud console, so a copied version of this site
// on someone else's domain CANNOT use your real backend:
//
// 1) APP CHECK (recommended, most effective):
//    a. Firebase Console → Build → App Check → Apps → register this
//       web app → choose "reCAPTCHA v3" → get a SITE KEY.
//    b. Paste that site key below (replace null with the key string).
//    c. Firebase Console → App Check → APIs tab → turn on
//       "Enforce" for Realtime Database, Storage, and Functions.
//    Until you do this, the line below does nothing and the site
//    works exactly as it does now — completely safe to leave as-is.
window.RECAPTCHA_V3_SITE_KEY = null; // e.g. "6Lc....................."

// 2) RESTRICT THE API KEY TO YOUR DOMAIN (extra layer):
//    Google Cloud Console → APIs & Services → Credentials → click
//    the API key above → "Application restrictions" → HTTP referrers
//    → add your real domain(s) (e.g. https://apnatypingmaster.com/*).
//    This stops the exact same key from being used to call Firebase
//    from any OTHER domain, even if someone copies this whole file.
// ═══════════════════════════════════════════════════════════════
