═══════════════════════════════════════════════════════════
  FORGOT PASSWORD (Email OTP) — Setup Guide, 100% FREE
═══════════════════════════════════════════════════════════

Kya bana hai:
- Login page par "Password bhool gaye?" link
- Email daalne par 4-ank ka OTP us email par jaata hai (10 min valid)
- OTP + naya password daalne par password reset ho jaata hai
- Sab kuch Cloud Function (Admin SDK) se hota hai — koi bhi client
  seedha "passwordResetOTPs" database path ko chhoo nahi sakta
  (rules mein explicitly false hai)

───────────────────────────────────────────
STEP 1: Brevo (pehle "Sendinblue") par free account banao
───────────────────────────────────────────
1. https://www.brevo.com par jaakar free signup karo
   (Free plan: 300 emails/day, hamesha ke liye free, card nahi chahiye)
2. Signup ke baad: Settings (gear icon) → SMTP & API → "SMTP" tab
3. Wahan tumhara SMTP login (email jaisa) aur ek "SMTP Key/Password"
   dikhega — dono copy kar lo (SMTP password wo nahi hai jo tumne
   account banate waqt use kiya tha, ye alag generated key hoti hai)

───────────────────────────────────────────
STEP 2: "From" email verify karo (Brevo maangega)
───────────────────────────────────────────
Brevo free plan mein "from" address ko verify karna padta hai:
1. Settings → Senders & IP → "Add a sender"
2. Apni koi bhi email daal do (jaise apni Gmail) — verify link aayega
3. functions/index.js mein "from" line mein wahi verified email daal
   dena (abhi "businesspaheli177@gmail.com" likha hai — isko Brevo
   mein "Senders & IP" section se verify karna zaroori hai, warna
   OTP email bhejna fail ho jayega)

───────────────────────────────────────────
STEP 3: Secrets save karo
───────────────────────────────────────────
Terminal mein project folder se:
    firebase functions:secrets:set SMTP_USER
    firebase functions:secrets:set SMTP_PASS
(Step 1 wali SMTP login aur SMTP key paste karo jab pucha jaye)

───────────────────────────────────────────
STEP 4: Deploy karo
───────────────────────────────────────────
    cd functions && npm install && cd ..
    firebase deploy --only functions,database,hosting

───────────────────────────────────────────
Test kaise karein
───────────────────────────────────────────
1. login.html kholo → "Password bhool gaye?" click karo
2. Apni registered email daalo → OTP Bhejein
3. Email check karo (spam folder bhi dekh lena shuru mein)
4. 4-ank ka code + naya password daal kar reset karo

───────────────────────────────────────────
Note
───────────────────────────────────────────
- Kharcha: ₹0 — Brevo free tier 300 email/day ke liye kaafi hai
  (agar traffic bahut zyada badh jaaye 300/din se, tab paid plan
  chahiye hoga, jo abhi ke liye door ki baat hai)
- Is sandbox mein internet access nahi hai, isliye khud test/deploy
  nahi kar saka — Brevo ki standard SMTP + Firebase Functions ka
  well-documented pattern follow kiya hai. Deploy ke baad koi error
  aaye toh paste kar dena, dekh lunga.
