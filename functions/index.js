/**
 * Apna Typing Master Pro — Cloud Functions
 * ─────────────────────────────────────────────────────────
 * 1) Live → Normal daily passage migration (unchanged, see bottom half)
 * 2) Razorpay payment integration (NEW):
 *      createRazorpayOrder  — client asks for an order before opening Checkout
 *      verifyRazorpayPayment — client calls this AFTER Razorpay Checkout succeeds;
 *                              verifies the payment signature before granting Pro
 *      razorpayWebhook      — server-to-server backup from Razorpay itself, in case
 *                              the client never calls back (tab closed, network drop, etc.)
 *
 * ── ONE-TIME SETUP FOR PAYMENTS ──────────────────────────────
 *   1. Sign up at https://razorpay.com and complete at least the "Test Mode" setup
 *      (Live Mode needs KYC/business docs — do Test Mode first, switch later).
 *   2. Dashboard → Settings → API Keys → Generate Test Key → copy Key Id + Key Secret.
 *   3. Dashboard → Settings → Webhooks → Add New Webhook:
 *        URL:    https://<region>-<project-id>.cloudfunctions.net/razorpayWebhook
 *                (exact URL is printed after you deploy — see step 6)
 *        Secret: make up any strong random string, save it — you'll store the SAME
 *                string in step 5 as RAZORPAY_WEBHOOK_SECRET
 *        Active events: tick "payment.captured"
 *   4. From the project root:
 *        cd functions && npm install && cd ..
 *   5. Store the 3 secrets (never put these in code or firebase-config.js):
 *        firebase functions:secrets:set RAZORPAY_KEY_ID
 *        firebase functions:secrets:set RAZORPAY_KEY_SECRET
 *        firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
 *      (each command will prompt you to paste the value)
 *   6. firebase deploy --only functions
 *   7. Test with Razorpay's published test card / test UPI IDs (see their docs —
 *      search "Razorpay test card numbers") before ever switching to Live keys.
 *   8. When ready for real money: repeat steps 2-3 in LIVE mode on the Razorpay
 *      dashboard, then re-run step 5 with the live key values to replace the test ones.
 *
 * Everything below already has the verification logic wired in — nothing else to
 * write, just the setup steps above.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");

initializeApp();

const RAZORPAY_KEY_ID         = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET     = defineSecret("RAZORPAY_KEY_SECRET");
const RAZORPAY_WEBHOOK_SECRET = defineSecret("RAZORPAY_WEBHOOK_SECRET");

// Free SMTP creds (e.g. Brevo/Sendinblue free tier — 300 emails/day free,
// no card required). See OTP_SETUP.md for the one-time signup steps.
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");

// Must stay in sync with PLANS_DATA in shared.js (client-side display only —
// this server copy is the one that actually decides what gets charged).
const PLAN_PRICES = { monthly: 149, quarterly: 349, yearly: 999 }; // ₹
const PLAN_DAYS   = { monthly: 30,  quarterly: 90,  yearly: 365 };

function emailToKey(email) {
  return String(email).toLowerCase().replace(/[.#$/\[\]]/g, "_");
}

/**
 * Step 1 of checkout: client picks a plan, we create a Razorpay Order server-side
 * (so the amount can never be tampered with from the browser) and hand back just
 * enough info to open Razorpay Checkout.
 */
exports.createRazorpayOrder = onCall(
  { secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] /*, enforceAppCheck: true */ },
  async (request) => {
    if (!request.auth || !request.auth.token || !request.auth.token.email) {
      throw new HttpsError("unauthenticated", "Order banane ke liye pehle Log In karein.");
    }
    const email = request.auth.token.email;
    const { plan } = request.data || {};
    if (!plan || !(plan in PLAN_PRICES)) {
      throw new HttpsError("invalid-argument", "Valid plan zaroori hai.");
    }

    const instance = new Razorpay({
      key_id: RAZORPAY_KEY_ID.value(),
      key_secret: RAZORPAY_KEY_SECRET.value(),
    });

    const order = await instance.orders.create({
      amount: PLAN_PRICES[plan] * 100, // paise
      currency: "INR",
      receipt: `${plan}_${Date.now()}`,
      notes: { email, plan }, // read back by the webhook via orders.fetch()
    });

    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID.value() };
  }
);

/**
 * Step 2 of checkout: client calls this right after Razorpay Checkout's own
 * `handler` fires with a successful payment. Grants Pro ONLY if the signature
 * proves this payment_id genuinely belongs to this order_id — a value only
 * Razorpay itself (holder of the Key Secret) could have produced.
 *
 * The caller MUST be signed in with a real Firebase Auth account (email is
 * taken from their verified auth token, never from a client-supplied field)
 * — this stops someone from activating Pro on an account that isn't theirs.
 */
exports.verifyRazorpayPayment = onCall(
  { secrets: [RAZORPAY_KEY_SECRET] /*, enforceAppCheck: true */ },
  async (request) => {
    if (!request.auth || !request.auth.token || !request.auth.token.email) {
      throw new HttpsError("unauthenticated", "Pro activate karne ke liye pehle Log In karein.");
    }
    const email = request.auth.token.email;
    const { name, plan, razorpay_payment_id, razorpay_order_id, razorpay_signature } = request.data || {};

    if (!plan || !(plan in PLAN_PRICES)) {
      throw new HttpsError("invalid-argument", "Valid plan zaroori hai.");
    }
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new HttpsError("invalid-argument", "Payment proof missing hai.");
    }

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET.value())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new HttpsError("permission-denied", "Payment verify nahi hua — signature match nahi hui.");
    }

    return await grantPro({ email, name, plan, paymentId: razorpay_payment_id, orderId: razorpay_order_id, source: "client" });
  }
);

/**
 * Backup path: Razorpay calls this directly (server-to-server) once a payment is
 * captured, regardless of whether the client's browser was still open. This is
 * what makes Pro activation reliable even if the user closes the tab right after
 * paying, before the client-side `verifyRazorpayPayment` call completes.
 */
exports.razorpayWebhook = onRequest(
  { secrets: [RAZORPAY_WEBHOOK_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const expected = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET.value())
      .update(req.rawBody)
      .digest("hex");

    if (!signature || signature !== expected) {
      console.warn("razorpayWebhook: invalid signature, ignoring request.");
      res.status(400).send("Invalid signature");
      return;
    }

    const event = req.body;
    if (event.event !== "payment.captured") {
      res.status(200).send("Ignored (not payment.captured)");
      return;
    }

    try {
      const payment = event.payload.payment.entity;
      const instance = new Razorpay({
        key_id: RAZORPAY_KEY_ID.value(),
        key_secret: RAZORPAY_KEY_SECRET.value(),
      });
      // Read back {email, plan} from the order's notes (set server-side in
      // createRazorpayOrder, so this is trustworthy — not taken from the client).
      const order = await instance.orders.fetch(payment.order_id);
      const { email, plan } = order.notes || {};

      if (!email || !plan || !(plan in PLAN_PRICES)) {
        console.warn("razorpayWebhook: payment captured but order notes missing email/plan", order.notes);
        res.status(200).send("Ignored (no matching plan/email)");
        return;
      }

      await grantPro({ email, plan, paymentId: payment.id, orderId: payment.order_id, source: "webhook" });
      res.status(200).send("OK");
    } catch (err) {
      console.error("razorpayWebhook processing error:", err);
      // 200 so Razorpay doesn't hammer retries for a bug on our end while we fix it;
      // the client-side verifyRazorpayPayment call is still the primary path in the meantime.
      res.status(200).send("Error logged");
    }
  }
);

/**
 * Shared "grant Pro" logic used by both the client-verified path and the webhook.
 * Idempotent: the same payment_id will never extend the expiry twice, so it's safe
 * for both paths to fire for the same payment (whichever gets there first wins).
 */
async function grantPro({ email, name, plan, paymentId, orderId, source }) {
  const db = getDatabase();
  const key = emailToKey(email);

  const dedupeRef = db.ref(`processedPayments/${paymentId}`);
  const already = await dedupeRef.get();
  if (already.exists()) {
    const existing = already.val();
    return { success: true, expiry: existing.expiry, alreadyProcessed: true };
  }

  const expiry = Date.now() + PLAN_DAYS[plan] * 86400000;
  await db.ref(`users/${key}`).update({ isPro: true, plan, proExpiry: expiry });

  // nested under the user's own key so Realtime DB rules can restrict reads
  // to just this user (or admin) — see firebase-database-rules.json
  await db.ref(`payments/${key}/ownerEmail`).set(email);
  const payRef = db.ref(`payments/${key}`).push();
  await payRef.set({
    name: name || "", plan, amount: PLAN_PRICES[plan],
    razorpayPaymentId: paymentId, razorpayOrderId: orderId, source,
    date: Date.now(), dateStr: new Date().toLocaleString("en-IN"), status: "success",
  });

  await dedupeRef.set({ email, plan, expiry, date: Date.now(), source });

  return { success: true, expiry };
}

/**
 * Admin-only: grant someone free Pro days without any payment — e.g. as a gift,
 * for testing, or for a promo. Restricted to the admin account (same email that
 * firebase-database-rules.json trusts) so no one else can call this and give
 * themselves free Pro. Recorded in `payments/` with amount 0 / source "admin_free"
 * so it still shows up in the admin analytics history for transparency.
 */
exports.grantFreeProAdmin = onCall(
  { /* enforceAppCheck: true */ },
  async (request) => {
    if (!request.auth || !request.auth.token || !request.auth.token.email) {
      throw new HttpsError("unauthenticated", "Admin login required.");
    }
    if (request.auth.token.email !== "yashpalsingh7616@gmail.com") {
      throw new HttpsError("permission-denied", "Sirf admin ye action kar sakta hai.");
    }

    const { email, days, note } = request.data || {};
    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "User email zaroori hai.");
    }
    const numDays = Number(days);
    if (!numDays || numDays <= 0 || numDays > 365) {
      throw new HttpsError("invalid-argument", "Days 1 se 365 ke beech honi chahiye.");
    }

    const db = getDatabase();
    const key = emailToKey(email);

    const userSnap = await db.ref(`users/${key}`).get();
    if (!userSnap.exists()) {
      throw new HttpsError("not-found", "Is email se koi registered user nahi mila.");
    }
    const existing = userSnap.val();

    // Agar user ka Pro already active hai to naye days us existing expiry ke
    // upar add ho jaate hain (extend), warna aaj se shuru hoke naye din.
    const base = existing.isPro && existing.proExpiry > Date.now() ? existing.proExpiry : Date.now();
    const expiry = base + numDays * 86400000;

    await db.ref(`users/${key}`).update({ isPro: true, plan: existing.plan || "monthly", proExpiry: expiry });

    const payRef = db.ref(`payments/${key}`).push();
    await payRef.set({
      name: existing.name || "", plan: "free_gift", amount: 0,
      days: numDays, note: note || "", grantedBy: request.auth.token.email,
      source: "admin_free", date: Date.now(),
      dateStr: new Date().toLocaleString("en-IN"), status: "success",
    });

    return { success: true, email, days: numDays, expiry };
  }
);

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD — 4-digit OTP via Email (free, no SMS cost)
//   sendPasswordResetOTP   — generates a 4-digit code, saves it (hashed)
//                            with a 10-minute expiry, emails it via SMTP
//   verifyPasswordResetOTP — checks the code, then sets the new password
//                            using the Admin SDK (bypasses normal auth)
// ════════════════════════════════════════════════════════════
const OTP_TTL_MS    = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_TRIES = 5;

// If an OTP is requested for one of these emails, a copy also goes to the
// backup address — useful if the primary inbox is unreachable. This is
// purely for email delivery; login/auth still only recognises the primary
// email as a Firebase Auth account.
const BACKUP_RECOVERY_EMAILS = {
  "yashpalsingh7616@gmail.com": "yashpal556@rediffmail.com",
};

function hashOtp(otp, email) {
  return crypto.createHash("sha256").update(`${otp}:${email}`).digest("hex");
}

exports.sendPasswordResetOTP = onCall(
  { secrets: [SMTP_USER, SMTP_PASS] },
  async (request) => {
    const email = String((request.data || {}).email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email daalein.");
    }

    // Don't reveal whether the account exists — same response either way,
    // but only actually send an email (and only actually let a later
    // verify succeed) if the account is real.
    let userExists = true;
    try {
      await getAuth().getUserByEmail(email);
    } catch (e) {
      userExists = false;
    }

    if (userExists) {
      const otp = String(crypto.randomInt(0, 10000)).padStart(4, "0");
      const key = emailToKey(email);
      const db = getDatabase();

      await db.ref(`passwordResetOTPs/${key}`).set({
        otpHash: hashOtp(otp, email),
        expiresAt: Date.now() + OTP_TTL_MS,
        tries: 0,
      });

      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
      });

      await transporter.sendMail({
        from: '"Apna Typing Master Pro" <businesspaheli177@gmail.com>',
        to: email,
        subject: `${otp} — Aapka Password Reset Code`,
        text: `Aapka OTP hai: ${otp}\n\nYe code 10 minute mein expire ho jayega. Agar aapne ye request nahi ki, is email ko ignore karein.`,
        html: `<p>Aapka OTP hai: <b style="font-size:20px;letter-spacing:3px;">${otp}</b></p><p>Ye code 10 minute mein expire ho jayega. Agar aapne ye request nahi ki, is email ko ignore karein.</p>`,
      });

      const backupEmail = BACKUP_RECOVERY_EMAILS[email];
      if (backupEmail) {
        await transporter.sendMail({
          from: '"Apna Typing Master Pro" <businesspaheli177@gmail.com>',
          to: backupEmail,
          subject: `${otp} — Backup Copy: Password Reset Code`,
          text: `Ye ${email} account ke liye password-reset OTP hai: ${otp}\n\nYe code 10 minute mein expire ho jayega. Agar aapne ye request nahi ki, is email ko ignore karein.`,
          html: `<p>Ye <b>${email}</b> account ke liye password-reset OTP hai: <b style="font-size:20px;letter-spacing:3px;">${otp}</b></p><p>Ye code 10 minute mein expire ho jayega. Agar aapne ye request nahi ki, is email ko ignore karein.</p>`,
        });
      }
    }

    return { success: true };
  }
);

// ============================================================================
// FUNCTION — sendContactMessage  (Contact Us form ke liye)
// Contact form se aaya message seedha admin ki email par bhej deta hai —
// isi Brevo SMTP relay se jo OTP emails ke liye already use ho raha hai.
// ============================================================================
exports.sendContactMessage = onCall(
  { secrets: [SMTP_USER, SMTP_PASS] },
  async (request) => {
    const data = request.data || {};
    const name = String(data.name || "").trim().slice(0, 100);
    const email = String(data.email || "").trim().slice(0, 150);
    const subject = String(data.subject || "General").trim().slice(0, 150);
    const message = String(data.message || "").trim().slice(0, 3000);

    if (!name || !email || !email.includes("@") || !message) {
      throw new HttpsError("invalid-argument", "Naam, valid email, aur message zaroori hain.");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });

    // Admin ko naya message
    await transporter.sendMail({
      from: '"Apna Typing Master Pro — Contact Form" <businesspaheli177@gmail.com>',
      to: "businesspaheli177@gmail.com",
      replyTo: email,
      subject: `📬 Contact Form: ${subject} — from ${name}`,
      text: `Naam: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `<p><b>Naam:</b> ${name}<br><b>Email:</b> ${email}<br><b>Subject:</b> ${subject}</p><p><b>Message:</b><br>${message.replace(/\n/g, "<br>")}</p>`,
    });

    // Bhejne wale ko confirmation
    await transporter.sendMail({
      from: '"Apna Typing Master Pro" <businesspaheli177@gmail.com>',
      to: email,
      subject: "Aapka message mil gaya — Apna Typing Master Pro",
      text: `Namaste ${name},\n\nAapka message hume mil gaya hai. Hum 24-48 ghanton mein reply karenge.\n\nAapka message:\n${message}`,
      html: `<p>Namaste ${name},</p><p>Aapka message hume mil gaya hai. Hum 24-48 ghanton mein reply karenge.</p><p style="color:#888;"><i>Aapka message:</i><br>${message.replace(/\n/g, "<br>")}</p>`,
    });

    return { success: true };
  }
);
exports.verifyPasswordResetOTP = onCall(async (request) => {
  const { email: rawEmail, otp, newPassword } = request.data || {};
  const email = String(rawEmail || "").trim().toLowerCase();

  if (!email || !otp || !newPassword) {
    throw new HttpsError("invalid-argument", "Email, OTP aur naya password zaroori hai.");
  }
  if (String(newPassword).length < 6) {
    throw new HttpsError("invalid-argument", "Password kam se kam 6 characters ka hona chahiye.");
  }

  const key = emailToKey(email);
  const db = getDatabase();
  const otpRef = db.ref(`passwordResetOTPs/${key}`);
  const snap = await otpRef.get();

  if (!snap.exists()) {
    throw new HttpsError("failed-precondition", "OTP expire ho gaya ya bheja hi nahi gaya — dobara request karein.");
  }
  const record = snap.val();

  if (Date.now() > record.expiresAt) {
    await otpRef.remove();
    throw new HttpsError("failed-precondition", "OTP expire ho gaya — dobara request karein.");
  }
  if ((record.tries || 0) >= OTP_MAX_TRIES) {
    await otpRef.remove();
    throw new HttpsError("resource-exhausted", "Bahut zyada galat attempts — dobara OTP mangwayein.");
  }
  if (hashOtp(String(otp), email) !== record.otpHash) {
    await otpRef.update({ tries: (record.tries || 0) + 1 });
    throw new HttpsError("permission-denied", "Galat OTP.");
  }

  // OTP correct — set the new password via Admin SDK (works regardless of
  // the old password, that's the whole point of a reset) and clean up.
  const userRecord = await getAuth().getUserByEmail(email).catch(() => null);
  if (!userRecord) {
    await otpRef.remove();
    throw new HttpsError("not-found", "Account nahi mila.");
  }
  await getAuth().updateUser(userRecord.uid, { password: String(newPassword) });
  await otpRef.remove();

  return { success: true };
});

exports.migrateLiveToNormal = onSchedule(
  {
    schedule: "0 22 * * *",   // 22:00 = 10:00 PM, every day
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const db = getDatabase();

    const [liveEngSnap, liveHinSnap, normEngSnap, normHinSnap] = await Promise.all([
      db.ref("passages/live/english").get(),
      db.ref("passages/live/hindi").get(),
      db.ref("passages/normal/english").get(),
      db.ref("passages/normal/hindi").get(),
    ]);

    const toArray = (snap) => {
      if (!snap.exists()) return [];
      const val = snap.val();
      return Object.keys(val)
        .map(Number)
        .sort((a, b) => a - b)
        .map((k) => val[k]);
    };

    const liveEng = toArray(liveEngSnap);
    const liveHin = toArray(liveHinSnap);
    const normEng = toArray(normEngSnap);
    const normHin = toArray(normHinSnap);

    const toObj = (arr) => {
      const o = {};
      arr.forEach((p, i) => { o[String(i)] = p; });
      return o;
    };

    const updates = {};
    let movedCount = 0;

    if (liveEng.length > 0) {
      updates["passages/normal/english"] = toObj([...normEng, ...liveEng]);
      updates["passages/live/english"] = null;
      movedCount += liveEng.length;
    }
    if (liveHin.length > 0) {
      updates["passages/normal/hindi"] = toObj([...normHin, ...liveHin]);
      updates["passages/live/hindi"] = null;
      movedCount += liveHin.length;
    }

    if (Object.keys(updates).length === 0) {
      console.log("No live passages found — nothing to migrate today.");
      return;
    }

    await db.ref().update(updates);
    console.log(
      `Migrated ${liveEng.length} English + ${liveHin.length} Hindi live passage(s) into Normal, and cleared Live section.`
    );
  }
);

// ============================================================================
// FUNCTION 2 — dailyLivePublish
// Roz subah 6:00 AM IST — aaj ki date ke 2 English + 2 Hindi passages
// automatically "passages/live/" section mein publish ho jaate hain.
//
// Firebase Database mein PEHLE SE structure banao (Admin panel ke
// "📅 Schedule" tab se bhi kar sakte ho):
//
//   scheduledPassages/
//     english/
//       "2026-07-27"/
//         "0": "First English passage full text here..."
//         "1": "Second English passage full text here..."
//       "2026-07-28"/
//         "0": "Next day first English passage..."
//         "1": "Next day second English passage..."
//     hindi/
//       "2026-07-27"/
//         "0": "Pehla Hindi passage ka poora text..."
//         "1": "Doosra Hindi passage ka poora text..."
//       "2026-07-28"/
//         "0": "Kal ka pehla Hindi passage..."
//         "1": "Kal ka doosra Hindi passage..."
//
// TIP: Ek baar mein poore hafte/mahine ke passages daal do — khud publish honge!
// ============================================================================
exports.dailyLivePublish = onSchedule(
  {
    schedule: "0 6 * * *",   // 6:00 AM IST, every day
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const db = getDatabase();

    // Aaj ki date IST mein (YYYY-MM-DD)
    const now       = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate   = new Date(now.getTime() + istOffset);
    const todayKey  = istDate.toISOString().slice(0, 10); // e.g. "2026-07-27"

    console.log(`[dailyLivePublish] Starting for date: ${todayKey}`);

    // Fetch today's scheduled passages + current live section
    const [schedEngSnap, schedHinSnap, liveEngSnap, liveHinSnap] = await Promise.all([
      db.ref(`scheduledPassages/english/${todayKey}`).get(),
      db.ref(`scheduledPassages/hindi/${todayKey}`).get(),
      db.ref("passages/live/english").get(),
      db.ref("passages/live/hindi").get(),
    ]);

    // Convert Firebase object {"0":"...","1":"..."} → array
    const snapToArray = (snap) => {
      if (!snap.exists()) return [];
      const val = snap.val();
      if (typeof val === "string") return [val]; // single string (old format)
      return Object.keys(val)
        .map(Number)
        .sort((a, b) => a - b)
        .map((k) => val[k])
        .filter(Boolean);
    };

    // Convert array → Firebase object {"0":"...","1":"..."}
    const arrayToObj = (arr) => {
      const o = {};
      arr.forEach((p, i) => { o[String(i)] = p; });
      return o;
    };

    const schedEng = snapToArray(schedEngSnap); // [passage1, passage2]
    const schedHin = snapToArray(schedHinSnap); // [passage1, passage2]
    const liveEng  = snapToArray(liveEngSnap);
    const liveHin  = snapToArray(liveHinSnap);

    const updates = {};
    let engAdded = 0, hinAdded = 0;

    // Add up to 2 English passages (skip duplicates)
    if (schedEng.length > 0) {
      const newEng = [...liveEng];
      schedEng.slice(0, 2).forEach((passage) => {
        if (!newEng.includes(passage)) {
          newEng.push(passage);
          engAdded++;
        }
      });
      if (engAdded > 0) {
        updates["passages/live/english"] = arrayToObj(newEng);
      }
      console.log(`[dailyLivePublish] English: ${schedEng.length} scheduled, ${engAdded} new added.`);
    } else {
      console.warn(`[dailyLivePublish] ⚠️  No English passages scheduled for ${todayKey}. Add them in Firebase: scheduledPassages/english/${todayKey}/0 and /1`);
    }

    // Add up to 2 Hindi passages (skip duplicates)
    if (schedHin.length > 0) {
      const newHin = [...liveHin];
      schedHin.slice(0, 2).forEach((passage) => {
        if (!newHin.includes(passage)) {
          newHin.push(passage);
          hinAdded++;
        }
      });
      if (hinAdded > 0) {
        updates["passages/live/hindi"] = arrayToObj(newHin);
      }
      console.log(`[dailyLivePublish] Hindi: ${schedHin.length} scheduled, ${hinAdded} new added.`);
    } else {
      console.warn(`[dailyLivePublish] ⚠️  No Hindi passages scheduled for ${todayKey}. Add them in Firebase: scheduledPassages/hindi/${todayKey}/0 and /1`);
    }

    if (Object.keys(updates).length === 0) {
      console.log(`[dailyLivePublish] Nothing new to publish for ${todayKey}.`);
      return;
    }

    await db.ref().update(updates);
    console.log(`[dailyLivePublish] ✅ Done — ${engAdded} English + ${hinAdded} Hindi passages published to Live for ${todayKey}.`);
  }
);

// ============================================================================
// FUNCTION 3 — manualPublishToday  (Admin panel "Publish Now" button ke liye)
// Admin panel se "Aaj ka passage abhi publish karo" button dabaane par
// instantly Live mein daal deta hai bina 6 AM ka wait kiye.
// ============================================================================
exports.manualPublishToday = onCall(
  { /* enforceAppCheck: true */ },
  async (request) => {
    // Sirf authenticated admin hi call kar sakta hai
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Admin login required.");
    }
    if (request.auth.token.email !== "yashpalsingh7616@gmail.com") {
      throw new HttpsError("permission-denied", "Sirf admin ye action kar sakta hai.");
    }

    const db = getDatabase();
    const now       = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate   = new Date(now.getTime() + istOffset);
    const todayKey  = istDate.toISOString().slice(0, 10);

    const [schedEngSnap, schedHinSnap, liveEngSnap, liveHinSnap] = await Promise.all([
      db.ref(`scheduledPassages/english/${todayKey}`).get(),
      db.ref(`scheduledPassages/hindi/${todayKey}`).get(),
      db.ref("passages/live/english").get(),
      db.ref("passages/live/hindi").get(),
    ]);

    const snapToArray = (snap) => {
      if (!snap.exists()) return [];
      const val = snap.val();
      if (typeof val === "string") return [val];
      return Object.keys(val).map(Number).sort((a,b)=>a-b).map(k=>val[k]).filter(Boolean);
    };
    const arrayToObj = (arr) => {
      const o = {}; arr.forEach((p,i)=>{ o[String(i)]=p; }); return o;
    };

    const schedEng = snapToArray(schedEngSnap);
    const schedHin = snapToArray(schedHinSnap);
    const liveEng  = snapToArray(liveEngSnap);
    const liveHin  = snapToArray(liveHinSnap);
    const updates  = {};
    let engAdded = 0, hinAdded = 0;

    schedEng.slice(0,2).forEach(p=>{ if(!liveEng.includes(p)){ liveEng.push(p); engAdded++; } });
    schedHin.slice(0,2).forEach(p=>{ if(!liveHin.includes(p)){ liveHin.push(p); hinAdded++; } });

    if (engAdded > 0) updates["passages/live/english"] = arrayToObj(liveEng);
    if (hinAdded > 0) updates["passages/live/hindi"]   = arrayToObj(liveHin);

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    return {
      success: true,
      date: todayKey,
      engAdded,
      hinAdded,
      message: `${engAdded} English + ${hinAdded} Hindi passages published to Live for ${todayKey}.`
    };
  }
);
